'use client'

import { useState } from 'react'

export type PetInfo = {
  name: string
  species: string
  age: string
  weight: string
}

type Props = {
  onSubmit: (info: PetInfo) => void
}

const SPECIES_OPTIONS = ['강아지', '고양이', '토끼', '햄스터', '기타']

export default function PetInfoForm({ onSubmit }: Props) {
  const [info, setInfo] = useState<PetInfo>({
    name: '',
    species: '강아지',
    age: '',
    weight: '',
  })

  const isValid = info.name.trim() && info.species && info.age.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) onSubmit(info)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
      <div className="w-full max-w-md">

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: '#e8e8e8' }}>
            PawSori
          </h1>
          <p className="text-sm" style={{ color: '#555' }}>
            여러 AI 전문가에게 동시에 물어보세요
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Species */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#888' }}>반려동물 종류</label>
            <div className="flex gap-2 flex-wrap">
              {SPECIES_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInfo(p => ({ ...p, species: s }))}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer"
                  style={{
                    background: info.species === s ? '#cc785c22' : '#1a1a1a',
                    color: info.species === s ? '#cc785c' : '#555',
                    border: `1px solid ${info.species === s ? '#cc785c55' : '#2a2a2a'}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#888' }}>이름</label>
            <input
              type="text"
              placeholder="예) 콩이"
              value={info.name}
              onChange={e => setInfo(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{
                background: '#1a1a1a',
                color: '#e8e8e8',
                border: '1px solid #2a2a2a',
              }}
            />
          </div>

          {/* Age + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888' }}>나이</label>
              <input
                type="text"
                placeholder="예) 3살"
                value={info.age}
                onChange={e => setInfo(p => ({ ...p, age: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: '#1a1a1a',
                  color: '#e8e8e8',
                  border: '1px solid #2a2a2a',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888' }}>체중 (선택)</label>
              <input
                type="text"
                placeholder="예) 5kg"
                value={info.weight}
                onChange={e => setInfo(p => ({ ...p, weight: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: '#1a1a1a',
                  color: '#e8e8e8',
                  border: '1px solid #2a2a2a',
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all mt-2"
            style={{
              background: isValid ? '#cc785c' : '#1a1a1a',
              color: isValid ? '#fff' : '#333',
              cursor: isValid ? 'pointer' : 'default',
            }}
          >
            증상 설명하기 →
          </button>
        </form>
      </div>
    </div>
  )
}
