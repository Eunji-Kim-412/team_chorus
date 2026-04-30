from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db_conn, init_db
from app.models import DiagnoseRequest, ChatMessage, PetContext
from app.llm import (
    diagnose_all,
    consolidate_results,
    chat_parallel,
    chat_single,
    chat_turn,
    CHAT_SYSTEM_PROMPT,
)

app = FastAPI(title="Pet Health Checker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ======================================================
# F2 멀티턴 대화 엔드포인트
# ======================================================

class ChatInitialRequest(BaseModel):
    """첫 증상 메시지로 3개 LLM 동시 응답 요청."""
    pet_context: Optional[PetContext] = None
    first_message: str  # 사용자의 첫 증상 입력


class ChatStepRequest(BaseModel):
    """선택된 LLM과 1턴 대화 요청."""
    model_name: str  # "Claude (Bedrock)" 등
    messages: List[ChatMessage]  # user 메시지까지 포함된 대화 이력
    pet_context: Optional[PetContext] = None


class LlmPanelState(BaseModel):
    """각 LLM 패널의 현재 대화 이력."""
    messages: List[ChatMessage] = []


class ChatTurnRequest(BaseModel):
    """선택된 여러 LLM에게 동시에 한 턴 대화 진행."""
    target_models: List[str]   # 선택된 LLM 리스트
    user_text: str              # 이번 턴 사용자 입력
    llms_state: dict            # 각 LLM의 현재 대화 { "Claude (Bedrock)": {"messages": [...]}, ... }
    pet_context: Optional[PetContext] = None


@app.post("/api/chat/initial")
async def chat_initial(req: ChatInitialRequest):
    """첫 증상에 대해 3개 LLM이 동시에 응답 생성."""
    pet_context_dict = req.pet_context.model_dump() if req.pet_context else None
    messages = [{"role": "user", "content": req.first_message}]
    responses = await chat_parallel(CHAT_SYSTEM_PROMPT, messages, pet_context_dict)
    return {"responses": responses}


@app.post("/api/chat/step")
async def chat_step(req: ChatStepRequest):
    """선택된 LLM과 대화 계속."""
    pet_context_dict = req.pet_context.model_dump() if req.pet_context else None
    messages = [m.model_dump(include={"role", "content"}) for m in req.messages]
    response = await chat_single(
        req.model_name,
        CHAT_SYSTEM_PROMPT,
        messages,
        pet_context_dict,
    )
    return {"response": response}


@app.post("/api/chat/turn")
async def chat_turn_endpoint(req: ChatTurnRequest):
    """
    4개 패널 스타일 F2: 선택된 LLM들에게만 동시 호출.
    각 LLM은 자기 대화 + 다른 LLM들의 crossContext 를 받음.
    """
    pet_context_dict = req.pet_context.model_dump() if req.pet_context else None

    # llms_state를 정규화 (Pydantic → dict)
    # 입력: { "Claude (Bedrock)": {"messages": [{role, content, ...}]} }
    state = {}
    for model_name, panel in req.llms_state.items():
        msgs_raw = panel.get("messages", []) if isinstance(panel, dict) else []
        state[model_name] = {
            "messages": [
                {"role": m.get("role"), "content": m.get("content", "")}
                for m in msgs_raw
            ]
        }

    responses = await chat_turn(
        target_models=req.target_models,
        user_text=req.user_text,
        llms_state=state,
        pet_context=pet_context_dict,
    )
    return {"responses": responses}


# ======================================================
# F2 최종 진단 + F3 통합
# ======================================================

@app.post("/api/diagnose")
async def diagnose(req: DiagnoseRequest):
    # 펫 컨텍스트에서 species를 꺼내 pet_type 보정
    pet_type = req.pet_type
    pet_id = None
    pet_context_json = None
    if req.pet_context:
        pet_type = req.pet_context.pet.species
        pet_id = req.pet_context.pet.id
        pet_context_json = req.pet_context.model_dump_json()

    msgs = [m.model_dump() for m in req.messages] if req.messages else None
    pet_context_dict = req.pet_context.model_dump() if req.pet_context else None

    # F2 최종 단계: 3개 LLM 독립 진단
    f2_result = await diagnose_all(
        pet_type=pet_type,
        symptoms=req.symptoms,
        messages=msgs,
        pet_context=pet_context_dict,
    )
    llm_responses = f2_result["llmResponses"]

    # F3: 통합
    f3_result = consolidate_results(llm_responses)

    # DB 기록
    def _raw_for(prefix: str) -> str:
        for r in llm_responses:
            if r["modelName"].startswith(prefix):
                return r.get("rawResponse") or ""
        return ""

    db = get_db_conn()
    try:
        db.execute(
            """
            INSERT INTO consultations
            (user_id, pet_type, symptoms, pet_id, pet_context_json,
             result_claude, result_gpt, result_gemini)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                1, pet_type, req.symptoms, pet_id, pet_context_json,
                _raw_for("Claude"), _raw_for("GPT"), _raw_for("Gemini"),
            ),
        )
        db.commit()
    finally:
        db.close()

    return {
        "llmResponses": llm_responses,
        "totalLatencyMs": f2_result["totalLatencyMs"],
        "consolidated": f3_result,
    }


@app.get("/api/history")
def history():
    db = get_db_conn()
    try:
        rows = db.execute(
            """
            SELECT id, pet_type, symptoms, pet_id, pet_context_json,
                   result_claude, result_gpt, result_gemini, created_at
            FROM consultations ORDER BY created_at DESC
            """
        ).fetchall()
        return {"history": [dict(r) for r in rows]}
    finally:
        db.close()
