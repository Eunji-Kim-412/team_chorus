'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import LLMPanel, { type Message, LLM_CONFIGS } from '@/components/LLMPanel'
import SymptomInput from '@/components/SymptomInput'
import SummaryPanel from '@/components/SummaryPanel'
import DiagnosisPanel from '@/components/DiagnosisPanel'
import Sidebar from '@/components/Sidebar'
import type { SummaryResult } from '@/app/api/summarize/route'
import type { DiagnosisSummary } from '@/app/api/diagnose-summary/route'

// ── 타입 ─────────────────────────────────────────────────────────────────────
const LLM_IDS = ['claude', 'chatgpt', 'gemini', 'llama'] as const
type LLMId = typeof LLM_IDS[number]
type Step = 'symptom-qa' | 'diagnosis'

type LLMState = { messages: Message[]; loading: boolean }

type Conversation = {
  id: string
  title: string
  date: string
  llms: Record<LLMId, LLMState>
  step: Step
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
const initialLlmState = (): Record<LLMId, LLMState> => ({
  claude:  { messages: [], loading: false },
  chatgpt: { messages: [], loading: false },
  gemini:  { messages: [], loading: false },
  llama:   { messages: [], loading: false },
})

const initialSelected = (): Record<LLMId, boolean> => ({
  claude: false, chatgpt: false, gemini: false, llama: false,
})

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function makeTitle(text: string): string {
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

// ── 시스템 프롬프트 ───────────────────────────────────────────────────────────
function buildSystemPrompt(step: Step, crossContext: string, exchangeCount = 0): string {
  const crossBlock = crossContext
    ? `\n[다른 AI가 이미 보호자에게 확인한 정보 — 아래 내용은 절대 다시 묻지 마세요]\n${crossContext}\n`
    : ''

  if (step === 'symptom-qa') {
    // 3번 이상 질문했으면 마무리
    if (exchangeCount >= 3) {
      return `당신은 경험 많은 수의 전문가입니다.${crossBlock}
지금까지 충분히 대화했습니다. 더 이상 질문하지 마세요.
보호자의 마지막 답변을 듣고, 지금까지 파악한 내용을 1~2줄로 간단히 정리한 후
"다른 AI와도 이야기해보시거나, 이제 진단을 받아보셔도 좋을 것 같아요." 라고 마무리하세요.
한국어로 답변하세요.`
    }

    return `당신은 경험 많은 수의 전문가입니다.${crossBlock}
보호자가 증상을 설명하면, 아직 확인되지 않은 정보만 1~2개 질문하세요.
- 위 [다른 AI가 이미 확인한 정보]에 있는 내용은 절대 다시 묻지 마세요
- 아직 진단하지 마세요
- 질문은 짧고 명확하게, 한국어로 답변하세요`
  }

  return `당신은 경험 많은 수의 전문가입니다.${crossBlock}
지금까지의 대화를 바탕으로 진단해주세요.

**가장 유력한 원인**: (1가지만, 가장 확률 높은 것)
**판단 이유**: (왜 그렇게 판단했는지 2~3줄)
**위험도**: 낮음 / 중간 / 높음
**즉시 조치**: (지금 당장 해야 할 것 1~2가지)
**병원 방문**: 필요 여부 + 이유

한국어로 간결하게 답변하세요.`
}

// ── 크로스 컨텍스트 빌더 ──────────────────────────────────────────────────────
// 전송 대상이 아닌 다른 LLM의 전체 대화 세션을 포맷해서 반환
function buildCrossContext(
  llms: Record<LLMId, LLMState>,
  excludeIds: LLMId[]
): string {
  const sections: string[] = []

  for (const id of LLM_IDS) {
    if (excludeIds.includes(id)) continue
    const msgs = llms[id].messages
    if (msgs.length === 0) continue

    const name = LLM_CONFIGS[id].name
    const transcript = msgs
      .map(m => {
        const speaker = m.role === 'user' ? '보호자' : name
        // 너무 긴 메시지는 100자로 자름
        const content = m.content.length > 100
          ? m.content.slice(0, 100).replace(/\n/g, ' ') + '…'
          : m.content.replace(/\n/g, ' ')
        return `${speaker}: ${content}`
      })
      .join('\n')

    sections.push(`── ${name}와의 대화 ──\n${transcript}`)
  }

  return sections.join('\n\n')
}

// ── localStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pawsori_history_v1'

function loadHistory(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Conversation[] : []
  } catch { return [] }
}

function saveHistory(history: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)) } catch { /* noop */ }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>('symptom-qa')
  const [llms, setLlms] = useState<Record<LLMId, LLMState>>(initialLlmState())
  const [selected, setSelected] = useState<Record<LLMId, boolean>>(initialSelected())
  const [prompt, setPrompt] = useState('')
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [diagnosisSummary, setDiagnosisSummary] = useState<DiagnosisSummary | null>(null)
  const [diagnosisSummaryLoading, setDiagnosisSummaryLoading] = useState(false)
  const [sharedPanels, setSharedPanels] = useState<Record<LLMId, boolean>>({
    claude: false, chatgpt: false, gemini: false, llama: false,
  })
  const [history, setHistory] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string>(() => Date.now().toString())

  const isAnyLoading = LLM_IDS.some(id => llms[id].loading)
  const hasMessages = LLM_IDS.some(id => llms[id].messages.length > 0)
  const selectedIds = LLM_IDS.filter(id => selected[id])
  const noneSelected = selectedIds.length === 0
  const allSelected = selectedIds.length === LLM_IDS.length
  const totalAssistantMsgs = LLM_IDS.reduce(
    (sum, id) => sum + llms[id].messages.filter(m => m.role === 'assistant').length, 0
  )
  const showDiagnosisNudge = step === 'symptom-qa' && totalAssistantMsgs >= 4 && !isAnyLoading
  const prevLoadingRef = useRef(false)
  const diagnosisSummaryTriggeredRef = useRef(false)

  // ── localStorage 초기 로드 ────────────────────────────────────────────────
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // loading 상태 추적 (대화 저장용)
  useEffect(() => {
    prevLoadingRef.current = isAnyLoading
  }, [isAnyLoading])

  // ── 진단 완료 시 자동 종합 분석 ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'diagnosis') return
    if (isAnyLoading) return
    if (diagnosisSummaryTriggeredRef.current) return

    const diagnosisResponses = LLM_IDS.map(id => {
      const msgs = llms[id].messages
      const lastMsg = msgs[msgs.length - 1]
      return {
        llm: LLM_CONFIGS[id].name,
        content: lastMsg?.role === 'assistant' ? lastMsg.content : '',
      }
    })
    if (diagnosisResponses.every(d => !d.content)) return

    diagnosisSummaryTriggeredRef.current = true
    setDiagnosisSummaryLoading(true)
    setDiagnosisSummary(null)

    fetch('/api/diagnose-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnoses: diagnosisResponses }),
    })
      .then(r => r.json())
      .then(data => {
        setDiagnosisSummary(data as DiagnosisSummary)
        setDiagnosisSummaryLoading(false)
      })
      .catch(() => setDiagnosisSummaryLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyLoading, step])

  // ── 현재 대화 자동 저장 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMessages || isAnyLoading) return
    const firstMsg = LLM_IDS.flatMap(id => llms[id].messages)
      .find(m => m.role === 'user')
    if (!firstMsg) return

    const conv: Conversation = {
      id: activeId,
      title: makeTitle(firstMsg.content),
      date: formatDate(new Date()),
      llms,
      step,
    }
    setHistory(prev => {
      const next = prev.some(c => c.id === activeId)
        ? prev.map(c => c.id === activeId ? conv : c)
        : [conv, ...prev]
      saveHistory(next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llms, isAnyLoading])

  // ── 새 대화 ───────────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    setActiveId(Date.now().toString())
    setLlms(initialLlmState())
    setSelected(initialSelected())
    setStep('symptom-qa')
    setSummary(null)
    setDiagnosisSummary(null)
    diagnosisSummaryTriggeredRef.current = false
    setPrompt('')
  }, [])

  // ── 대화 전환 ─────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    const conv = history.find(c => c.id === id)
    if (!conv) return
    setActiveId(conv.id)
    setLlms(conv.llms)
    setStep(conv.step)
    setSelected({ claude: false, chatgpt: false, gemini: false, llama: false })
    setSummary(null)
    setDiagnosisSummary(null)
    diagnosisSummaryTriggeredRef.current = false
    setPrompt('')
  }, [history])

  // ── 패널 토글 (라디오 방식) ────────────────────────────────────────────────
  // 새 패널 선택 → 기존 선택 해제하고 새 것만 켬
  // 이미 선택된 패널 클릭 → 해제
  const toggleSelect = useCallback((id: LLMId) => {
    setSelected(prev => {
      if (prev[id]) {
        // 이미 선택된 거 클릭 → 해제
        return { ...prev, [id]: false }
      }
      // 새 패널 클릭 → 나머지 끄고 이것만 켬
      const next = { claude: false, chatgpt: false, gemini: false, llama: false }
      next[id] = true
      return next
    })
  }, [])

  const selectAll = useCallback(() => setSelected(initialSelected()), [])

  // ── 증상 요약 (수동) ──────────────────────────────────────────────────────
  const handleSummarize = useCallback(() => {
    const transcripts = LLM_IDS.map(id => ({
      llm: LLM_CONFIGS[id].name,
      messages: llms[id].messages,
    }))
    if (transcripts.every(t => t.messages.length === 0)) return

    setSummaryLoading(true)
    setSummary(null)
    fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcripts }),
    })
      .then(r => r.json())
      .then(data => {
        if ('error' in data) {
          console.error('[Summary] API error:', data.error)
          setSummaryLoading(false)
          return
        }
        setSummary(data as SummaryResult)
        setSummaryLoading(false)
      })
      .catch(e => { console.error('[Summary] fetch error:', e); setSummaryLoading(false) })
  }, [llms])

  // ── 메시지 전송 ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, targetStep: Step = step, explicitIds?: LLMId[]) => {
    if (!text.trim() || isAnyLoading) return

    // 전송 대상 결정:
    // 1. explicitIds가 있으면 그걸 사용 (진단 요청 등)
    // 2. 첫 메시지면 전체 4개에 전송
    // 3. 후속 메시지면 선택된 패널에만 전송
    const targets: LLMId[] = explicitIds ?? (!hasMessages ? [...LLM_IDS] : selectedIds)
    if (targets.length === 0) return

    // 크로스 컨텍스트: 전송 대상이 아닌 LLM의 대화 내용
    const crossContext = buildCrossContext(llms, targets)

    // LLM별 exchangeCount (assistant 메시지 수) 계산 → 시스템 프롬프트 개별 생성
    const systemPromptPer: Record<LLMId, string> = {} as Record<LLMId, string>
    for (const id of targets) {
      const exchangeCount = llms[id].messages.filter(m => m.role === 'assistant').length
      systemPromptPer[id] = buildSystemPrompt(targetStep, crossContext, exchangeCount)
    }

    setPrompt('')
    setSummary(null)

    // 후속 메시지이고 일부 패널에만 전송할 때 → 나머지 패널에 "공유됨" 표시
    if (hasMessages && targets.length < LLM_IDS.length) {
      const others = LLM_IDS.filter(id => !targets.includes(id))
      const shared = { claude: false, chatgpt: false, gemini: false, llama: false } as Record<LLMId, boolean>
      others.forEach(id => { shared[id] = true })
      setSharedPanels(shared)
      setTimeout(() => setSharedPanels({ claude: false, chatgpt: false, gemini: false, llama: false }), 2000)
    }

    setLlms(prev => {
      const next = { ...prev }
      for (const id of targets) {
        next[id] = {
          ...prev[id],
          messages: [...prev[id].messages, { role: 'user', content: text }],
          loading: true,
        }
      }
      return next
    })

    await Promise.all(targets.map(async (id) => {
      try {
        const currentMessages: Message[] = [
          ...llms[id].messages,
          { role: 'user', content: text },
        ]
        const res = await fetch(`/api/chat/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentMessages, systemPrompt: systemPromptPer[id] }),
        })
        const data = await res.json() as { content: string }
        const newExchangeCount = currentMessages.filter(m => m.role === 'assistant').length + 1
        setLlms(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            messages: [...prev[id].messages, { role: 'assistant', content: data.content }],
            loading: false,
          },
        }))
        // 3번 마무리됐으면 해당 패널 자동 해제
        if (newExchangeCount >= 3) {
          setSelected(prev => ({ ...prev, [id]: false }))
        }
      } catch {
        setLlms(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            messages: [...prev[id].messages, { role: 'assistant', content: '⚠️ 응답 실패. 다시 시도해주세요.' }],
            loading: false,
          },
        }))
      }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llms, isAnyLoading, selectedIds, step, hasMessages])

  // ── 진단 요청 ─────────────────────────────────────────────────────────────
  const handleDiagnosis = useCallback(() => {
    setStep('diagnosis')
    setDiagnosisSummary(null)
    diagnosisSummaryTriggeredRef.current = false
    // 4개 전체에 명시적으로 전송
    sendMessage('지금까지 말씀드린 증상들을 바탕으로 종합 진단을 내려주세요.', 'diagnosis', [...LLM_IDS])
  }, [sendMessage])

  // ── 추가 문답 (진단 후 Q&A 계속) ─────────────────────────────────────────
  const handleContinueQA = useCallback(() => {
    setStep('symptom-qa')
    setSelected(initialSelected())
    setDiagnosisSummary(null)
    diagnosisSummaryTriggeredRef.current = false
    setPrompt('')
  }, [])

  // ── Placeholder ───────────────────────────────────────────────────────────
  const placeholder = (() => {
    if (!hasMessages) return '반려동물의 증상을 자유롭게 설명해주세요…'
    if (noneSelected) return '답변할 AI 패널을 선택하세요'
    if (!allSelected) {
      const names = selectedIds.map(id => LLM_CONFIGS[id].name).join(', ')
      return `${names}에게 답변하세요 — 답변한 내용은 다른 AI에게도 공유됩니다`
    }
    return '추가로 알려주실 내용이 있나요?'
  })()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080808' }}>

      {/* 사이드바 */}
      <Sidebar
        history={history}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
      />

      {/* 메인 영역 */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid #1e1e1e' }}
        >
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#1e1e1e', color: '#555', border: '1px solid #2a2a2a' }}
          >
            {step === 'symptom-qa' ? '증상 파악 중' : '진단 결과'}
          </span>

          <div className="flex items-center gap-2">
            {!allSelected && step === 'symptom-qa' && (
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
              >
                ↺ 전체 선택
              </button>
            )}
            {hasMessages && !isAnyLoading && step === 'symptom-qa' && (
              <button
                onClick={handleSummarize}
                disabled={summaryLoading}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: '#1a1a2e', color: '#8ab4f8', border: '1px solid #1a2a4a' }}
              >
                {summaryLoading ? '분석 중…' : '📋 증상 요약'}
              </button>
            )}
            {step === 'symptom-qa' && hasMessages && !isAnyLoading && (
              <div className="flex flex-col items-end gap-1">
                {showDiagnosisNudge && (
                  <span className="text-xs" style={{ color: '#cc785c' }}>
                    충분한 정보가 모였어요 ↓
                  </span>
                )}
                <button
                  onClick={handleDiagnosis}
                  className="text-sm px-4 py-2 rounded-lg font-medium cursor-pointer transition-all"
                  style={{
                    background: '#cc785c',
                    color: '#fff',
                    boxShadow: showDiagnosisNudge ? '0 0 0 2px #cc785c55' : 'none',
                  }}
                >
                  진단 받기 →
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 입력창 + 요약 */}
        {step === 'symptom-qa' && (
          <div className="shrink-0 px-4 pt-4 pb-2 space-y-2">
            <SymptomInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => sendMessage(prompt)}
              disabled={isAnyLoading || (hasMessages && noneSelected)}
              placeholder={placeholder}
            />
            {isAnyLoading && (
              <p className="text-xs text-center" style={{ color: '#444' }}>
                AI 전문가들이 답변을 준비하고 있어요…
              </p>
            )}
            {!isAnyLoading && hasMessages && noneSelected && (
              <p className="text-xs text-center" style={{ color: '#666' }}>
                ↓ 답변할 AI 패널을 선택하세요
              </p>
            )}
            <SummaryPanel summary={summary} loading={summaryLoading} />
          </div>
        )}

        {/* 진단 종합 분석 패널 */}
        {step === 'diagnosis' && (diagnosisSummaryLoading || diagnosisSummary) && (
          <div className="shrink-0 px-4 pt-3">
            <DiagnosisPanel
              summary={diagnosisSummary}
              loading={diagnosisSummaryLoading}
              onContinueQA={handleContinueQA}
            />
          </div>
        )}

        {/* 4-panel grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {LLM_IDS.map(id => (
              <LLMPanel
                key={id}
                llmId={id}
                messages={llms[id].messages}
                loading={llms[id].loading}
                selected={selected[id]}
                onToggleSelect={() => toggleSelect(id)}
                step={step}
                showShared={sharedPanels[id]}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
