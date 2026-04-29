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
