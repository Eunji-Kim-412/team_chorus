from pydantic import BaseModel
from typing import Optional, Literal

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

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

class DiagnoseRequest(BaseModel):
    pet_type: str  # "dog" | "cat" | "other"
    symptoms: str
    pet_context: Optional[PetContext] = None

class DiagnoseResult(BaseModel):
    model: str
    diagnosis: str
    error: Optional[str] = None
