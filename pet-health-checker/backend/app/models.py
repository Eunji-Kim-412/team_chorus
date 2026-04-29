from pydantic import BaseModel
from typing import Optional

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class DiagnoseRequest(BaseModel):
    pet_type: str  # "dog" or "cat"
    symptoms: str

class DiagnoseResult(BaseModel):
    model: str
    diagnosis: str
    error: Optional[str] = None

# ── 진단 요약 ────────────────────────────────────────────────────────────────
class DiagnosisInput(BaseModel):
    llm: str
    content: str

class DiagnoseSummaryRequest(BaseModel):
    diagnoses: list[DiagnosisInput]

# ── 멀티턴 문답 ───────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str      # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    llm: str       # 'claude', 'chatgpt', 'gemini'
    messages: list[ChatMessage]
    system_prompt: str
