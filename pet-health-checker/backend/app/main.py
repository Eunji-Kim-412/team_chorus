from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db_conn, init_db
from app.models import DiagnoseRequest, ChatRequest, DiagnoseSummaryRequest
from app.llm import diagnose_all, summarize_results, chat_claude, chat_gpt, chat_gemini

app = FastAPI(title="Pet Health Checker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    init_db()

@app.post("/api/diagnose")
async def diagnose(req: DiagnoseRequest):
    results = await diagnose_all(req.pet_type, req.symptoms)
    summary_data = await summarize_results(req.pet_type, req.symptoms, results)
    r_map = {r["model"]: r for r in results}
    db = get_db_conn()
    try:
        db.execute(
            "INSERT INTO consultations (user_id, pet_type, symptoms, result_claude, result_gpt, result_gemini) VALUES (?,?,?,?,?,?)",
            (1, req.pet_type, req.symptoms,
             r_map.get("Claude (Bedrock)", {}).get("diagnosis", ""),
             r_map.get("GPT (OpenAI)", {}).get("diagnosis", ""),
             r_map.get("Gemini (Google)", {}).get("diagnosis", "")),
        )
        db.commit()
    finally:
        db.close()
    return {"results": results, "summary": summary_data["summary"], "needs_hospital": summary_data["needs_hospital"]}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    try:
        if req.llm == "claude":
            content = await chat_claude(messages, req.system_prompt)
        elif req.llm == "chatgpt":
            content = await chat_gpt(messages, req.system_prompt)
        elif req.llm == "gemini":
            content = await chat_gemini(messages, req.system_prompt)
        else:
            return {"content": f"⚠️ 알 수 없는 모델: {req.llm}"}
        return {"content": content}
    except Exception as e:
        return {"content": f"⚠️ 오류가 발생했습니다: {str(e)}"}


@app.post("/api/diagnose-summary")
async def diagnose_summary(req: DiagnoseSummaryRequest):
    import json, re
    from collections import Counter
    diagnoses = [{"llm": d.llm, "content": d.content} for d in req.diagnoses]
    valid = [d for d in diagnoses if d["content"]]

    def extract_cause(content: str) -> str:
        """진단 내용에서 가장 유력한 원인 추출"""
        m = re.search(r'\*\*가장 유력한 원인\*\*[:\s]*([^\n*]+)', content)
        if m:
            cause = m.group(1).strip()
            # 괄호 안 영어 제거하고 50자 이내로
            cause = re.sub(r'\s*\([^)]*\)', '', cause).strip()
            return cause[:50]
        # fallback: 첫 줄에서 추출
        first = content.strip().split('\n')[0]
        return re.sub(r'\*+', '', first).strip()[:50]

    def extract_risk(content: str) -> str:
        m = re.search(r'\*\*위험도\*\*[:\s]*(낮음|중간|높음)', content)
        if m:
            return {"낮음": "low", "중간": "medium", "높음": "high"}.get(m.group(1), "medium")
        return "medium"

    def smart_fallback():
        per_llm = [{"llm": d["llm"], "cause": extract_cause(d["content"])} for d in valid]
        causes = [p["cause"] for p in per_llm]
        risks = [extract_risk(d["content"]) for d in valid]
        risk_level = Counter(risks).most_common(1)[0][0] if risks else "medium"

        # 공통 원인 판별: 앞 4글자 기준으로 동일 여부 체크
        prefixes = [c[:4] for c in causes if c]
        most_common_prefix = Counter(prefixes).most_common(1)
        if most_common_prefix and most_common_prefix[0][1] == len(valid):
            agreement, top_cause = "all", causes[0]
        elif most_common_prefix and most_common_prefix[0][1] >= 2:
            agreement = "most"
            top_cause = next((c for c in causes if c.startswith(most_common_prefix[0][0])), None)
        else:
            agreement, top_cause = "split", None

        return {"topCause": top_cause, "agreement": agreement, "riskLevel": risk_level, "perLlm": per_llm}

    if not valid:
        return {"topCause": None, "agreement": "split", "riskLevel": None, "perLlm": []}

    diagnosis_text = "\n\n---\n\n".join([f"[{d['llm']}]\n{d['content']}" for d in valid])
    prompt = f"""다음은 AI 수의 전문가들이 동일한 반려동물 증상에 대해 내린 진단이에요.

{diagnosis_text}

각 AI의 핵심 원인 진단을 1줄로 요약하고, 공통 원인과 위험도를 파악해주세요.

반드시 아래 JSON 형식으로만 답변하세요:
{{
  "topCause": "공통으로 가장 많이 지목된 원인 (없으면 null)",
  "agreement": "all 또는 most 또는 split",
  "riskLevel": "low 또는 medium 또는 high (파악 불가면 null)",
  "perLlm": [
    {{ "llm": "AI이름", "cause": "핵심 원인 1줄 요약" }}
  ]
}}

규칙:
- agreement: all=모두 같은 원인, most=3개 이상 같은 원인, split=의견 분분
- topCause: agreement가 split이면 null
- perLlm의 cause는 최대 50자, 명사형으로
- 한국어로"""

    try:
        text = await chat_claude([{"role": "user", "content": prompt}], "당신은 수의학 AI 분석가입니다.")
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(text)
        return result
    except Exception:
        return smart_fallback()


@app.get("/api/history")
def history():
    db = get_db_conn()
    try:
        rows = db.execute(
            "SELECT id, pet_type, symptoms, result_claude, result_gpt, result_gemini, created_at FROM consultations ORDER BY created_at DESC"
        ).fetchall()
        return {"history": [dict(r) for r in rows]}
    finally:
        db.close()
