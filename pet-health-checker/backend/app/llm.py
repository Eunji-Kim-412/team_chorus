import asyncio
import json
import re
import urllib.parse
import openai
from google import genai
from app.config import (
    CLAUDE_PROVIDER,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL_ID,
    AWS_REGION, BEDROCK_MODEL_ID,
    OPENAI_API_KEY, OPENAI_MODEL_ID,
    GEMINI_API_KEY, GEMINI_MODEL_ID,
)

# 선택적 의존성 (프로바이더에 따라 필요한 라이브러리만 사용)
if CLAUDE_PROVIDER == "anthropic":
    import anthropic
else:
    import boto3

SYSTEM_PROMPT = (
    "You are a veterinary AI assistant. Based on the pet type and symptoms provided, "
    "give the top 3 most likely diseases/conditions. For each, provide:\n"
    "1. Disease name (in Korean and English)\n"
    "2. Brief description\n"
    "3. Severity (낮음/보통/높음)\n"
    "4. Recommended action\n\n"
    "Always end with: '⚠️ 이 결과는 참고용이며, 반드시 수의사와 상담하세요.'\n"
    "Respond entirely in Korean."
)

SUMMARY_PROMPT = (
    "You are a veterinary AI assistant. Below are diagnoses from multiple AI models for the same pet symptoms. "
    "Synthesize them into one final, best diagnosis. Include:\n"
    "1. 종합 진단 결과 (가장 가능성 높은 질병 순위)\n"
    "2. 각 질병의 심각도와 설명\n"
    "3. 즉시 병원 방문이 필요한지 여부 (needs_hospital: true/false)\n"
    "4. 보호자가 당장 할 수 있는 응급 조치\n\n"
    "Format the response as follows - start with a JSON line, then the detailed explanation:\n"
    '첫 줄: {"needs_hospital": true or false}\n'
    "그 다음: 상세 종합 진단 내용\n\n"
    "Always end with: '⚠️ 이 결과는 참고용이며, 반드시 수의사와 상담하세요.'\n"
    "Respond entirely in Korean."
)


def _build_user_msg(pet_type: str, symptoms: str) -> str:
    label = "강아지" if pet_type == "dog" else "고양이"
    return f"반려동물 종류: {label}\n증상: {symptoms}"


# ===== Claude 호출 (프로바이더 자동 선택) =====

async def _call_claude_anthropic(system: str, user_msg: str, max_tokens: int) -> str:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    resp = await client.messages.create(
        model=ANTHROPIC_MODEL_ID,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return resp.content[0].text


async def _call_claude_bedrock(system: str, user_msg: str, max_tokens: int) -> str:
    def _invoke():
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user_msg}],
        })
        resp = client.invoke_model(modelId=BEDROCK_MODEL_ID, body=body, contentType="application/json")
        return json.loads(resp["body"].read())["content"][0]["text"]
    return await asyncio.to_thread(_invoke)


async def _call_claude(system: str, user_msg: str, max_tokens: int) -> str:
    if CLAUDE_PROVIDER == "anthropic":
        return await _call_claude_anthropic(system, user_msg, max_tokens)
    return await _call_claude_bedrock(system, user_msg, max_tokens)


async def call_claude(pet_type: str, symptoms: str) -> str:
    return await _call_claude(SYSTEM_PROMPT, _build_user_msg(pet_type, symptoms), 1024)


# ===== GPT / Gemini =====

async def call_gpt(pet_type: str, symptoms: str) -> str:
    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    resp = await client.chat.completions.create(
        model=OPENAI_MODEL_ID,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_msg(pet_type, symptoms)},
        ],
    )
    return resp.choices[0].message.content


async def call_gemini(pet_type: str, symptoms: str) -> str:
    def _invoke():
        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=GEMINI_MODEL_ID,
            contents=f"{SYSTEM_PROMPT}\n\n{_build_user_msg(pet_type, symptoms)}",
        )
        return resp.text
    return await asyncio.to_thread(_invoke)


# ===== 종합 요약 =====

async def summarize_results(pet_type: str, symptoms: str, results: list[dict]) -> dict:
    valid = [r for r in results if not r.get("error")]
    if not valid:
        return {"summary": "유효한 진단 결과가 없어 종합 분석을 수행할 수 없습니다.", "needs_hospital": False}

    combined = "\n\n".join([f"[{r['model']}]\n{r['diagnosis']}" for r in valid])
    label = "강아지" if pet_type == "dog" else "고양이"
    user_msg = f"반려동물: {label}\n증상: {symptoms}\n\n--- 각 모델 진단 결과 ---\n{combined}"

    try:
        text = await _call_claude(SUMMARY_PROMPT, user_msg, 1500)
        needs_hospital = False
        first_line = text.split("\n")[0].strip()
        try:
            meta = json.loads(first_line)
            needs_hospital = meta.get("needs_hospital", False)
            text = "\n".join(text.split("\n")[1:]).strip()
        except (json.JSONDecodeError, IndexError):
            needs_hospital = "병원" in text and ("즉시" in text or "필요" in text or "방문" in text)
        return {"summary": text, "needs_hospital": needs_hospital}
    except Exception as e:
        return {"summary": f"종합 분석 중 오류: {str(e)}", "needs_hospital": False}


HOMECARE_PROMPT = """당신은 반려동물 케어 전문 AI입니다.
아래 반려동물 정보와 진단 결과를 바탕으로 홈케어 가이드를 작성해주세요.

규칙:
- 약물 이름이나 용량은 절대 언급하지 마세요
- "확실히 ~입니다" 같은 단정 표현 금지, "~가능성이 있습니다" 톤 유지
- 각 항목은 구체적이고 실용적으로 작성
- shopping_suggestions에는 약물·처방약·영양제(아세트아미노펜·이부프로펜·타이레놀·항생제·스테로이드 등) 절대 포함 금지
- shopping_suggestions는 보호자가 집에서 활용할 수 있는 일반 용품만 (예: 전해질 보충제, 부드러운 사료, 수분 공급 도구, 보온 용품, 위생용품 등)
- shopping_suggestions는 최대 3개, 각 항목의 search_query는 한국어 쿠팡 검색에 적합한 짧고 구체적인 키워드로 작성
- 반드시 아래 JSON 형식으로만 응답하세요

{
  "dos": ["해야 할 것 1", "해야 할 것 2", "해야 할 것 3", "해야 할 것 4"],
  "donts": ["하지 말 것 1", "하지 말 것 2", "하지 말 것 3"],
  "warningsigns": ["악화 신호 1", "악화 신호 2", "악화 신호 3", "악화 신호 4"],
  "shopping_suggestions": [
    {"category": "전해질 보충제", "search_query": "강아지 전해질 보충제", "reason": "수분 보충에 도움"}
  ]
}"""


# 쇼핑 추천에서 절대 노출되면 안 되는 약물·처방약 키워드
DRUG_BLACKLIST = [
    "아세트아미노펜", "이부프로펜", "타이레놀", "애드빌", "아스피린",
    "naproxen", "naprosyn", "aspirin", "ibuprofen", "acetaminophen",
    "처방약", "처방", "항생제", "스테로이드", "진통제", "해열제",
    "antibiotic", "steroid",
]


def _build_coupang_url(query: str) -> str:
    return f"https://www.coupang.com/np/search?q={urllib.parse.quote(query)}"


def _filter_shopping_suggestions(suggestions) -> list:
    if not isinstance(suggestions, list):
        return []
    safe = []
    for s in suggestions:
        if not isinstance(s, dict):
            continue
        category = str(s.get("category", "")).strip()
        query = str(s.get("search_query", "")).strip()
        reason = str(s.get("reason", "")).strip()
        if not query:
            continue
        haystack = f"{category} {query} {reason}".lower()
        if any(banned.lower() in haystack for banned in DRUG_BLACKLIST):
            continue
        safe.append({
            "category": category,
            "search_query": query,
            "reason": reason,
            "url": _build_coupang_url(query),
        })
        if len(safe) >= 3:
            break
    return safe


async def call_gemini_homecare(pet_type: str, breed: str, age_years: int, medical_history: list, diagnosis_name: str, urgency_score: float) -> dict:
    species = "강아지" if pet_type == "dog" else "고양이"
    history_str = ", ".join(medical_history) if medical_history else "없음"
    user_msg = f"""반려동물 정보:
- 종: {species}
- 품종: {breed or "미상"}
- 나이: {age_years}살
- 병력: {history_str}

진단 결과:
- 의심 증상: {diagnosis_name}
- 위험도: {urgency_score}/10"""

    def _invoke():
        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=GEMINI_MODEL_ID,
            contents=f"{HOMECARE_PROMPT}\n\n{user_msg}",
        )
        return resp.text

    text = await asyncio.to_thread(_invoke)

    # JSON 파싱
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError(f"Gemini가 올바른 JSON을 반환하지 않았습니다: {text}")
    guide = json.loads(match.group())

    # 쇼핑 추천 후처리: 약물 블랙리스트 필터 + 쿠팡 URL 부착
    guide["shopping_suggestions"] = _filter_shopping_suggestions(guide.get("shopping_suggestions"))
    return guide


async def _safe_call(name: str, fn, pet_type: str, symptoms: str) -> dict:
    try:
        text = await fn(pet_type, symptoms)
        return {"model": name, "diagnosis": text, "error": None}
    except Exception as e:
        return {"model": name, "diagnosis": "", "error": str(e)}


async def diagnose_all(pet_type: str, symptoms: str) -> list[dict]:
    claude_label = "Claude (Anthropic)" if CLAUDE_PROVIDER == "anthropic" else "Claude (Bedrock)"
    tasks = [
        (claude_label, call_claude),
        ("GPT (OpenAI)", call_gpt),
        ("Gemini (Google)", call_gemini),
    ]
    coros = [_safe_call(name, fn, pet_type, symptoms) for name, fn in tasks]
    return await asyncio.gather(*coros)
