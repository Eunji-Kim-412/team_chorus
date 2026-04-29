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

class HomecareRequest(BaseModel):
    pet_type: str
    breed: Optional[str] = ""
    age_years: Optional[int] = 0
    medical_history: Optional[list[str]] = []
    diagnosis_name: str
    urgency_score: float
