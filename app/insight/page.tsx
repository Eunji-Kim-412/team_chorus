"use client";

import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MessageType } from "@/lib/ai/types";

const MONTHLY = [
  { month: "1월", count: 18 }, { month: "2월", count: 22 },
  { month: "3월", count: 19 }, { month: "4월", count: 25 },
  { month: "5월", count: 23 }, { month: "6월", count: 28 },
];
const maxMonthly = Math.max(...MONTHLY.map((m) => m.count));

const TYPE_COLORS: Record<MessageType, string> = {
  vaccination:    "bg-emerald-400",
  "post-surgery": "bg-violet-400",
  revisit:        "bg-amber-400",
  "pre-surgery":  "bg-blue-400",
};
const TYPE_LABELS: Record<MessageType, string> = {
  vaccination:    "예방접종",
  "post-surgery": "수술 후 케어",
  revisit:        "재내원 안내",
  "pre-surgery":  "수술 전 케어",
};

export default function InsightPage() {
  const { patients, messages } = usePatients();

  const sent    = patients.filter((p) => p.status === "sent").length;
  const pending = patients.filter((p) => p.status === "pending").length;
  const total   = patients.length;

  const typeCounts: Record<string, number> = {};
  for (const p of patients) {
    typeCounts[p.messageType] = (typeCounts[p.messageType] ?? 0) + 1;
  }
  const typeTotal = total || 1;
  const TYPE_DIST = (["vaccination", "post-surgery", "revisit", "pre-surgery"] as MessageType[]).map((t) => ({
    label: TYPE_LABELS[t],
    pct: Math.round(((typeCounts[t] ?? 0) / typeTotal) * 100),
    color: TYPE_COLORS[t],
  }));

  const thisMonthSent = messages.filter((m) => {
    const d = new Date(m.sentAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length + sent;

  // AI 자동화 효과(추정): 수기 작성 대비 절약 시간
  const AI_MIN = 3.2;      // 평균 발송 소요(AI)
  const MANUAL_MIN = 8;    // 수기 작성 시 가정(추정)
  const savedTotalMin = Math.max(0, Math.round(thisMonthSent * (MANUAL_MIN - AI_MIN)));
  const savedHours = (savedTotalMin / 60).toFixed(1);

  return (
    <AppLayout active="insight" title="케어 인사이트">
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-gray-500">우리 병원 케어 메시지 발송 현황을 한눈에 확인하세요.</p>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "이번 달 발송 완료", value: `${thisMonthSent}건`, sub: "발송 완료 기준", subColor: "text-emerald-600", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", ic: "text-emerald-400" },
            { label: "보호자 응답률", value: "78%", sub: "목표 80%", subColor: "text-blue-500", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", ic: "text-blue-400" },
            { label: "재방문 전환율", value: "45%", sub: "+5% 전월 대비", subColor: "text-violet-500", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", ic: "text-violet-400" },
            { label: "평균 발송 소요", value: "3.2분", sub: "AI 자동 생성", subColor: "text-orange-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", ic: "text-orange-400" },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className={`w-4 h-4 ${c.ic}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
                </svg>
                <span className="text-xs text-gray-500">{c.label}</span>
              </div>
              <div className="text-2xl font-black text-gray-900">{c.value}</div>
              <div className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* AI 자동화 효과 — 절약 시간을 케어 집중으로 */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-3xl flex-shrink-0">🐾</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-50/80 mb-1">AI 자동화 효과</p>
              <h2 className="text-lg font-black leading-snug">
                메시지 발송 시간을 이번 달 약 <span className="underline decoration-emerald-300">{savedHours}시간</span> 절약했어요.<br />
                그만큼 더 많은 반려동물 친구들의 건강에 <span className="underline decoration-emerald-300">시간을 더 집중</span>할 수 있었어요.
              </h2>
              <p className="text-xs text-emerald-50/80 mt-2 leading-relaxed">
                발송 완료 {thisMonthSent}건 × (수기 약 {MANUAL_MIN}분 → AI {AI_MIN}분) 기준 추정 ·
                보호자 응답률 78% · 재방문 전환율 45%로 이어졌어요.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[`발송완료 ${thisMonthSent}건`, "보호자 응답률 78%", "재방문 전환율 45%", `평균 발송 ${AI_MIN}분`].map((chip) => (
                  <span key={chip} className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-full">{chip}</span>
                ))}
              </div>
              <p className="text-[10px] text-emerald-50/60 mt-2">※ 절약 시간은 수기 작성 대비 추정치입니다.</p>
            </div>
          </div>
        </div>

        {/* 메시지 유형별 발송 현황 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm mb-5">메시지 유형별 발송 현황</h2>
          <div className="space-y-4">
            {TYPE_DIST.map((t) => (
              <div key={t.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-700">{t.label}</span>
                  <span className="text-gray-400">{t.pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${t.color} transition-all duration-700`} style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 월별 발송 추이 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm mb-5">월별 발송 추이 (2026년)</h2>
          <div className="flex items-end gap-3 h-40">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-600">{m.count}</span>
                <div
                  className="w-full bg-emerald-400 rounded-t-lg transition-all duration-700"
                  style={{ height: `${(m.count / maxMonthly) * 120}px` }}
                />
                <span className="text-xs text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 보호자 만족도 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm mb-4">보호자 만족도</h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-black text-gray-900">4.8</div>
              <div className="text-xs text-gray-400 mt-1">/ 5.0</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className={`w-6 h-6 ${s <= 5 ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-500">124명 보호자 응답 기준</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">상위 5% 병원 수준</p>
            </div>
          </div>
        </div>

        {/* 오늘 현황 요약 */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <h2 className="font-bold text-emerald-800 text-sm mb-3">오늘 현황</h2>
          <div className="flex gap-6">
            <div><span className="text-2xl font-black text-emerald-600">{total}</span><p className="text-xs text-emerald-700">전체 환자</p></div>
            <div><span className="text-2xl font-black text-orange-500">{pending}</span><p className="text-xs text-emerald-700">발송 대기</p></div>
            <div><span className="text-2xl font-black text-emerald-600">{sent}</span><p className="text-xs text-emerald-700">발송 완료</p></div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
