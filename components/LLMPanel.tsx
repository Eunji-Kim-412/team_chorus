'use client'

import { useEffect, useRef } from 'react'

export type Message = { role: 'user' | 'assistant'; content: string }

type LLMConfig = {
  name: string
  color: string
  bgColor: string
  borderColor: string
}

export const LLM_CONFIGS: Record<string, LLMConfig> = {
  claude:  { name: 'Claude',  color: '#cc785c', bgColor: '#1f1510', borderColor: '#3d2418' },
  chatgpt: { name: 'ChatGPT', color: '#74aa84', bgColor: '#0f1f14', borderColor: '#1a3522' },
  gemini:  { name: 'Gemini',  color: '#8ab4f8', bgColor: '#0f1629', borderColor: '#1a2a4a' },
  llama:   { name: 'Llama',   color: '#a78bfa', bgColor: '#150f29', borderColor: '#2a1a4a' },
}

type Props = {
  llmId: string
  messages: Message[]
  loading: boolean
  selected: boolean
  onToggleSelect: () => void
  step: 'symptom-qa' | 'diagnosis'
  showShared?: boolean
}

export default function LLMPanel({ llmId, messages, loading, selected, onToggleSelect, step, showShared }: Props) {
  const config = LLM_CONFIGS[llmId]
  const bottomRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0 && !loading

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: config.bgColor,
        border: `1px solid ${selected ? config.color : config.borderColor}`,
        boxShadow: selected ? `0 0 0 1px ${config.color}44` : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${config.borderColor}` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
        <span className="text-sm font-semibold" style={{ color: config.color }}>
          {config.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {showShared && (
            <span
              className="text-xs"
              style={{ color: config.color, opacity: 0.85 }}
            >
              ↗ 공유됨
            </span>
          )}
          {step === 'diagnosis' && messages.some(m => m.role === 'assistant') && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: config.color + '22', color: config.color, border: `1px solid ${config.color}44` }}
            >
              진단 완료
            </span>
          )}
          {step === 'symptom-qa' && (
            <button
              onClick={onToggleSelect}
              className="text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium"
              style={{
                background: selected ? config.color : '#2a2a2a',
                color: selected ? '#fff' : '#666',
                border: `1px solid ${selected ? config.color : '#3a3a3a'}`,
              }}
            >
              {selected ? '✓ 답변할게요' : '답변하기'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto p-4 space-y-3" style={{ height: '340px' }}>
        {isEmpty && (
          <p className="text-xs text-center mt-8" style={{ color: '#333' }}>
            {step === 'symptom-qa' ? '증상을 입력하면 질문드릴게요' : '진단 중…'}
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed"
              style={{
                background: msg.role === 'user' ? '#2a2a2a' : config.bgColor,
                color: msg.role === 'user' ? '#ccc' : '#e0e0e0',
                border: msg.role === 'assistant' ? `1px solid ${config.borderColor}` : 'none',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-4 py-3 flex gap-1 items-center"
              style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
            >
              <span className="loading-dot w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
              <span className="loading-dot w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
              <span className="loading-dot w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
