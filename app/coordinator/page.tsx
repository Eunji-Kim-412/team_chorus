"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import type { MockPatient } from "@/lib/mockData";

type Priority = "emergency" | "high" | "normal";

interface PlanItem {
  priority: Priority;
  reason: string;
  patient: MockPatient;
}

interface PlanResponse {
  date: string;
  stats: { total: number; emergency: number; high: number; atRisk: number };
  briefing: string;
  plan: PlanItem[];
  fallback: boolean;
}

const TYPE_META: Record<string, { label: string; icon: string }> = {
  vaccination: { label: "예방접종", icon: "💉" },
  "pre-surgery": { label: "수술 전", icon: "🏥" },
  "post-surgery": { label: "수술 후", icon: "🐾" },
  revisit: { label: "재내원", icon: "📅" },
};

const PRIORITY_META: Record<Priority, { label: string; cls: string; dot: string }> = {
  emergency: { label: "긴급", cls: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-500" },
  high: { label: "우선", cls: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" },
  normal: { label: "일반", cls: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
};

export default function CoordinatorPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const runAgent = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agent/daily-plan", { method: "POST" });
      if (!res.ok) throw new Error("편성에 실패했어요.");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAgent();
  }, []);

  const compose = (p: MockPatient) => {
    const prefill = {
      patientId: p.id, ownerName: p.ownerName,
      messageType: p.messageType, patientName: p.petName, breed: p.breed, age: p.age,
      vaccineType: p.vaccineType, vaccineDate: p.vaccineDate, reminderDays: p.reminderDays,
      surgeryType: p.surgeryType, medications: p.medications, nextVisit: p.nextVisit,
      revisitDate: p.revisitDate, revisitReason: p.revisitReason,
    };
    sessionStorage.setItem("vetscribe_prefill", JSON.stringify(prefill));
    router.push(`/compose?type=${p.messageType}&prefill=1`);
  };

  return (
    <AppLayout active="coordinator" title="케어 코디네이터">
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            에이전트가 환자 데이터를 스캔해 <span className="font-semibold text-gray-700">오늘 보낼 케어 메시지</span>를 자동 편성합니다.
          </p>
          <button
            onClick={runAgent}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "편성 중…" : "다시 편성"}
          </button>
        </div>

        {/* 에이전트 브리핑 */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-sm mb-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">🤖</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">코디네이터 에이전트</span>
                {data && (
                  <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">
                    {data.fallback ? "규칙 기반" : "AI 브리핑"}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-emerald-50">
                {loading ? "오늘 발송 후보를 편성하고 있어요…" : error ? error : data?.briefing}
              </p>
            </div>
          </div>
        </div>

        {/* 통계 */}
        {data && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "발송 후보", value: data.stats.total, cls: "text-gray-900" },
              { label: "긴급", value: data.stats.emergency, cls: "text-red-600" },
              { label: "우선", value: data.stats.high, cls: "text-amber-600" },
              { label: "이탈 위험", value: data.stats.atRisk, cls: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 편성된 발송 큐 */}
        <div className="space-y-2.5">
          {data?.plan.map((item) => {
            const tm = TYPE_META[item.patient.messageType] ?? { label: "안내", icon: "🐾" };
            const pm = PRIORITY_META[item.priority];
            return (
              <div key={item.patient.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">{tm.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{item.patient.petName}</span>
                    <span className="text-xs text-gray-400">{item.patient.breed} · {item.patient.age}세 · {item.patient.ownerName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${pm.cls}`}>{pm.label}</span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{tm.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${pm.dot}`}></span>
                    {item.reason}
                  </p>
                </div>
                <button
                  onClick={() => compose(item.patient)}
                  className="flex-shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors"
                >
                  검토 후 작성
                </button>
              </div>
            );
          })}
          {data && data.plan.length === 0 && !loading && (
            <div className="text-center text-sm text-gray-400 py-12">오늘 보낼 후보가 없어요. 모두 발송 완료 상태입니다 🎉</div>
          )}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700">
            ⚠️ 에이전트는 <span className="font-semibold">대상 선정·우선순위 판단</span>까지만 자동으로 수행합니다.
            실제 안내문 생성과 발송은 수의사 확인(승인 게이트) 후 진행됩니다.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
