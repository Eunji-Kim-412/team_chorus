from pydantic import BaseModel
from typing import Optional, Literal, List


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ===== F1: 펫 정보 모델 =====

class PetAge(BaseModel):
    years: int = 0
    months: int = 0


class Pet(BaseModel):
    id: str
    name: str
    species: Literal["dog", "cat", "other"]
    breed: str
    age: PetAge
    gender: Literal["male", "female"]
    neutered: bool
    weightKg: float
    medicalHistory: list[str] = []
    medications: list[str] = []
    foodType: Optional[Literal["dry", "wet", "raw", "mixed"]] = None
    preferredFoodBrand: Optional[str] = None
    favoriteFoods: list[str] = []
    allergies: list[str] = []
    createdAt: str
    updatedAt: str


class DailyLog(BaseModel):
    petId: str
    date: str
    yesterdayFood: Optional[str] = None
    stoolType: Optional[Literal["normal", "diarrhea", "constipation", "bloody"]] = None
    activityLevel: Optional[Literal["normal", "decreased", "increased"]] = None
    notes: Optional[str] = None


class PetContext(BaseModel):
    pet: Pet
    dailyLog: Optional[DailyLog] = None


# ===== F2: 채팅 메시지 =====

class ChatMessage(BaseModel):
    role: str  # "user" | "system" | "assistant"
    content: str
    timestamp: Optional[str] = None


# ===== 진단 요청/응답 =====

class DiagnoseRequest(BaseModel):
    pet_type: str  # "dog" | "cat" | "other"
    symptoms: str
    messages: Optional[List[ChatMessage]] = None  # F2 채팅 대화 이력
    pet_context: Optional[PetContext] = None     # F1 펫 정보 컨텍스트


class DiagnoseResult(BaseModel):
    model: str
    diagnosis: str
    error: Optional[str] = None
