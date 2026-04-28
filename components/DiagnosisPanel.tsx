'use client'

import type { DiagnosisSummary } from '@/app/api/diagnose-summary/route'

const RISK_LABEL: Record<string, { label: string; color: string }> = {
  low:    { label: '낮음', color: '#74aa84' },
  medium: { label: '중간', color: '#e8a245' },
  high:   { label: '높음', color: '#cc785c' },
}

const AGREEMENT_LABEL: Record<string, string> = {
  all:   'AI 전원 동일한 진단',
  most:  'AI 대다수 같은 진단',
  split: 'AI마다 의견 다름',
}

type Props = {
  summary: DiagnosisSummary | null
  loading: boolean
  onContinueQA: () => void
}

export default function DiagnosisPanel({ summary, loading, onContinueQA }: Props) {
  if (!loading && !summary) return null

  const risk = summary?.riskLevel ? RISK_LABEL[summary.riskLevel] : null

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{ border: '1px solid #2a2a2a', background: '#111' }}
    >
      {/* Header */}
      <div
        className="px-5 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1e1e1e' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: '#888' }}>AI 종합 분석</span>
          {loading && <span className="text-xs" style={{ color: '#444' }}>분석 중…</span>}
          {summary && !loading && (
            <span className="text-xs" style={{ color: '#444' }}>
              {AGREEMENT_LABEL[summary.agreement]}
            </span>
          )}
        </div>

        {/* 추가 문답하기 버튼 */}
        {!loading && (
          <button
            onClick={onContinueQA}
            className="text-xs px-3 py-1 rounded-lg cursor-pointer"
            style={{ background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
          >
            ↩ 추가 문답하기
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-5 py-4 flex gap-1 items-center">
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
        </div>
      )}

      {summary && !loading && (
        <div className="px-5 py-3 space-y-3">

          {/* 공통 원인 (all/most인 경우) */}
          {summary.topCause && (
            <div
              className="px-4 py-2.5 rounded-lg flex items-start gap-3"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <span className="text-xs font-semibold shrink-0 mt-0.5" style={{ color: '#cc785c' }}>
                공통 원인
              </span>
              <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>
                {summary.topCause}
              </span>
              {risk && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-auto"
                  style={{ background: `${risk.color}22`, color: risk.color, border: `1px solid ${risk.color}44` }}
                >
                  위험도 {risk.label}
                </span>
              )}
            </div>
          )}

          {/* 각 AI 소견 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {summary.perLlm.map(({ llm, cause }) => (
              <div
                key={llm}
                className="px-3 py-2 rounded-lg"
                style={{ background: '#161616', border: '1px solid #222' }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: '#555' }}>{llm}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#aaa' }}>{cause}</p>
              </div>
            ))}
          </div>

          {/* 의견 분분일 때 안내 */}
          {summary.agreement === 'split' && (
            <p className="text-xs" style={{ color: '#555' }}>
              AI마다 다른 원인을 지목하고 있어요. 추가 문답으로 정보를 더 모으면 더 정확한 진단이 가능해요.
            </p>
          )}

        </div>
      )}
    </div>
  )
}
