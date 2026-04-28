'use client'

import { useRef, useEffect } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
  placeholder?: string
}

export default function SymptomInput({ value, onChange, onSubmit, disabled, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div
      className="flex items-end gap-3 rounded-xl px-4 py-3"
      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? '증상을 자유롭게 설명해주세요…'}
        rows={1}
        className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
        style={{ color: '#e8e8e8', minHeight: '24px' }}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
        style={{
          background: !disabled && value.trim() ? '#cc785c' : '#2a2a2a',
          color: !disabled && value.trim() ? '#fff' : '#444',
          cursor: !disabled && value.trim() ? 'pointer' : 'default',
        }}
      >
        ↑
      </button>
    </div>
  )
}
