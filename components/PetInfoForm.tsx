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
const SURFACE_BG = '#0a0a0a'
const INPUT_BG = '#1a1a1a'
const BORDER_COLOR = '#2a2a2a'
const TEXT_MUTED = '#888'
const TEXT_DIM = '#555'
const PRESET_PET_NAMES = ['뽀삐', '초코', '설탕이']

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
  const [typedPetName, setTypedPetName] = useState('')

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

  const petNameOptions = useMemo(() => {
    const fromStorage = savedPets.map((pet) => pet.name).filter(Boolean)
    return Array.from(new Set([...PRESET_PET_NAMES, ...fromStorage]))
  }, [savedPets])

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
    const pet = savedPets.find((item) => item.id === selectedPetId || item.name === selectedPetId)
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

  const resetToNewPet = () => {
    setSelectedPetId('')
    setForm(initialForm)
  }

  const handleRun = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    const context = buildContext(form, selectedPetId || undefined)
    saveContext(context)
    onStart(context)
  }

  const fieldClassName =
    'w-full rounded-xl border border-white/10 bg-black/35 px-4 py-2.5 text-xs text-gray-100 placeholder:text-gray-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/60'
  const cardClassName =
    'rounded-2xl border border-white/10 bg-[#17171c]/90 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur-sm md:p-6'

  return (
    <div className="min-h-screen bg-[#0F0F13] px-4 py-10 text-gray-200">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 rounded-2xl border border-white/10 bg-[#141419]/85 p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">🐾 PawSori</h1>
          <p className="mx-auto max-w-3xl break-keep text-xs leading-relaxed text-gray-400 md:text-sm">
            반려동물 보호자가 이상 증상을 자연어로 설명하면, 3개의 LLM(GPT, Gemini, Claude)이 동시에 판단하고
            <br />
            그 결과를 통합하여 위험도 점수(1.0–10.0)와 행동 가이드를 제공하는 웹 기반 트리아지 서비스.
          </p>
        </div>

        <div className={`${cardClassName} mb-6`}>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={selectedPetId}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedPetId(value)
                  const matchingPet = savedPets.find((pet) => pet.name === value || pet.id === value)
                  if (matchingPet) setSelectedPetId(matchingPet.id)
                }}
                className={fieldClassName}
              >
                <option value="">기존 펫 불러오기</option>
                {petNameOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetToNewPet}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 transition hover:bg-white/10"
              >
                새 펫 정보 등록하기
              </button>
            </div>

            <p className="text-[11px] font-medium text-gray-400">나의 LLM에서 펫 정보 불러오기</p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                GPT에서 불러오기
              </button>
              <button
                type="button"
                className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
              >
                Gemini에서 불러오기
              </button>
              <button
                type="button"
                className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-2.5 text-xs font-medium text-orange-300 transition hover:bg-orange-500/20"
              >
                Claude에서 불러오기
              </button>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-400">불러올 펫 이름 입력하기 :</p>
              <input
                type="text"
                value={typedPetName}
                onChange={(e) => setTypedPetName(e.target.value)}
                placeholder="예) 뽀삐"
                className={fieldClassName}
              />
            </div>

            <button
              type="button"
              onClick={loadSelectedPet}
              disabled={!selectedPetId}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              선택한 기존 펫 정보 적용
            </button>
          </div>
        </div>

        <form onSubmit={handleRun} className="space-y-6">
          <section className={`${cardClassName} ring-1 ring-orange-500/10`}>
            <h2 className="mb-4 text-sm font-semibold text-white">기본 정보 (필수)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                placeholder="이름 *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={fieldClassName}
              />
              <select
                value={form.species}
                onChange={(e) => setForm((p) => ({ ...p, species: e.target.value as Pet['species'] }))}
                className={fieldClassName}
              >
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
                <option value="other">기타</option>
              </select>
              <input
                placeholder="품종 * (예: 요크셔테리어)"
                value={form.breed}
                onChange={(e) => setForm((p) => ({ ...p, breed: e.target.value }))}
                className={fieldClassName}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="나이(년) *"
                  value={form.ageYears}
                  onChange={(e) => setForm((p) => ({ ...p, ageYears: e.target.value }))}
                  className={fieldClassName}
                />
                <input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="개월"
                  value={form.ageMonths}
                  onChange={(e) => setForm((p) => ({ ...p, ageMonths: e.target.value }))}
                  className={fieldClassName}
                />
              </div>
              <select
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as Pet['gender'] }))}
                className={fieldClassName}
              >
                <option value="male">수컷</option>
                <option value="female">암컷</option>
              </select>
              <select
                value={form.neutered}
                onChange={(e) => setForm((p) => ({ ...p, neutered: e.target.value }))}
                className={fieldClassName}
              >
                <option value="true">중성화 함</option>
                <option value="false">중성화 안 함</option>
              </select>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="몸무게(kg) *"
                value={form.weightKg}
                onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
                className={`${fieldClassName} md:col-span-2`}
              />
            </div>
          </section>

          <section className={`${cardClassName} ring-1 ring-emerald-500/10`}>
            <h2 className="mb-4 text-sm font-semibold text-white">건강/식이 정보 (선택)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                placeholder="병력 (쉼표로 구분)"
                value={form.medicalHistory}
                onChange={(e) => setForm((p) => ({ ...p, medicalHistory: e.target.value }))}
                className={fieldClassName}
              />
              <input
                placeholder="상시 복용 약물 (쉼표로 구분)"
                value={form.medications}
                onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))}
                className={fieldClassName}
              />
              <select
                value={form.foodType}
                onChange={(e) => setForm((p) => ({ ...p, foodType: e.target.value as FormState['foodType'] }))}
                className={fieldClassName}
              >
                <option value="">사료 종류 선택</option>
                <option value="dry">건식</option>
                <option value="wet">습식</option>
                <option value="raw">생식</option>
                <option value="mixed">혼합</option>
              </select>
              <input
                placeholder="자주 먹는 사료 브랜드"
                value={form.preferredFoodBrand}
                onChange={(e) => setForm((p) => ({ ...p, preferredFoodBrand: e.target.value }))}
                className={fieldClassName}
              />
              <input
                placeholder="좋아하는 음식 (쉼표로 구분)"
                value={form.favoriteFoods}
                onChange={(e) => setForm((p) => ({ ...p, favoriteFoods: e.target.value }))}
                className={fieldClassName}
              />
              <input
                placeholder="알레르기 (쉼표로 구분)"
                value={form.allergies}
                onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))}
                className={fieldClassName}
              />
            </div>
          </section>

          <section className={`${cardClassName} ring-1 ring-indigo-500/10`}>
            <h2 className="mb-4 text-sm font-semibold text-white">일일 컨디션 (선택)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                placeholder="전날 먹은 음식"
                value={form.yesterdayFood}
                onChange={(e) => setForm((p) => ({ ...p, yesterdayFood: e.target.value }))}
                className={`${fieldClassName} md:col-span-2`}
              />
              <select
                value={form.stoolType}
                onChange={(e) => setForm((p) => ({ ...p, stoolType: e.target.value as FormState['stoolType'] }))}
                className={fieldClassName}
              >
                <option value="">용변 형태</option>
                <option value="normal">정상</option>
                <option value="diarrhea">설사</option>
                <option value="constipation">변비</option>
                <option value="bloody">혈변</option>
              </select>
              <select
                value={form.activityLevel}
                onChange={(e) => setForm((p) => ({ ...p, activityLevel: e.target.value as FormState['activityLevel'] }))}
                className={fieldClassName}
              >
                <option value="">활동량</option>
                <option value="normal">평소대로</option>
                <option value="decreased">줄어듦</option>
                <option value="increased">늘어남</option>
              </select>
              <textarea
                placeholder="자유 메모"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className={`${fieldClassName} min-h-28 md:col-span-2`}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-2xl border border-violet-400/40 bg-violet-500/90 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition duration-200 hover:-translate-y-1 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            펫정보 등록하고, 증상 입력하기
          </button>
        </form>
      </div>
    </div>
  )
}
