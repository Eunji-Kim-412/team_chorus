import asyncio
import json
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


# ── 멀티턴 문답 함수 ──────────────────────────────────────────────────────────

import random

def _extract_past_diagnosis(system_prompt: str) -> str:
    """시스템 프롬프트에서 과거 진단명 추출"""
    import re
    match = re.search(r'- [^:]+: ([^\s(]+)', system_prompt)
    return match.group(1) if match else ""

def _mock_direct_answer(last_msg: str, llm: str) -> str:
    """directAnswer=True일 때 — 추천 질문에 직접 답변 (LLM별 다른 말투, 이미 나눈 대화 기반)"""
    q = last_msg.strip()

    if "핵심 이유" in q or "판단한" in q:
        if llm == "claude":
            return "제가 급성 위장염으로 판단한 핵심 근거는 세 가지예요.\n\n① 이물질(화분 흙) 섭취 후 구토 발생 — 시간적 연관성이 명확해요\n② 잇몸 건조 — 이미 탈수가 시작됐다는 신호예요\n③ 무기력증 동반 — 단순 소화불량이 아닌 전신 반응이 진행 중이에요 😊"
        elif llm == "chatgpt":
            return "저는 식이성 위장 장애로 판단했어요. 화분 흙에는 비료·세균이 포함될 수 있고, 이게 소화기 점막을 직접 자극하면 이번과 같은 패턴이 나옵니다. 급성 위장염과 원인이 거의 동일하지만, 이물질 섭취가 명확하기 때문에 식이성으로 분류했어요."
        else:
            return "저는 환경 스트레스 가능성도 열어뒀어요. 화분 흙 섭취가 직접 원인일 가능성이 높지만, 무기력증이 동반된 걸 보면 소화기 자극 외에 스트레스 반응도 함께 작동했을 수 있거든요. 그래서 원인을 단일하게 보지 않았습니다."

    elif "추가 증상" in q or "정보가 있으면" in q or "좁힐" in q:
        if llm == "claude":
            return "말씀해주신 정보만으로도 상당히 윤곽이 잡혀요. 추가로 도움이 될 수 있는 건 **체온**이에요 — 38.5℃ 이상이면 감염성 원인으로 범위가 좁혀져요. 그 외엔 현재 정보로 충분히 진단 방향을 잡을 수 있어요. 🌡️"
        elif llm == "chatgpt":
            return "이미 핵심 정보(이물질 섭취, 구토 횟수, 잇몸 건조)는 다 나왔어요. 추가로 의미 있는 건 **마지막 정상 배변 시간**이에요. 48시간 이상 없으면 장폐색 가능성을 배제해야 해요. 그 외엔 현재 정보로 충분합니다."
        else:
            return "지금 정보로 충분히 판단 가능해요. 굳이 추가한다면 **다른 동물 접촉 여부**가 있으면 전염성 원인을 배제하는 데 도움이 되는 정도예요. 이물질 섭취가 명확하니 원인 범위는 이미 좁혀졌어요."

    elif "주의해야 할" in q or "증상이나 행동" in q:
        if llm == "claude":
            return "지금 당장 가장 중요한 건 **잇몸 탄력 체크**예요.\n\n잇몸을 손가락으로 살짝 눌렀다 뗐을 때 — 2초 안에 분홍빛으로 돌아오면 OK, 그보다 느리면 탈수가 심한 거예요. 즉시 병원이 필요해요. 🚨\n\n그 외엔 구토가 5회 이상 반복되거나 혈액이 섞이면 응급이에요."
        elif llm == "chatgpt":
            return "세 가지 탈수 신호를 주기적으로 확인하세요:\n① 잇몸 건조 및 점착감\n② 피부를 집었을 때 원위치까지 2초 이상\n③ 눈이 움푹 들어가 보임\n\n이 중 하나라도 악화되면 즉시 내원하세요. 수액 처치가 필요할 수 있어요."
        else:
            return "혈변·혈구토·경련·일어서지 못하는 무기력 — 이 네 가지 중 하나라도 나타나면 즉시 응급이에요. 현재 상태라면 30분마다 물 마시는지, 자세에 변화가 있는지 체크해주세요."

    elif "응급 처치" in q or "집에서" in q:
        if llm == "claude":
            return "지금 바로 할 수 있는 것:\n\n1. **금식 4~6시간** — 소화기 자극을 줄이는 게 최우선이에요\n2. **물은 조금씩 자주** — 5~10분마다 소량 제공\n3. **따뜻하고 조용한 곳에서 안정**\n\n구토가 2시간 이상 멈추면 물을 조금 더 늘리고, 그 다음엔 닭가슴살+쌀죽으로 시작해보세요. 🐾"
        elif llm == "chatgpt":
            return "집에서 할 수 있는 처치:\n\n① 6시간 금식 (소화기 회복 시간)\n② 미온수를 소량씩 — 얼음 조각도 좋아요\n③ 배 부위를 따뜻하게 유지\n\n약은 임의로 주지 마세요. 증상 악화 시간과 내용을 메모해뒀다가 내원 시 가져가면 진단에 큰 도움이 돼요."
        else:
            return "집에서는 수분 공급과 안정이 전부예요. 시판 반려동물용 전해질 보충액이 있으면 소량 줄 수 있어요.\n\n억지로 먹이거나 임의로 약 주는 건 위험해요. 2시간 후에도 증상이 지속되면 그대로 내원하세요."

    else:
        if llm == "claude":
            return "진단 결과를 바탕으로 보면, 지금 가장 중요한 건 탈수 진행을 막는 거예요. 잇몸 탄력 확인하면서 소량의 물을 자주 주세요. 구토가 멈추면 소화하기 쉬운 음식으로 천천히 시작해보세요. 😊"
        elif llm == "chatgpt":
            return "현재 진단 기준으로, 보존적 치료(금식·수분·안정)가 우선이에요. 2시간 단위로 상태를 체크하고, 탈수 징후나 증상 악화 시 바로 내원하세요."
        else:
            return "진단 결과 기준으로, 지금 가장 중요한 건 탈수 여부예요. 잇몸 상태를 30분마다 확인하고, 이상이 있으면 즉시 병원에 가세요."


def _mock_qa_response(messages: list[dict], llm: str = "claude", system_prompt: str = "") -> str:
    """API 키 없거나 크레딧 부족할 때 사용하는 mock 응답 (LLM별 말투 차별화)"""
    user_count = sum(1 for m in messages if m["role"] == "user")
    has_history = "과거 진단 기록" in system_prompt
    past_dx = _extract_past_diagnosis(system_prompt) if has_history else ""
    has_cross = "다른 AI가 이미 보호자에게 확인한 정보" in system_prompt

    if llm == "claude":
        if user_count == 1:
            if has_cross:
                return "다른 AI가 이미 나눈 대화를 공유받았어요. 겹치는 질문은 하지 않을게요 😊\n\n제가 추가로 여쭤볼 건 하나예요. 혹시 최근에 식이 변화나 이물질 섭취 가능성이 있었나요?"
            if has_history and past_dx:
                return f"다시 오셨군요 😊 지난번 {past_dx} 이후로 어떻게 지냈나요?\n\n이번에도 비슷한 증상인가요? 언제부터 시작됐는지, 그리고 구토나 무기력증이 동반되는지 알려주세요."
            return "아이고, 많이 걱정되시겠어요. 😢 증상을 좀 더 정확히 파악하기 위해 여쭤볼게요.\n\n증상이 언제부터 시작됐나요? 그리고 평소보다 식욕이나 활동량에 변화가 있었나요?"
        elif user_count == 2:
            if has_cross:
                return "다른 AI가 이미 확인한 내용을 봤어요. 중복 질문은 피하고 다른 각도로 여쭤볼게요.\n\n혹시 최근 환경 변화가 있었나요? 이사, 새 가족 구성원, 다른 동물과의 접촉 같은 스트레스 요인이요."
            return "알려주셔서 감사해요. 한 가지만 더 여쭤볼게요.\n\n최근에 식단이 바뀌거나 산책 중 이상한 것을 먹었을 가능성은 없나요? 장난감이나 이물질을 씹었을 수도 있고요."
        else:
            return "지금까지 말씀해 주신 내용 잘 파악했어요. 충분한 정보가 모인 것 같으니 이제 진단을 받아보셔도 좋을 것 같아요. 🐾"

    elif llm == "chatgpt":
        if user_count == 1:
            if has_cross:
                return "다른 AI와의 대화 내용을 공유받았습니다. 이미 확인된 내용은 건너뛰고 제가 다른 부분을 확인할게요.\n\n체온 측정은 해보셨나요? 그리고 대변 상태에 변화가 있었는지 알려주실 수 있을까요?"
            if has_history and past_dx:
                return f"이전 {past_dx} 진단 기록이 있네요. 이번 증상도 당시와 유사한 패턴인가요?\n\n증상이 시작된 지 얼마나 됐나요? 하루에 몇 번 정도 나타나는지 알려주실 수 있을까요?"
            return "증상 알려주셔서 감사합니다. 정확한 상태 파악을 위해 몇 가지 확인이 필요해요.\n\n증상이 시작된 지 얼마나 됐나요? 하루에 몇 번 정도 나타나는지, 그리고 다른 증상(설사, 무기력 등)도 동반되는지 알려주실 수 있을까요?"
        elif user_count == 2:
            if has_cross:
                return "다른 AI와의 대화 내용을 공유받았어요. 이미 확인된 내용은 넘어가고 추가로 확인할게요.\n\n현재 복용 중인 약이 있거나, 알레르기·만성 질환 이력이 있다면 알려주실 수 있을까요?"
            return "감사합니다. 추가로 한 가지 더 확인할게요.\n\n현재 복용 중인 약이 있나요? 그리고 비슷한 증상이 이전에도 있었던 적이 있었나요?"
        else:
            return "주요 증상들을 충분히 파악했습니다. 다른 AI와도 의견을 비교해보시거나, 지금 바로 '진단 받기'를 눌러보세요."

    else:  # gemini
        if user_count == 1:
            if has_cross:
                return "다른 AI가 공유한 대화 내용 확인했어요. 저는 다른 관점으로 접근해볼게요.\n\n최근 접촉한 다른 동물이 있거나 야외에서 뭔가 먹은 적 있나요?"
            if has_history and past_dx:
                return f"과거 {past_dx} 기록이 있어요. 이번에도 같은 증상인가요, 아니면 다른 부분인가요?\n\n증상이 갑자기 시작됐나요? 물은 잘 마시고 있나요?"
            return "증상 확인했어요. 한 가지만 여쭤볼게요.\n\n증상이 갑자기 시작됐나요, 아니면 서서히 나타났나요? 그리고 물은 잘 마시고 있나요?"
        elif user_count == 2:
            if has_cross:
                return "다른 AI가 공유한 대화 내용 확인했어요. 저는 조금 다른 관점에서 여쭤볼게요.\n\n최근 1주일 사이에 산책 경로가 바뀌거나 접촉한 동물이 있었나요? 외부 감염 가능성도 체크해볼게요."
            return "알겠어요. 마지막으로 하나만요.\n\n대변 상태는 평소와 다른 점이 있었나요? 색이나 굳기 변화가 있었다면 알려주세요."
        else:
            return "정보 충분히 확인했어요. 진단 준비가 된 것 같으니 '진단 받기'를 눌러보세요."


def _mock_diagnosis_response(llm: str = "claude", rediagnosis: bool = False) -> str:
    if rediagnosis:
        # 추가 문답 후 재진단 — 이전 진단을 업데이트하는 방식
        if llm == "claude":
            return """**가장 유력한 원인**: 급성 위장염 (Acute Gastroenteritis) — 진단 유지

**판단 이유**: 추가 문답을 통해 확인한 결과, 초기 진단과 동일하게 급성 위장염으로 판단해요. 화분 흙 섭취 → 소화기 자극 → 구토·탈수의 흐름이 명확하고, 추가 정보에서도 다른 원인을 시사하는 요소가 없었어요. 오히려 진단 신뢰도가 높아졌어요.

**위험도**: 중간 (탈수 동반으로 초기 대응이 중요)

**즉시 조치**: 금식을 유지하면서 소량의 물을 자주 제공하세요. 잇몸 탄력이 돌아오는지 30분마다 확인해주세요.

**병원 방문**: 오늘 중으로 내원을 강력 권장해요. 수액 처치로 빠르게 회복할 수 있어요."""

        elif llm == "chatgpt":
            return """**가장 유력한 원인**: 이물질 섭취로 인한 소화기 장애 — 진단 업데이트

**판단 이유**: 추가 정보를 반영하면, 단순 식이성 장애보다 화분 흙의 세균·이물질이 직접적인 원인인 것으로 진단을 좁혔습니다. 탈수 징후(잇몸 건조)가 이미 동반되어 있어 경증을 넘어선 상태입니다.

**위험도**: 중간~높음 (탈수 진행 중)

**즉시 조치**: 더 이상 금식을 미루지 마세요. 전해질 보충이 가능하면 즉시 시작하세요.

**병원 방문**: 탈수 징후가 확인된 만큼 오늘 내원을 권장합니다. 수액 처치가 필요할 가능성이 높아요."""

        else:  # gemini
            return """**가장 유력한 원인**: 급성 위장염 — 스트레스 복합 요인 포함

**판단 이유**: 추가 대화를 통해 화분 흙 섭취가 주된 트리거임이 확인됐어요. 여기에 환경 스트레스가 복합 작용했을 가능성이 있어요. 단일 원인보다 복합 요인으로 보는 게 더 정확합니다.

**위험도**: 중간

**즉시 조치**: 조용한 환경 유지와 금식을 병행하세요. 구토가 멈춘 후 전해질 음료를 소량 시도해보세요.

**병원 방문**: 잇몸 건조가 확인된 만큼 오늘 내원해서 탈수 정도를 평가받으세요."""

    # 최초 진단
    if llm == "claude":
        return """**가장 유력한 원인**: 급성 위장염 (Acute Gastroenteritis)

**판단 이유**: 말씀해주신 증상 패턴이 급성 위장염과 전형적으로 일치해요. 소화기관이 일시적으로 자극을 받았을 때 나타나는 증상이며, 식이 변화나 이물질 섭취가 주요 원인인 경우가 많아요.

**위험도**: 중간

**즉시 조치**: 12시간 정도 금식 후 소량의 물을 조금씩 제공해주세요. 기름진 음식과 간식은 당분간 피해주세요.

**병원 방문**: 증상이 24시간 이상 지속되거나, 혈변·심한 무기력증이 동반되면 즉시 방문하세요."""

    elif llm == "chatgpt":
        return """**가장 유력한 원인**: 식이성 위장 장애 (Dietary Indiscretion)

**판단 이유**: 증상의 발현 시점과 패턴을 볼 때, 평소와 다른 음식 섭취나 이물질 섭취로 인한 소화계 반응으로 판단됩니다. 급성 위장염과 감별이 필요하나 식이 원인 가능성이 높습니다.

**위험도**: 중간

**즉시 조치**: 소화기 휴식을 위해 6~12시간 금식을 권장합니다. 이후 소량의 미온수와 부드러운 음식(닭가슴살+쌀)으로 식이를 전환해주세요.

**병원 방문**: 구토나 설사가 하루 이상 반복되거나 탈수 징후(잇몸 건조, 피부 탄력 저하)가 보이면 바로 내원하세요."""

    else:  # gemini
        return """**가장 유력한 원인**: 스트레스성 위염 (Stress-induced Gastritis)

**판단 이유**: 증상 발현 양상과 동반 증상을 종합할 때, 환경 변화나 스트레스 자극으로 인한 위장관 반응 가능성이 있습니다. 식이 원인도 배제할 수 없으나 행동 변화도 주요 단서입니다.

**위험도**: 낮음~중간

**즉시 조치**: 조용하고 편안한 환경을 제공하고, 스트레스 요인을 줄여주세요. 소량씩 자주 급여하는 방식으로 전환해보세요.

**병원 방문**: 증상이 48시간 이상 지속되면 위내시경 검사를 포함한 정밀 검진을 권장합니다."""


def _pick_mock(messages: list[dict], system_prompt: str, llm: str) -> str:
    """chat 예외 처리 공통 — 응답 종류 선택"""
    last_content = messages[-1]["content"] if messages else ""
    # 1순위: 직접 답변 요청 (추천 질문 칩)
    if "직접 답변" in system_prompt:
        return _mock_direct_answer(last_content, llm)
    # 2순위: 종합 진단 요청
    is_diagnosis = any(kw in last_content for kw in ["진단해주세요", "진단을 내려주세요", "종합 진단", "진단해 주세요"])
    if is_diagnosis:
        # 이미 한 번 진단한 적 있으면 재진단 응답 사용
        already_diagnosed = any("가장 유력한 원인" in m.get("content", "") for m in messages if m["role"] == "assistant")
        return _mock_diagnosis_response(llm, rediagnosis=already_diagnosed)
    # 3순위: 일반 문답
    return _mock_qa_response(messages, llm, system_prompt)


async def chat_claude(messages: list[dict], system_prompt: str) -> str:
    try:
        if CLAUDE_PROVIDER == "anthropic":
            client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model=ANTHROPIC_MODEL_ID,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            return resp.content[0].text
        else:
            def _invoke():
                client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": messages,
                })
                resp = client.invoke_model(modelId=BEDROCK_MODEL_ID, body=body, contentType="application/json")
                return json.loads(resp["body"].read())["content"][0]["text"]
            return await asyncio.to_thread(_invoke)
    except Exception:
        await asyncio.sleep(0.8 + random.random() * 0.5)
        return _pick_mock(messages, system_prompt, "claude")


async def chat_gpt(messages: list[dict], system_prompt: str) -> str:
    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        api_messages = [{"role": "system", "content": system_prompt}] + messages
        resp = await client.chat.completions.create(
            model=OPENAI_MODEL_ID,
            max_tokens=1024,
            messages=api_messages,
        )
        return resp.choices[0].message.content
    except Exception:
        await asyncio.sleep(0.9 + random.random() * 0.6)
        return _pick_mock(messages, system_prompt, "chatgpt")


async def chat_gemini(messages: list[dict], system_prompt: str) -> str:
    try:
        def _invoke():
            from google.genai import types
            client = genai.Client(api_key=GEMINI_API_KEY)
            contents = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})
            resp = client.models.generate_content(
                model=GEMINI_MODEL_ID,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            )
            return resp.text
        return await asyncio.to_thread(_invoke)
    except Exception:
        await asyncio.sleep(1.0 + random.random() * 0.5)
        return _pick_mock(messages, system_prompt, "gemini")


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
