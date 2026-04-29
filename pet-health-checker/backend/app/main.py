from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db_conn, init_db
from app.models import DiagnoseRequest
from app.llm import diagnose_all, summarize_results

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
