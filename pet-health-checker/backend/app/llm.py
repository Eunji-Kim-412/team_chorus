"""
F2: 증상 대화형 입력 + 3개 LLM 병렬 호출
F3: 3개 LLM 응답 통합 + 위험도 산정

SPEC.md 기반 구현.
- F2는 각 LLM에 동일한 JSON 스키마를 강제하고 병렬 호출
- F3는 LLM을 호출하지 않고 순수 통합 알고리즘만 수행
"""

import asyncio
import json
import re
import time
from typing import Any

import openai
from google import genai

from app.config import (
    CLAUDE_PROVIDER,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL_ID,
    AWS_REGION, BEDROCK_MODEL_ID,
    OPENAI_PROVIDER,
    OPENAI_API_KEY, OPENAI_MODEL_ID,
    BEDROCK_OPENAI_MODEL_ID,
    GEMINI_API_KEY, GEMINI_MODEL_ID,
)

# 선택적 의존성 (프로바이더에 따라 필요한 라이브러리만 사용)
if CLAUDE_PROVIDER == "anthropic":
    import anthropic

# boto3는 Claude Bedrock 또는 OpenAI Bedrock 중 하나라도 쓰면 필요
_need_boto3 = CLAUDE_PROVIDER == "bedrock" or OPENAI_PROVIDER == "bedrock"
if _need_boto3:
    import boto3

# ==================================================================
# 공통: 시스템 프롬프트 & JSON 스키마
# ==================================================================

SYSTEM_PROMPT = """당신은 반려동물의 증상을 분석하는 트리아지 어시스턴트입니다.
확정 진단을 내리지 마세요. 의심되는 진단명과 위험도(1.0-10.0)만 제시하세요.
응답은 반드시 아래 JSON 스키마를 따라야 합니다. JSON 외의 텍스트나 마크다운 코드 블록은 포함하지 마세요.

JSON 스키마:
{
  "diagnosis_candidates": [
    {"name": "질병명 (한국어)", "confidence": 0.0-1.0, "reasoning": "판단 근거"}
  ],
  "urgency_score": 1.0-10.0,
  "urgency_rationale": "위험도 판단 근거",
  "red_flags": ["주의해야 할 증상들"],
  "should_visit_hospital": true or false
}

위험도 가이드:
- 1.0-2.9: 거의 정상 (집에서 관찰)
- 3.0-4.9: 가벼운 이상 (홈케어)
- 5.0-6.9: 주의 필요 (내일 중 병원)
- 7.0-8.9: 응급 (오늘 중 병원)
- 9.0-10.0: 즉시 응급 (24시간 응급실)

diagnosis_candidates 는 최대 3개까지, confidence 는 0-1 소수, urgency_score 는 소수점 첫째자리까지.
"""


# F2 멀티턴 대화용 프롬프트 (자유 텍스트 응답)
CHAT_SYSTEM_PROMPT = """당신은 친근하고 전문적인 수의 트리아지 어시스턴트입니다.
반려동물 보호자와 대화하며 증상에 대한 정보를 수집하세요.

응답 규칙:
1. 한국어로 친근하게 답변하세요 (2~4문장 정도).
2. 아직 불확실하면 **질문 1~2개** 를 던져 정보를 얻으세요.
   - 증상 발생 시점 / 빈도 / 동반 증상 / 행동 변화 등
3. 특정 증상에 대한 간단한 소견을 곁들일 수 있습니다.
4. 확정 진단은 금지. "~~일 수 있어요", "~~ 가능성이 있습니다" 정도.
5. 응답 마지막 줄에 다음 JSON 메타를 포함하세요 (사용자에겐 안 보입니다):
   ---META---
   {"ready_for_diagnosis": true/false, "suggested_quick_replies": ["선택지1", "선택지2"]}
   ---END---
   - ready_for_diagnosis: 증상, 시점, 빈도, 동반 증상이 충분히 모였으면 true
   - suggested_quick_replies: 사용자가 다음 답변으로 쓸 수 있는 선택지 2-4개 (선택, 없으면 빈 배열)
"""


# F2 멀티 패널용 프롬프트 (다른 AI의 대화 맥락을 공유받을 때)
CHAT_MULTI_PANEL_PROMPT = """당신은 친근하고 전문적인 수의 트리아지 어시스턴트입니다.
반려동물 보호자가 여러 AI 어시스턴트와 동시에 상담하고 있습니다.
당신은 그 중 한 명이며, 다른 AI들이 이미 주고받은 대화를 참고해 답변하세요.

응답 규칙:
1. 한국어로 친근하게 답변하세요 (2~4문장 정도).
2. 다른 AI가 이미 물어본 질문을 중복하지 말고, 빠진 정보를 보강하거나 다른 각도로 접근하세요.
3. 아직 불확실하면 **질문 1~2개** 를 던져 정보를 얻으세요.
4. 확정 진단은 금지. "~~일 수 있어요" 톤 유지.
5. 응답 마지막 줄에 다음 JSON 메타를 포함하세요 (사용자에겐 안 보입니다):
   ---META---
   {"ready_for_diagnosis": true/false, "suggested_quick_replies": ["선택지1", "선택지2"]}
   ---END---
"""

LLM_TIMEOUT_SEC = 15

# ==================================================================
# JSON 응답 파싱 (LLM이 마크다운 펜스 등을 포함해도 견고하게)
# ==================================================================

def _extract_json(text: str) -> dict:
    """LLM 출력에서 JSON 오브젝트를 추출. 실패 시 예외 발생."""
    if not text:
        raise ValueError("empty response")
    cleaned = text.strip()
    # 마크다운 코드 펜스 제거
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    # 가장 바깥 {} 추출 (다중라인 대응)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON object found")
    return json.loads(cleaned[start : end + 1])


def _validate_schema(parsed: dict) -> dict:
    """최소 필수 필드 검증 + 타입 정규화."""
    required = ["diagnosis_candidates", "urgency_score", "urgency_rationale",
                "red_flags", "should_visit_hospital"]
    for k in required:
        if k not in parsed:
            raise ValueError(f"missing field: {k}")
    # 정규화
    parsed["urgency_score"] = max(1.0, min(10.0, float(parsed["urgency_score"])))
    parsed["should_visit_hospital"] = bool(parsed["should_visit_hospital"])
    parsed["red_flags"] = list(parsed.get("red_flags", []))
    candidates = parsed.get("diagnosis_candidates", [])
    if not isinstance(candidates, list):
        candidates = []
    # 각 진단 후보 정규화
    normed = []
    for c in candidates[:3]:
        if not isinstance(c, dict):
            continue
        normed.append({
            "name": str(c.get("name", "")).strip(),
            "confidence": max(0.0, min(1.0, float(c.get("confidence", 0.5)))),
            "reasoning": str(c.get("reasoning", "")).strip(),
        })
    parsed["diagnosis_candidates"] = normed
    return parsed


# ==================================================================
# F2 멀티턴 대화: LLM별 자유 텍스트 응답 (시스템 프롬프트 교체 가능)
# ==================================================================

def _parse_chat_response(raw: str) -> dict:
    """
    대화 응답에서 본문과 메타 JSON을 분리.
    반환: { "content": str, "ready_for_diagnosis": bool, "suggested_quick_replies": list }
    """
    if not raw:
        return {"content": "", "ready_for_diagnosis": False, "suggested_quick_replies": []}

    content = raw
    ready = False
    quick_replies = []

    # GPT-OSS 등이 내뱉는 <reasoning>...</reasoning> 제거
    content = re.sub(r'<reasoning>.*?</reasoning>', '', content, flags=re.DOTALL)
    # <think>...</think> 같은 다른 reasoning 태그도 제거
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
    # <final>...</final> 형태로 감싸진 경우 내부만 추출
    final_match = re.search(r'<final>\s*(.*?)\s*</final>', content, flags=re.DOTALL)
    if final_match:
        content = final_match.group(1)

    # ---META--- ... ---END--- 블록 추출
    meta_match = re.search(r'---META---\s*(\{.*?\})\s*---END---', content, re.DOTALL)
    if meta_match:
        try:
            meta = json.loads(meta_match.group(1))
            ready = bool(meta.get("ready_for_diagnosis", False))
            quick_replies = list(meta.get("suggested_quick_replies", []))[:4]
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
        # 메타 블록을 본문에서 제거
        content = content[:meta_match.start()] + content[meta_match.end():]

    return {
        "content": content.strip(),
        "ready_for_diagnosis": ready,
        "suggested_quick_replies": quick_replies,
    }


async def _call_claude_chat(system: str, messages: list[dict]) -> str:
    """Claude에 system + messages 배열로 호출."""
    if CLAUDE_PROVIDER == "anthropic":
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        resp = await client.messages.create(
            model=ANTHROPIC_MODEL_ID,
            max_tokens=512,
            system=system,
            messages=messages,
        )
        return resp.content[0].text

    # Bedrock
    def _invoke():
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "system": system,
            "messages": messages,
        })
        resp = client.invoke_model(modelId=BEDROCK_MODEL_ID, body=body, contentType="application/json")
        return json.loads(resp["body"].read())["content"][0]["text"]
    return await asyncio.to_thread(_invoke)


async def _call_gpt_chat(system: str, messages: list[dict]) -> str:
    """GPT에 system + messages 호출."""
    if OPENAI_PROVIDER == "openai":
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model=OPENAI_MODEL_ID,
            max_tokens=512,
            messages=[{"role": "system", "content": system}] + messages,
        )
        return resp.choices[0].message.content
    elif OPENAI_PROVIDER == "bedrock":
        def _invoke():
            client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
            body = json.dumps({
                "messages": [{"role": "system", "content": system}] + messages,
                "max_completion_tokens": 512,
                "temperature": 0.7,
            })
            resp = client.invoke_model(
                modelId=BEDROCK_OPENAI_MODEL_ID, body=body, contentType="application/json"
            )
            return json.loads(resp["body"].read())["choices"][0]["message"]["content"]
        return await asyncio.to_thread(_invoke)
    raise RuntimeError("OpenAI provider not configured")


async def _call_gemini_chat(system: str, messages: list[dict]) -> str:
    """Gemini에 system + messages 호출."""
    # Gemini는 system prompt를 contents 최상단에 섞어 넣음
    def _invoke():
        client = genai.Client(api_key=GEMINI_API_KEY)
        convo_text = system + "\n\n"
        for m in messages:
            role = "사용자" if m["role"] == "user" else "어시스턴트"
            convo_text += f"{role}: {m['content']}\n"
        convo_text += "어시스턴트:"
        resp = client.models.generate_content(
            model=GEMINI_MODEL_ID,
            contents=convo_text,
        )
        return resp.text
    return await asyncio.to_thread(_invoke)


async def _invoke_chat(model_name: str, call_fn, system: str, messages: list[dict]) -> dict:
    """대화 턴 호출 + 파싱 + 에러 격리."""
    start = time.time()
    result = {
        "modelName": model_name,
        "status": "failed",
        "content": None,
        "ready_for_diagnosis": False,
        "suggested_quick_replies": [],
        "latencyMs": 0,
        "errorMessage": None,
    }
    try:
        raw = await asyncio.wait_for(call_fn(system, messages), timeout=LLM_TIMEOUT_SEC)
        parsed = _parse_chat_response(raw)
        result["content"] = parsed["content"]
        result["ready_for_diagnosis"] = parsed["ready_for_diagnosis"]
        result["suggested_quick_replies"] = parsed["suggested_quick_replies"]
        result["status"] = "success"
    except asyncio.TimeoutError:
        result["status"] = "timeout"
        result["errorMessage"] = f"timeout after {LLM_TIMEOUT_SEC}s"
    except Exception as e:
        result["status"] = "failed"
        result["errorMessage"] = str(e)
    result["latencyMs"] = int((time.time() - start) * 1000)
    return result


def _get_claude_label() -> str:
    return "Claude (Anthropic)" if CLAUDE_PROVIDER == "anthropic" else "Claude (Bedrock)"


def _get_gpt_label() -> str:
    if OPENAI_PROVIDER == "openai":
        return "GPT (OpenAI)"
    if OPENAI_PROVIDER == "bedrock":
        return "GPT-OSS (Bedrock)"
    return "GPT (미설정)"


async def chat_parallel(system: str, messages: list[dict], pet_context: dict | None = None) -> list[dict]:
    """
    3개 LLM에 같은 메시지 배열로 동시 호출.
    첫 질문(다중 응답 카드) 용도.
    """
    # 펫 컨텍스트를 system 프롬프트에 덧붙임
    if pet_context:
        pet_section = _format_pet_context(pet_context)
        system = f"{system}\n\n[반려동물 정보]\n{pet_section}"

    tasks = [
        _invoke_chat(_get_claude_label(), _call_claude_chat, system, messages),
        _invoke_chat(_get_gpt_label(), _call_gpt_chat, system, messages),
        _invoke_chat("Gemini (Google)", _call_gemini_chat, system, messages),
    ]
    return await asyncio.gather(*tasks)


async def chat_single(model_name: str, system: str, messages: list[dict], pet_context: dict | None = None) -> dict:
    """
    특정 LLM에게만 대화 요청. 선택 후 1:1 대화 시 사용.
    """
    if pet_context:
        pet_section = _format_pet_context(pet_context)
        system = f"{system}\n\n[반려동물 정보]\n{pet_section}"

    # 모델 이름으로 함수 매핑
    if model_name.startswith("Claude"):
        return await _invoke_chat(_get_claude_label(), _call_claude_chat, system, messages)
    if model_name.startswith("GPT"):
        return await _invoke_chat(_get_gpt_label(), _call_gpt_chat, system, messages)
    if model_name.startswith("Gemini"):
        return await _invoke_chat("Gemini (Google)", _call_gemini_chat, system, messages)
    raise ValueError(f"Unknown model: {model_name}")


def _build_cross_context(llms_state: dict, target_model: str) -> str:
    """
    target_model을 제외한 다른 LLM들의 대화 요약을 만들어 반환.
    은지님의 buildCrossContext와 유사한 역할.
    """
    sections = []
    for model_name, state in llms_state.items():
        if model_name == target_model:
            continue
        msgs = state.get("messages", [])
        if not msgs:
            continue
        display_name = model_name.split(" (")[0]  # "Claude (Bedrock)" → "Claude"
        lines = []
        for m in msgs[-6:]:  # 최근 6개만 요약 (너무 길면 토큰 낭비)
            role = m.get("role", "user")
            content = (m.get("content") or "").strip()
            if not content:
                continue
            speaker = "보호자" if role == "user" else display_name
            # 너무 길면 자르기
            if len(content) > 120:
                content = content[:120] + "…"
            lines.append(f"  {speaker}: {content}")
        if lines:
            sections.append(f"[{display_name}와의 대화]\n" + "\n".join(lines))

    if not sections:
        return ""
    return "[다른 AI들이 보호자와 주고받은 대화 (참고용)]\n\n" + "\n\n".join(sections)


async def chat_turn(
    target_models: list[str],
    user_text: str,
    llms_state: dict,
    pet_context: dict | None = None,
) -> dict:
    """
    한 턴 진행. 선택된 target_models에게만 호출.
    각 타겟 LLM에게 자신의 이전 대화 + 다른 LLM들의 crossContext 를 함께 전달.

    Returns:
      { target_model: response_dict, ... }
    """
    tasks = []
    target_list = []
    for target in target_models:
        # 이 LLM의 기존 대화에 유저 메시지 추가
        own_messages = list(llms_state.get(target, {}).get("messages", []))
        own_messages.append({"role": "user", "content": user_text})

        # crossContext 생성 (다른 LLM들의 대화)
        cross = _build_cross_context(llms_state, target)

        # system 프롬프트 구성
        base_prompt = CHAT_MULTI_PANEL_PROMPT if cross else CHAT_SYSTEM_PROMPT
        system = base_prompt
        if cross:
            system = f"{system}\n\n{cross}"
        if pet_context:
            pet_section = _format_pet_context(pet_context)
            system = f"{system}\n\n[반려동물 정보]\n{pet_section}"

        # LLM별 호출 함수 매핑
        if target.startswith("Claude"):
            call_fn = _call_claude_chat
        elif target.startswith("GPT"):
            call_fn = _call_gpt_chat
        elif target.startswith("Gemini"):
            call_fn = _call_gemini_chat
        else:
            continue

        # role=user/assistant만 추려서 전달 (timestamp 등은 제외)
        cleaned = [{"role": m["role"], "content": m["content"]} for m in own_messages]
        tasks.append(_invoke_chat(target, call_fn, system, cleaned))
        target_list.append(target)

    results = await asyncio.gather(*tasks)
    return {target: result for target, result in zip(target_list, results)}


# ==================================================================
# F2 진단 단계: 각 LLM 호출 함수 (JSON 스키마 강제)
# ==================================================================

def _format_pet_context(pet_context: dict | None) -> str:
    """Pet context를 LLM 프롬프트용 한글 요약 문자열로 변환."""
    if not pet_context:
        return ""
    pet = pet_context.get("pet") or {}
    daily = pet_context.get("dailyLog") or {}

    species_map = {"dog": "강아지", "cat": "고양이", "other": "기타"}
    gender_map = {"male": "수컷", "female": "암컷"}
    food_type_map = {"dry": "건식", "wet": "습식", "raw": "생식", "mixed": "혼합"}
    stool_map = {"normal": "정상", "diarrhea": "설사", "constipation": "변비", "bloody": "혈변"}
    activity_map = {"normal": "평소대로", "decreased": "줄어듦", "increased": "늘어남"}

    age = pet.get("age") or {}
    years = age.get("years", 0)
    months = age.get("months", 0)
    age_str = f"{years}살 {months}개월" if months else f"{years}살"

    parts = []
    if pet.get("name"):
        parts.append(f"이름: {pet['name']}")
    parts.append(f"종: {species_map.get(pet.get('species'), pet.get('species', '미상'))}")
    if pet.get("breed"):
        parts.append(f"품종: {pet['breed']}")
    parts.append(f"나이: {age_str}")
    parts.append(f"성별: {gender_map.get(pet.get('gender'), '미상')}")
    parts.append(f"중성화: {'예' if pet.get('neutered') else '아니요'}")
    if pet.get("weightKg"):
        parts.append(f"몸무게: {pet['weightKg']}kg")
    if pet.get("medicalHistory"):
        parts.append(f"병력: {', '.join(pet['medicalHistory'])}")
    if pet.get("medications"):
        parts.append(f"상시 복용 약물: {', '.join(pet['medications'])}")
    if pet.get("foodType"):
        parts.append(f"사료 종류: {food_type_map.get(pet['foodType'], pet['foodType'])}")
    if pet.get("allergies"):
        parts.append(f"알레르기: {', '.join(pet['allergies'])}")

    # 일일 컨디션
    if daily:
        daily_parts = []
        if daily.get("yesterdayFood"):
            daily_parts.append(f"전날 식이: {daily['yesterdayFood']}")
        if daily.get("stoolType"):
            daily_parts.append(f"용변: {stool_map.get(daily['stoolType'], daily['stoolType'])}")
        if daily.get("activityLevel"):
            daily_parts.append(f"활동량: {activity_map.get(daily['activityLevel'], daily['activityLevel'])}")
        if daily.get("notes"):
            daily_parts.append(f"메모: {daily['notes']}")
        if daily_parts:
            parts.append("최근 컨디션 — " + " / ".join(daily_parts))

    return "\n".join([f"  - {p}" for p in parts])


def _build_user_msg(pet_type: str, symptoms: str, messages: list[dict] | None = None, pet_context: dict | None = None) -> str:
    label = "강아지" if pet_type == "dog" else "고양이" if pet_type == "cat" else "반려동물"

    # 펫 상세 정보 섹션
    pet_section = _format_pet_context(pet_context)
    pet_info_block = f"- 펫 정보 (상세):\n{pet_section}" if pet_section else f"- 펫 정보: 종={label}"

    # 채팅 대화가 있으면 그것 위주로 전달
    if messages:
        convo_lines = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "").strip()
            if not content:
                continue
            tag = "보호자" if role == "user" else "시스템"
            convo_lines.append(f"  {tag}: {content}")
        conversation = "\n".join(convo_lines)
        return (
            f"[입력]\n"
            f"{pet_info_block}\n"
            f"- 보호자와의 대화:\n{conversation}\n\n"
            f"- 요약된 증상: {symptoms}"
        )
    return f"[입력]\n{pet_info_block}\n- 보호자와의 대화:\n{symptoms}"


async def _call_claude_anthropic(user_msg: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    resp = await client.messages.create(
        model=ANTHROPIC_MODEL_ID,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return resp.content[0].text


async def _call_claude_bedrock(user_msg: str) -> str:
    def _invoke():
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_msg}],
        })
        resp = client.invoke_model(modelId=BEDROCK_MODEL_ID, body=body, contentType="application/json")
        return json.loads(resp["body"].read())["content"][0]["text"]
    return await asyncio.to_thread(_invoke)


async def _call_claude_raw(user_msg: str) -> str:
    if CLAUDE_PROVIDER == "anthropic":
        return await _call_claude_anthropic(user_msg)
    return await _call_claude_bedrock(user_msg)


async def _call_gpt_openai(user_msg: str) -> str:
    """OpenAI API 직접 호출."""
    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    resp = await client.chat.completions.create(
        model=OPENAI_MODEL_ID,
        max_tokens=1024,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    return resp.choices[0].message.content


async def _call_gpt_bedrock(user_msg: str) -> str:
    """AWS Bedrock 경유 OpenAI 모델 호출 (gpt-oss)."""
    def _invoke():
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        # Bedrock의 OpenAI 모델은 OpenAI Chat Completions 형식을 따름
        body = json.dumps({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "max_completion_tokens": 1024,
            "temperature": 0.7,
        })
        resp = client.invoke_model(
            modelId=BEDROCK_OPENAI_MODEL_ID,
            body=body,
            contentType="application/json",
        )
        result = json.loads(resp["body"].read())
        # Chat Completions 응답 형식
        return result["choices"][0]["message"]["content"]
    return await asyncio.to_thread(_invoke)


async def _call_gpt_raw(user_msg: str) -> str:
    """OpenAI 프로바이더 자동 선택."""
    if OPENAI_PROVIDER == "openai":
        return await _call_gpt_openai(user_msg)
    elif OPENAI_PROVIDER == "bedrock":
        return await _call_gpt_bedrock(user_msg)
    else:
        raise RuntimeError("OpenAI provider가 설정되지 않았습니다. OPENAI_API_KEY 또는 USE_BEDROCK_OPENAI=true를 설정하세요.")


async def _call_gemini_raw(user_msg: str) -> str:
    def _invoke():
        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=GEMINI_MODEL_ID,
            contents=f"{SYSTEM_PROMPT}\n\n{user_msg}",
        )
        return resp.text
    return await asyncio.to_thread(_invoke)


async def _invoke_llm(model_name: str, call_fn, user_msg: str) -> dict:
    """
    단일 LLM 호출 + 파싱 + 에러 격리.
    반환 LLMResponse:
      {
        "modelName": "Claude (Anthropic)",
        "status": "success" | "failed" | "schema_violation" | "timeout",
        "rawResponse": str | None,
        "parsedResponse": dict | None,
        "latencyMs": int,
        "errorMessage": str | None,
      }
    """
    start = time.time()
    result = {
        "modelName": model_name,
        "status": "failed",
        "rawResponse": None,
        "parsedResponse": None,
        "latencyMs": 0,
        "errorMessage": None,
    }
    try:
        raw = await asyncio.wait_for(call_fn(user_msg), timeout=LLM_TIMEOUT_SEC)
        result["rawResponse"] = raw
        try:
            parsed = _extract_json(raw)
            parsed = _validate_schema(parsed)
            result["parsedResponse"] = parsed
            result["status"] = "success"
        except Exception as e:
            result["status"] = "schema_violation"
            result["errorMessage"] = f"JSON parse: {e}"
    except asyncio.TimeoutError:
        result["status"] = "timeout"
        result["errorMessage"] = f"timeout after {LLM_TIMEOUT_SEC}s"
    except Exception as e:
        result["status"] = "failed"
        result["errorMessage"] = str(e)
    result["latencyMs"] = int((time.time() - start) * 1000)
    return result


async def diagnose_all(pet_type: str, symptoms: str, messages: list[dict] | None = None, pet_context: dict | None = None) -> dict:
    """
    F2 메인 엔트리포인트.
    3개 LLM 병렬 호출 → 결과 반환.
    """
    user_msg = _build_user_msg(pet_type, symptoms, messages, pet_context)
    claude_label = "Claude (Anthropic)" if CLAUDE_PROVIDER == "anthropic" else "Claude (Bedrock)"
    gpt_label = (
        "GPT (OpenAI)" if OPENAI_PROVIDER == "openai"
        else "GPT-OSS (Bedrock)" if OPENAI_PROVIDER == "bedrock"
        else "GPT (미설정)"
    )

    tasks = [
        _invoke_llm(claude_label, _call_claude_raw, user_msg),
        _invoke_llm(gpt_label, _call_gpt_raw, user_msg),
        _invoke_llm("Gemini (Google)", _call_gemini_raw, user_msg),
    ]
    total_start = time.time()
    llm_responses = await asyncio.gather(*tasks, return_exceptions=False)
    total_latency_ms = int((time.time() - total_start) * 1000)

    return {
        "llmResponses": llm_responses,
        "totalLatencyMs": total_latency_ms,
    }


# ==================================================================
# F3: LLM 응답 통합 (LLM 호출 없이 순수 알고리즘)
# ==================================================================

URGENCY_LEVELS = [
    # (min, max, level, label, color, branch, headline_template)
    (1.0, 2.9, 1, "거의 정상", "green", "homecare",
     "위험도는 {score}예요. 지금 당장 걱정할 상태는 아닙니다."),
    (3.0, 4.9, 2, "가벼운 이상", "lime", "homecare",
     "위험도는 {score}. 가벼운 이상으로 보이니 홈케어로 관찰해주세요."),
    (5.0, 6.9, 3, "주의 필요", "yellow", "hospital",
     "위험도는 {score}. 가급적 내일 중 동물병원에 가보시는 게 좋겠습니다."),
    (7.0, 8.9, 4, "응급", "orange", "hospital",
     "위험도는 {score}. 오늘 중으로 반드시 동물병원을 방문하세요."),
    (9.0, 10.0, 5, "즉시 응급", "red", "hospital",
     "위험도는 {score}. 급합니다 지금 바로 24시간 응급실로 가세요!"),
]


def _map_level(score: float) -> dict:
    """점수 → 등급 정보."""
    score = max(1.0, min(10.0, float(score)))
    for mn, mx, level, label, color, branch, headline in URGENCY_LEVELS:
        if mn <= score <= mx:
            return {
                "score": round(score, 1),
                "level": level,
                "label": label,
                "color": color,
                "branch": branch,
                "headline": headline.format(score=round(score, 1)),
            }
    # fallback
    return {
        "score": round(score, 1),
        "level": 3,
        "label": "주의 필요",
        "color": "yellow",
        "branch": "hospital",
        "headline": f"위험도 {round(score, 1)}. 병원 상담을 권장합니다.",
    }


def _consolidate_urgency(scores: list[float]) -> float:
    """
    SPEC 통합 알고리즘:
    - 기본: 평균
    - 최댓값-최솟값 >= 3.0 이면 최댓값 (보수적)
    """
    if not scores:
        return 5.0
    avg = sum(scores) / len(scores)
    spread = max(scores) - min(scores)
    if spread >= 3.0:
        return max(scores)
    return avg


def _consolidate_diagnoses(parsed_list: list[dict]) -> tuple[list[dict], str]:
    """
    진단명 통합:
    - 2개 이상 모델이 유사 진단 제시 → 합의
    - 아니면 각 모델의 top-1 모두 나열 (split)

    유사 판정: 이름 문자열의 교집합 키워드 기반 (간단히 정규화 후 부분일치).
    """
    # 각 모델의 top-1 후보
    per_model_top = []
    for p in parsed_list:
        cands = p.get("diagnosis_candidates", [])
        if cands:
            per_model_top.append(cands[0])

    if len(per_model_top) < 2:
        return per_model_top, "split"

    # 이름 정규화 (공백/괄호/특수문자 제거, 소문자)
    def norm(s: str) -> str:
        s = re.sub(r"[\s()\[\]\-_,.!?:;~'\"·]", "", s)
        return s.lower()

    names = [norm(c["name"]) for c in per_model_top]

    # 부분일치 클러스터링 (O(n^2), n<=3이라 OK)
    from collections import Counter
    # 각 모델 top-1 이름이 서로 부분일치하는지
    agreement_count = 0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            if not a or not b:
                continue
            if a in b or b in a:
                agreement_count += 1
                break  # i가 어느 하나와라도 일치하면 카운트

    if agreement_count >= 1 and len(per_model_top) >= 2:
        # 가장 많이 등장하는 이름 기반으로 대표 진단 선택
        # (여기선 간단히 첫 번째 일치 발생한 후보 우선)
        return per_model_top, "agreed"
    return per_model_top, "split"


def consolidate_results(llm_responses: list[dict]) -> dict:
    """
    F3 메인 엔트리포인트.
    3개 LLM 응답 → 통합 결과.
    """
    # 성공한 응답만 필터
    valid = [r for r in llm_responses if r.get("status") == "success" and r.get("parsedResponse")]

    if len(valid) == 0:
        # 모두 실패한 경우
        return {
            "modelScores": {},
            "consolidatedUrgency": 5.0,
            "urgency": _map_level(5.0),
            "consolidatedDiagnoses": [],
            "consensusType": "split",
            "redFlags": [],
            "shouldVisitHospital": True,
            "headlineMessage": "AI 분석에 실패했습니다. 안전을 위해 동물병원에 상담하세요.",
            "modelRationales": [],
            "narrativeSummary": "",
        }

    # 모델별 점수
    model_scores = {r["modelName"]: r["parsedResponse"]["urgency_score"] for r in valid}
    scores = list(model_scores.values())
    consolidated_urgency = _consolidate_urgency(scores)
    urgency_info = _map_level(consolidated_urgency)

    # 진단명 통합
    parsed_list = [r["parsedResponse"] for r in valid]
    top_diagnoses, consensus_type = _consolidate_diagnoses(parsed_list)

    # red_flags 통합 (중복 제거, 순서 보존)
    seen = set()
    red_flags = []
    for p in parsed_list:
        for f in p.get("red_flags", []):
            if f and f not in seen:
                seen.add(f)
                red_flags.append(f)

    # 병원 권고: 통합 위험도 >= 5 OR 어느 모델이라도 should_visit_hospital=True
    should_visit = (consolidated_urgency >= 5.0) or any(
        p.get("should_visit_hospital") for p in parsed_list
    )
    weak_advice = (consolidated_urgency < 5.0 and should_visit)

    # 모델별 근거 모음
    model_rationales = [
        {
            "model": r["modelName"],
            "urgency_score": r["parsedResponse"]["urgency_score"],
            "urgency_level": _map_level(r["parsedResponse"]["urgency_score"]),
            "urgency_rationale": r["parsedResponse"]["urgency_rationale"],
            "top_diagnosis": (r["parsedResponse"]["diagnosis_candidates"] or [{}])[0].get("name", ""),
            "reasoning": (r["parsedResponse"]["diagnosis_candidates"] or [{}])[0].get("reasoning", ""),
            "latencyMs": r.get("latencyMs", 0),
        }
        for r in valid
    ]

    headline = urgency_info["headline"]
    if weak_advice:
        headline += " (AI 일부가 진료 권고)"

    # 규칙 기반 자연어 요약 (LLM 추가 호출 없이 즉시 생성)
    narrative = _build_narrative_summary(
        urgency_info=urgency_info,
        model_scores=model_scores,
        top_diagnoses=top_diagnoses,
        consensus_type=consensus_type,
        red_flags=red_flags,
        should_visit=should_visit,
        weak_advice=weak_advice,
    )

    return {
        "modelScores": model_scores,
        "consolidatedUrgency": round(consolidated_urgency, 1),
        "urgency": urgency_info,
        "consolidatedDiagnoses": top_diagnoses,
        "consensusType": consensus_type,
        "redFlags": red_flags,
        "shouldVisitHospital": should_visit,
        "weakAdvice": weak_advice,
        "headlineMessage": headline,
        "modelRationales": model_rationales,
        "narrativeSummary": narrative,
    }


def _build_narrative_summary(
    urgency_info: dict,
    model_scores: dict,
    top_diagnoses: list,
    consensus_type: str,
    red_flags: list,
    should_visit: bool,
    weak_advice: bool,
) -> str:
    """
    규칙 기반 자연어 요약 (한 단락).
    LLM 추가 호출 없이 즉시 생성.
    """
    parts = []

    # 1. 등급 + 점수
    n_models = len(model_scores)
    parts.append(
        f"세 AI(총 {n_models}개 응답)의 분석을 종합한 결과, "
        f"위험도는 **{urgency_info['score']}/10**으로 "
        f"**{urgency_info['label']}** 수준입니다."
    )

    # 2. 모델 간 점수 편차 언급
    if model_scores and len(model_scores) >= 2:
        scores = list(model_scores.values())
        spread = max(scores) - min(scores)
        if spread >= 3.0:
            names = [n.split(" (")[0] for n in model_scores.keys()]
            parts.append(
                f"AI들의 의견이 다소 갈렸기에({'/'.join(names)} 편차 {spread:.1f}점) "
                f"안전을 위해 **가장 보수적인 점수**로 판정했습니다."
            )
        elif spread < 1.0:
            parts.append("세 AI의 의견이 **거의 일치**합니다.")

    # 3. 진단명
    if top_diagnoses:
        if consensus_type == "agreed" and top_diagnoses:
            top = top_diagnoses[0].get("name", "")
            if top:
                parts.append(f"의심되는 주된 원인은 **{top}**입니다.")
        else:
            names = [d.get("name", "") for d in top_diagnoses if d.get("name")]
            if names:
                parts.append(
                    f"AI마다 의심 진단이 달랐습니다 ({' / '.join(names[:3])}). "
                    f"한 가지로 단정하기 어려우니 수의사의 진료를 권장합니다."
                )

    # 4. red flags
    if red_flags:
        top_flags = red_flags[:3]
        parts.append(
            f"특히 **{', '.join(top_flags)}** 같은 증상이 있는지 잘 살펴봐주세요."
        )

    # 5. 병원 권고
    if urgency_info["level"] >= 5:
        parts.append("⚠️ **지금 즉시 24시간 응급 동물병원**으로 이동하세요.")
    elif urgency_info["level"] == 4:
        parts.append("🏥 **오늘 중으로 반드시** 동물병원을 방문하시기 바랍니다.")
    elif urgency_info["level"] == 3:
        parts.append("🏥 **가급적 내일 중**에 동물병원에 다녀오시길 권장합니다.")
    elif weak_advice:
        parts.append(
            "홈케어 수준이지만, 일부 AI가 진료를 권유했습니다. 시간이 된다면 진료를 고려해보세요."
        )
    else:
        parts.append("집에서 충분한 휴식과 수분 공급을 하며 경과를 관찰해주세요.")

    # 6. 최종 안전 문구
    parts.append("*본 결과는 참고용이며 수의학적 진단을 대체하지 않습니다.*")

    return " ".join(parts)
