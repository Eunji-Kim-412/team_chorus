"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MessageType } from "@/lib/ai/types";
import type { MockPatient } from "@/lib/mockData";

type TypeFilter = "all" | MessageType;
type StatusFilter = "all" | "sent" | "pending";
type Priority = "emergency" | "high" | "normal";

interface PlanItem {
  priority: Priority;
  reason: string;
  patient: MockPatient;
}
interface PlanResponse {
  stats: { total: number; emergency: number; high: number; atRisk: number };
  briefing: string;
  plan: PlanItem[];
  fallback: boolean;
}

const TYPE_META: Record<MessageType, { label: string; icon: string; color: string; bg: string; ring: string }> = {
  vaccination:    { label: "예방접종", icon: "💉", color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-300" },
  "pre-surgery":  { label: "수술 전",  icon: "🏥", color: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-300"    },
  "post-surgery": { label: "수술 후",  icon: "🐾", color: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-300"  },
  revisit:        { label: "재내원",   icon: "📅", color: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-300"   },
};

const PRIORITY_META: Record<Priority, { label: string; cls: string; rank: number }> = {
  emergency: { label: "긴급", cls: "bg-red-50 text-red-600 border-red-100", rank: 0 },
  high:      { label: "우선", cls: "bg-amber-50 text-amber-600 border-amber-100", rank: 1 },
  normal:    { label: "일반", cls: "bg-emerald-50 text-emerald-600 border-emerald-100", rank: 2 },
};

function getDDayLabel(dDay: number): { text: string; cls: string } {
  if (dDay === 0)  return { text: "오늘마감", cls: "bg-orange-100 text-orange-700 font-bold" };
  if (dDay > 0)    return { text: `D-${dDay}`, cls: "bg-gray-100 text-gray-600" };
  return { text: `D+${Math.abs(dDay)}`, cls: "bg-red-50 text-red-600" };
}

export default function MessageAgentPage() {
  const { patients, updatePatient } = usePatients();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recommendedOnly, setRecommendedOnly] = useState(false);

  const [agent, setAgent] = useState<PlanResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const runAgent = async () => {
    setAgentLoading(true);
    try {
      const res = await fetch("/api/agent/daily-plan", { method: "POST" });
      if (res.ok) setAgent(await res.json());
    } finally {
      setAgentLoading(false);
    }
  };
  useEffect(() => { runAgent(); }, []);

  // 에이전트 추천: patientId → { priority, reason }
  const planMap = useMemo(() => {
    const m = new Map<string, { priority: Priority; reason: string }>();
    agent?.plan.forEach((i) => m.set(i.patient.id, { priority: i.priority, reason: i.reason }));
    return m;
  }, [agent]);

  const total   = patients.length;
  const sent    = patients.filter((p) => p.status === "sent").length;
  const pending = patients.filter((p) => p.status === "pending").length;

  const typeCounts: Record<string, number> = {};
  for (const p of patients) typeCounts[p.messageType] = (typeCounts[p.messageType] ?? 0) + 1;

  const filtered = patients.filter((p) => {
    const typeOk = typeFilter === "all" || p.messageType === typeFilter;
    const statusOk = statusFilter === "all" || p.status === statusFilter;
    const recOk = !recommendedOnly || planMap.has(p.id);
    return typeOk && statusOk && recOk;
  });

  // 에이전트 우선순위순 정렬(추천 먼저) → 그다음 D-Day
  const sorted = [...filtered].sort((a, b) => {
    const ra = planMap.get(a.id) ? PRIORITY_META[planMap.get(a.id)!.priority].rank : 9;
    const rb = planMap.get(b.id) ? PRIORITY_META[planMap.get(b.id)!.priority].rank : 9;
    if (ra !== rb) return ra - rb;
    return a.dDay - b.dDay;
  });

  return (
    <AppLayout active="messages" title="메시지 에이전트">
      <div className="p-6 space-y-5">

        {/* 에이전트 브리핑 배너 */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">🤖</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">메시지 에이전트</span>
                {agent && (
                  <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">
                    {agent.fallback ? "규칙 기반" : "AI 브리핑"}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-emerald-50">
                {agentLoading ? "오늘 발송 후보를 편성하고 있어요…" : agent?.briefing}
              </p>
            </div>
            <button
              onClick={runAgent}
              disabled={agentLoading}
              className="flex-shrink-0 text-xs font-bold bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              다시 편성
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "전체",     value: total,                       cls: "text-gray-900" },
            { label: "오늘 추천", value: agent?.stats.total ?? 0,      cls: "text-emerald-600" },
            { label: "긴급",     value: agent?.stats.emergency ?? 0,  cls: "text-red-600" },
            { label: "검수대기",  value: pending,                     cls: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 메시지 유형 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              typeFilter === "all" ? "bg-gray-900 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            전체 <span className="opacity-60">{total}</span>
          </button>
          {(Object.keys(TYPE_META) as MessageType[]).map((t) => {
            const m = TYPE_META[t];
            const cnt = typeCounts[t] ?? 0;
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(active ? "all" : t)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active ? `${m.bg} ${m.color} ring-2 ${m.ring} shadow-sm` : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span>{m.icon}</span> {m.label} <span className="opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* 상태 필터 + 추천만 보기 */}
        <div className="flex gap-2 flex-wrap items-center">
          {([
            { key: "all",     label: "전체",   icon: "⬜" },
            { key: "pending", label: "검수대기", icon: "⏳" },
            { key: "sent",    label: "발송완료", icon: "✅" },
          ] as { key: StatusFilter; label: string; icon: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                statusFilter === f.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span>{f.icon}</span> {f.label}
            </button>
          ))}
          <button
            onClick={() => setRecommendedOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              recommendedOnly
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            🤖 오늘 추천만
          </button>
          <span className="ml-auto self-center text-xs text-gray-400 font-medium">{sorted.length}건</span>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["우선순위", "환자", "품종·나이", "보호자", "유형", "D-Day", "상태", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((p) => {
                  const meta  = TYPE_META[p.messageType];
                  const dDay  = getDDayLabel(p.dDay);
                  const isSent = p.status === "sent";
                  const rec = planMap.get(p.id);
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${rec ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {rec ? (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_META[rec.priority].cls}`}>
                            {PRIORITY_META[rec.priority].label}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center text-base flex-shrink-0`}>{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900">{p.petName}</span>
                              {p.atRisk && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">위험</span>}
                            </div>
                            {rec && <p className="text-[11px] text-emerald-700/70 max-w-[260px] truncate" title={rec.reason}>🤖 {rec.reason}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{p.breed} · {p.age}세</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{p.ownerName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${dDay.cls}`}>{dDay.text}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => updatePatient(p.id, { status: isSent ? "pending" : "sent" })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            isSent ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {isSent ? "✅ 발송완료" : "⏳ 검수대기"}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/compose?type=${p.messageType}&prefill=1`}
                          onClick={() => sessionStorage.setItem("vetscribe_prefill", JSON.stringify({
                            patientId: p.id, ownerName: p.ownerName,
                            messageType: p.messageType, patientName: p.petName, breed: p.breed, age: p.age,
                            vaccineType: p.vaccineType, vaccineDate: p.vaccineDate, reminderDays: p.reminderDays,
                            surgeryType: p.surgeryType, medications: p.medications, nextVisit: p.nextVisit,
                            revisitDate: p.revisitDate, revisitReason: p.revisitReason,
                          }))}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          메시지 작성 →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔍</div>
                해당 조건의 메시지가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700">
            ⚠️ 에이전트는 <span className="font-semibold">대상 선정·우선순위 판단</span>까지 자동 수행합니다. 안내문 생성·발송은 수의사 확인(승인 게이트) 후 진행됩니다.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
