'use client'

import type { SummaryResult } from '@/app/api/summarize/route'

type Props = {
  summary: SummaryResult | null
  loading: boolean
}

export default function SummaryPanel({ summary, loading }: Props) {
  if (!loading && !summary) return null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid #2a2a2a', background: '#111' }}
    >
      {/* Header */}
      <div
        className="px-5 py-2.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid #1e1e1e' }}
      >
        <span className="text-xs font-semibold" style={{ color: '#888' }}>증상 요약</span>
        {loading && <span className="text-xs" style={{ color: '#444' }}>분석 중…</span>}
      </div>

      {loading && (
        <div className="px-5 py-4 flex gap-1 items-center">
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-[#444]" />
        </div>
      )}

      {summary && !loading && (
        <div className="grid grid-cols-2 divide-x divide-[#1e1e1e]">

          {/* 확인된 증상 */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold mb-2" style={{ color: '#cc785c' }}>
              확인된 증상
            </p>
            {(summary.symptoms ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: '#444' }}>아직 확인된 증상 없음</p>
            ) : (
              <ul className="space-y-1">
                {summary.symptoms.map((item, i) => (
                  <li key={i} className="text-xs flex gap-1.5 items-start" style={{ color: '#bbb' }}>
                    <span style={{ color: '#cc785c', marginTop: '2px' }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 파악된 상황 */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold mb-2" style={{ color: '#74aa84' }}>
              파악된 상황
            </p>
            {(summary.situation ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: '#444' }}>아직 파악된 상황 없음</p>
            ) : (
              <ul className="space-y-1">
                {summary.situation.map((item, i) => (
                  <li key={i} className="text-xs flex gap-1.5 items-start" style={{ color: '#bbb' }}>
                    <span style={{ color: '#74aa84', marginTop: '2px' }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
