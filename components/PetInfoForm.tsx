'use client'

import { useEffect, useMemo, useState } from 'react'

export type Pet = {
  id: string
  name: string
  species: 'dog' | 'cat' | 'other'
  breed: string
  age: { years: number; months: number }
  gender: 'male' | 'female'
  neutered: boolean
  weightKg: number
  medicalHistory: string[]
  medications: string[]
  foodType?: 'dry' | 'wet' | 'raw' | 'mixed'
  preferredFoodBrand?: string
  favoriteFoods: string[]
  allergies: string[]
  createdAt: string
  updatedAt: string
}

export type DailyLog = {
  petId: string
  date: string
  yesterdayFood?: string
  stoolType?: 'normal' | 'diarrhea' | 'constipation' | 'bloody'
  activityLevel?: 'normal' | 'decreased' | 'increased'
  notes?: string
}

export type PetContext = {
  pet: Pet
  dailyLog?: DailyLog
}

type Props = {
  onStart: (context: PetContext) => void
}

type FormState = {
  name: string
  species: Pet['species']
  breed: string
  ageYears: string
  ageMonths: string
  gender: Pet['gender']
  neutered: string
  weightKg: string
  medicalHistory: string
  medications: string
  foodType: '' | 'dry' | 'wet' | 'raw' | 'mixed'
  preferredFoodBrand: string
  favoriteFoods: string
  allergies: string
  yesterdayFood: string
  stoolType: '' | 'normal' | 'diarrhea' | 'constipation' | 'bloody'
  activityLevel: '' | 'normal' | 'decreased' | 'increased'
  notes: string
}

const PETS_STORAGE_KEY = 'team_chorus_f1_pets_v1'
const DAILY_LOG_STORAGE_KEY = 'team_chorus_f1_daily_logs_v1'

const initialForm: FormState = {
  name: '',
  species: 'dog',
  breed: '',
  ageYears: '',
  ageMonths: '0',
  gender: 'male',
  neutered: 'true',
  weightKg: '',
  medicalHistory: '',
  medications: '',
  foodType: '',
  preferredFoodBrand: '',
  favoriteFoods: '',
  allergies: '',
  yesterdayFood: '',
  stoolType: '',
  activityLevel: '',
  notes: '',
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildContext(form: FormState, existingId?: string): PetContext {
  const now = new Date().toISOString()
  const petId = existingId ?? `${Date.now()}`

  const pet: Pet = {
    id: petId,
    name: form.name.trim(),
    species: form.species,
    breed: form.breed.trim(),
    age: {
      years: Number(form.ageYears || '0'),
      months: Number(form.ageMonths || '0'),
    },
    gender: form.gender,
    neutered: form.neutered === 'true',
    weightKg: Number(form.weightKg || '0'),
    medicalHistory: parseList(form.medicalHistory),
    medications: parseList(form.medications),
    foodType: form.foodType || undefined,
    preferredFoodBrand: form.preferredFoodBrand.trim() || undefined,
    favoriteFoods: parseList(form.favoriteFoods),
    allergies: parseList(form.allergies),
    createdAt: now,
    updatedAt: now,
  }

  const hasDailyLog =
    form.yesterdayFood.trim() ||
    form.stoolType ||
    form.activityLevel ||
    form.notes.trim()

  const dailyLog: DailyLog | undefined = hasDailyLog
    ? {
        petId,
        date: now.slice(0, 10),
        yesterdayFood: form.yesterdayFood.trim() || undefined,
        stoolType: form.stoolType || undefined,
        activityLevel: form.activityLevel || undefined,
        notes: form.notes.trim() || undefined,
      }
    : undefined

  return { pet, dailyLog }
}

export default function PetInfoForm({ onStart }: Props) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [savedPets, setSavedPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PETS_STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as Pet[]) : []
      setSavedPets(parsed)
      if (parsed.length > 0) setSelectedPetId(parsed[0].id)
    } catch {
      setSavedPets([])
    }
  }, [])

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.breed.trim().length > 0 &&
      form.ageYears.trim().length > 0 &&
      form.weightKg.trim().length > 0
    )
  }, [form])

  const saveContext = (context: PetContext) => {
    const updatedPet = context.pet
    setSavedPets((prev) => {
      const next = prev.some((pet) => pet.id === updatedPet.id)
        ? prev.map((pet) =>
            pet.id === updatedPet.id ? { ...updatedPet, createdAt: pet.createdAt } : pet,
          )
        : [updatedPet, ...prev]
      localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(next))
      return next
    })

    if (context.dailyLog) {
      try {
        const raw = localStorage.getItem(DAILY_LOG_STORAGE_KEY)
        const logs = raw ? (JSON.parse(raw) as DailyLog[]) : []
        const nextLogs = [context.dailyLog, ...logs.filter((log) => log.petId !== context.dailyLog?.petId)]
        localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify(nextLogs))
      } catch {
        localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify([context.dailyLog]))
      }
    }
  }

  const loadSelectedPet = () => {
    const pet = savedPets.find((item) => item.id === selectedPetId)
    if (!pet) return
    setForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageYears: String(pet.age.years),
      ageMonths: String(pet.age.months),
      gender: pet.gender,
      neutered: String(pet.neutered),
      weightKg: String(pet.weightKg),
      medicalHistory: pet.medicalHistory.join(', '),
      medications: pet.medications.join(', '),
      foodType: pet.foodType ?? '',
      preferredFoodBrand: pet.preferredFoodBrand ?? '',
      favoriteFoods: pet.favoriteFoods.join(', '),
      allergies: pet.allergies.join(', '),
      yesterdayFood: '',
      stoolType: '',
      activityLevel: '',
      notes: '',
    })
  }

  const handleRun = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    const context = buildContext(form, selectedPetId || undefined)
    saveContext(context)
    onStart(context)
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#080808', color: '#e8e8e8' }}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-semibold">F1 · 펫 정보 등록</h1>
          <p style={{ color: '#888' }}>애견 정보를 입력하고 Run을 누르면 F2로 이동합니다.</p>
        </div>

        <div className="mb-5 rounded-xl border p-4" style={{ borderColor: '#2a2a2a', background: '#111' }}>
          <p className="mb-2 text-sm" style={{ color: '#bdbdbd' }}>기존 펫 불러오기</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
            >
              <option value="">새 펫 등록</option>
              {savedPets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} · {pet.breed}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadSelectedPet}
              disabled={!selectedPetId}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: '#2a2a2a', background: selectedPetId ? '#1a1a1a' : '#141414', color: '#d8d8d8' }}
            >
              선택 정보 불러오기
            </button>
          </div>
        </div>

        <form onSubmit={handleRun} className="space-y-6">
          <section className="rounded-xl border p-4" style={{ borderColor: '#2a2a2a', background: '#111' }}>
            <h2 className="mb-4 text-lg font-medium">기본 정보 (필수)</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input placeholder="이름 *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <select value={form.species} onChange={(e) => setForm((p) => ({ ...p, species: e.target.value as Pet['species'] }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
                <option value="other">기타</option>
              </select>
              <input placeholder="품종 * (예: 요크셔테리어)" value={form.breed} onChange={(e) => setForm((p) => ({ ...p, breed: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" placeholder="나이(년) *" value={form.ageYears} onChange={(e) => setForm((p) => ({ ...p, ageYears: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
                <input type="number" min="0" max="11" placeholder="개월" value={form.ageMonths} onChange={(e) => setForm((p) => ({ ...p, ageMonths: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              </div>
              <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as Pet['gender'] }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="male">수컷</option>
                <option value="female">암컷</option>
              </select>
              <select value={form.neutered} onChange={(e) => setForm((p) => ({ ...p, neutered: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="true">중성화 함</option>
                <option value="false">중성화 안 함</option>
              </select>
              <input type="number" step="0.1" min="0" placeholder="몸무게(kg) *" value={form.weightKg} onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))} className="rounded-md border px-3 py-2 md:col-span-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
            </div>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: '#2a2a2a', background: '#111' }}>
            <h2 className="mb-4 text-lg font-medium">건강/식이 정보 (선택)</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input placeholder="병력 (쉼표로 구분)" value={form.medicalHistory} onChange={(e) => setForm((p) => ({ ...p, medicalHistory: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <input placeholder="상시 복용 약물 (쉼표로 구분)" value={form.medications} onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <select value={form.foodType} onChange={(e) => setForm((p) => ({ ...p, foodType: e.target.value as FormState['foodType'] }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="">사료 종류 선택</option>
                <option value="dry">건식</option>
                <option value="wet">습식</option>
                <option value="raw">생식</option>
                <option value="mixed">혼합</option>
              </select>
              <input placeholder="자주 먹는 사료 브랜드" value={form.preferredFoodBrand} onChange={(e) => setForm((p) => ({ ...p, preferredFoodBrand: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <input placeholder="좋아하는 음식 (쉼표로 구분)" value={form.favoriteFoods} onChange={(e) => setForm((p) => ({ ...p, favoriteFoods: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <input placeholder="알레르기 (쉼표로 구분)" value={form.allergies} onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
            </div>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: '#2a2a2a', background: '#111' }}>
            <h2 className="mb-4 text-lg font-medium">일일 컨디션 (선택)</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input placeholder="전날 먹은 음식" value={form.yesterdayFood} onChange={(e) => setForm((p) => ({ ...p, yesterdayFood: e.target.value }))} className="rounded-md border px-3 py-2 md:col-span-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
              <select value={form.stoolType} onChange={(e) => setForm((p) => ({ ...p, stoolType: e.target.value as FormState['stoolType'] }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="">용변 형태</option>
                <option value="normal">정상</option>
                <option value="diarrhea">설사</option>
                <option value="constipation">변비</option>
                <option value="bloody">혈변</option>
              </select>
              <select value={form.activityLevel} onChange={(e) => setForm((p) => ({ ...p, activityLevel: e.target.value as FormState['activityLevel'] }))} className="rounded-md border px-3 py-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                <option value="">활동량</option>
                <option value="normal">평소대로</option>
                <option value="decreased">줄어듦</option>
                <option value="increased">늘어남</option>
              </select>
              <textarea placeholder="자유 메모" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="min-h-24 rounded-md border px-3 py-2 md:col-span-2" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }} />
            </div>
          </section>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg py-3 text-base font-semibold"
            style={{
              background: isValid ? '#cc785c' : '#1a1a1a',
              color: isValid ? '#fff' : '#666',
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}
          >
            Run (이 정보로 시작)
          </button>
        </form>
      </div>
    </div>
  )
}
