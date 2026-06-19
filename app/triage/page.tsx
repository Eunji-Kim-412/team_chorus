"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MockPatient } from "@/lib/mockData";

type Urgency = "emergency" | "caution" | "routine";

interface TriageResult {
  urgency: Urgency;
  category: string;
  redFlags: string[];
  reasoning: string;
  recommendedAction: string;
  draftReply: string;
  escalate: boolean;
  fallback?: boolean;
}

const URGENCY_META: Record<Urgency, { label: string; badge: string; ring: string; emoji: string }> = {
  emergency: { label: "응급", badge: "bg-red-100 text-red-700", ring: "border-red-200", emoji: "🚨" },
  caution: { label: "주의", badge: "bg-amber-100 text-amber-700", ring: "border-amber-200", emoji: "⚠️" },
  routine: { label: "일반", badge: "bg-emerald-100 text-emerald-700", ring: "border-emerald-200", emoji: "✅" },
};

const SAMPLES = [
  "수술한 다리 부위가 빨갛게 붓고 진물이 나와요.",
  "약 먹였는데 계속 토하고 축 늘어져 있어요. 숨도 가빠요.",
  "실밥은 언제 풀러 가면 되나요?",
  "밥을 잘 안 먹는데 좀 더 지켜봐도 될까요?",
];

export default function TriagePage() {
  const { patients } = usePatients();
  const [patientId, setPatientId] = useState<string>("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);

  const selected: MockPatient | undefined = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  const analyze = async () => {
    if (!reply.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSent(false);
    try {
      const res = await fetch("/api/agent/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText: reply,
          patientContext: selected
            ? {
                petName: selected.petName, breed: selected.breed, age: selected.age,
                messageType: selected.messageType, surgeryType: selected.surgeryType,
                medications: selected.medications,
              }
            : {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석에 실패했어요.");
      setResult(data);
      setDraft(data.draftReply ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout active="triage" title="보호자 답장 대응">
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500 mb-5">
          보호자 답장을 에이전트가 분석해 <span className="font-semibold text-gray-700">응급도를 판단</span>하고, 경증이면 안내 초안을, 위급하면 수의사에게 에스컬레이션합니다.
        </p>

        {/* 입력 카드 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">환자 (선택)</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">환자를 선택하지 않음 (일반 문의)</option>
            {patients.slice(0, 40).map((p) => (
              <option key={p.id} value={p.id}>
                {p.petName} · {p.breed} · {p.ownerName} 보호자
              </option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-gray-500 mb-1.5">보호자가 보낸 답장</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="보호자에게서 받은 메시지를 붙여넣으세요."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />

          <div className="flex flex-wrap gap-1.5 mt-3">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => setReply(s)}
                className="text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
              >
                {s.length > 22 ? s.slice(0, 22) + "…" : s}
              </button>
            ))}
          </div>

          <button
            onClick={analyze}
            disabled={loading || !reply.trim()}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "에이전트 분석 중…" : "🤖 에이전트 분석"}
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* 분석 결과 */}
        {result && (
          <div className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${URGENCY_META[result.urgency].ring}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-lg">{URGENCY_META[result.urgency].emoji}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_META[result.urgency].badge}`}>
                {URGENCY_META[result.urgency].label}
              </span>
              <span className="text-sm font-bold text-gray-900">{result.category}</span>
              <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                {result.fallback ? "규칙 기반" : "AI 판단"}
              </span>
            </div>

            <div className="mb-3">
              <p className="text-[11px] font-semibold text-gray-400 mb-1">에이전트 판단 근거</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.reasoning}</p>
            </div>

            {result.redFlags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {result.redFlags.map((f, i) => (
                  <span key={i} className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    🚩 {f}
                  </span>
                ))}
              </div>
            )}

            {/* 에스컬레이션 경고 */}
            {result.escalate && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-bold text-red-700 mb-0.5">수의사 즉시 확인 필요</p>
                <p className="text-xs text-red-600">{result.recommendedAction}</p>
              </div>
            )}

            {/* 안내 초안 + 승인 게이트 */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-1">보호자 안내 초안 (수의사 검토용)</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-gray-50"
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setSent(true)}
                  disabled={sent}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    sent ? "bg-emerald-100 text-emerald-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {sent ? "✓ 발송됨 (데모)" : result.escalate ? "확인했고, 안내 발송" : "확인 후 발송"}
                </button>
                <button
                  onClick={() => { setResult(null); setReply(""); setSent(false); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  새로 분석
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                ⚠️ 에이전트는 초안만 생성합니다. 의학적 판단·발송 결정은 수의사가 합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
