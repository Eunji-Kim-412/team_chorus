"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import { buildConversation, type ConversationTurn } from "@/lib/conversations";
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

const MSG_LABEL: Record<string, string> = {
  vaccination: "예방접종",
  "pre-surgery": "수술 전",
  "post-surgery": "수술 후",
  revisit: "재내원",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function TriagePage() {
  const { patients, messages } = usePatients();
  const [patientId, setPatientId] = useState<string>("");
  const [extraTurns, setExtraTurns] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // 보호자 수신 메시지가 있는 환자 + 최근 대화 시각 (최신순 정렬)
  const inbox = useMemo(() => {
    const list = patients
      .map((p) => {
        const hist = messages.filter((m) => m.patientId === p.id);
        if (!hist.length) return null;
        const conv = buildConversation(p.id, p.petName, hist);
        if (!conv.some((t) => t.direction === "in")) return null;
        const lastAt = conv.reduce((mx, t) => Math.max(mx, new Date(t.at).getTime()), 0);
        return { p, lastAt };
      })
      .filter((x): x is { p: MockPatient; lastAt: number } => x !== null);
    list.sort((a, b) => b.lastAt - a.lastAt);
    return list;
  }, [patients, messages]);

  const selected = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId]);

  const baseConversation = useMemo(() => {
    if (!selected) return [];
    const hist = messages.filter((m) => m.patientId === selected.id);
    return buildConversation(selected.id, selected.petName, hist);
  }, [selected, messages]);

  const conversation = useMemo(
    () =>
      [...baseConversation, ...extraTurns].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
      ),
    [baseConversation, extraTurns]
  );

  const latestInbound = useMemo(() => {
    const ins = baseConversation.filter((t) => t.direction === "in");
    return ins.length ? ins[ins.length - 1] : null;
  }, [baseConversation]);

  // 진입 시 가장 최근 대화 자동 선택
  useEffect(() => {
    if (!patientId && inbox.length) setPatientId(inbox[0].p.id);
  }, [inbox, patientId]);

  // 환자 선택 시 마지막 보호자 메시지를 에이전트가 자동 분석
  useEffect(() => {
    setResult(null);
    setDraft("");
    setError("");
    setSent(false);
    setExtraTurns([]);
    if (!selected || !latestInbound) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/agent/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            replyText: latestInbound.text,
            patientContext: {
              petName: selected.petName, breed: selected.breed, age: selected.age,
              messageType: selected.messageType, surgeryType: selected.surgeryType,
              medications: selected.medications,
            },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "분석에 실패했어요.");
        setResult(data);
        setDraft(data.draftReply ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류가 발생했어요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, latestInbound]);

  const sendDraft = () => {
    if (!draft.trim()) return;
    setExtraTurns((prev) => [
      ...prev,
      { id: `sent-${Date.now()}`, direction: "out", at: new Date().toISOString(), text: draft },
    ]);
    setSent(true);
  };

  return (
    <AppLayout active="triage" title="채팅 에이전트">
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <p className="text-sm text-gray-500 mb-4">
          보호자와의 <span className="font-semibold text-gray-700">대화 이력</span>을 불러와, 마지막 보호자 메시지를 에이전트가
          분석해 <span className="font-semibold text-gray-700">응급도를 판단</span>하고 답장 초안을 제안합니다. 발송은 수의사 확인 후 진행됩니다.
        </p>

        {/* 대화방 선택 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            대화방 선택 · 보호자 문의 {inbox.length}건
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value="">환자를 선택하세요</option>
            {inbox.map(({ p, lastAt }) => (
              <option key={p.id} value={p.id}>
                {p.petName} · {p.ownerName} 보호자 · 최근 {formatDate(lastAt)}
              </option>
            ))}
          </select>
        </div>

        {!selected ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-16 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm text-gray-400">대화방을 선택하면 이력과 추천 답장이 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            {/* 좌측: 채팅 + 분석 (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {/* 채팅 스레드 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">🐾</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{selected.petName} · {selected.ownerName} 보호자</p>
                    <p className="text-[11px] text-gray-400">{selected.breed} · {selected.age}세</p>
                  </div>
                </div>

                <div className="p-4 space-y-3 max-h-[440px] overflow-y-auto">
                  {conversation.map((t) => {
                    const out = t.direction === "out";
                    const isTarget = !out && latestInbound?.id === t.id;
                    const u = t.urgency ? URGENCY_META[t.urgency] : null;
                    return (
                      <div key={t.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] flex flex-col gap-0.5 ${out ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400">{out ? "병원" : "보호자"}</span>
                            {!out && u && <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${u.badge}`}>{u.label}</span>}
                            {isTarget && <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-emerald-600 text-white">분석 대상</span>}
                            <span className="text-[10px] text-gray-300">{formatDateTime(t.at)}</span>
                          </div>
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                              out
                                ? "bg-emerald-600 text-white rounded-tr-sm"
                                : `bg-gray-100 text-gray-700 rounded-tl-sm ${isTarget ? "ring-2 ring-emerald-400" : ""}`
                            }`}
                          >
                            {t.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 에이전트 분석 + 추천 답장 */}
              {loading && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-center text-sm text-gray-400">
                  🤖 에이전트가 마지막 보호자 메시지를 분석 중…
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}

              {!loading && !latestInbound && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-center text-sm text-gray-400">
                  아직 보호자가 보낸 메시지가 없어 분석할 답장이 없어요.
                </div>
              )}

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

                  {result.escalate && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs font-bold text-red-700 mb-0.5">수의사 즉시 확인 필요</p>
                      <p className="text-xs text-red-600">{result.recommendedAction}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 mb-1">추천 답장 (수의사 검토용)</p>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-gray-50"
                    />
                    <button
                      onClick={sendDraft}
                      disabled={sent || !draft.trim()}
                      className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        sent ? "bg-emerald-100 text-emerald-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {sent ? "✓ 발송됨 (데모)" : result.escalate ? "확인했고, 안내 발송" : "확인 후 발송"}
                    </button>
                    <p className="text-[11px] text-gray-400 mt-2">
                      ⚠️ 에이전트는 초안만 생성합니다. 의학적 판단·발송 결정은 수의사가 합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 우측: 환자 정보 패널 (1/3) */}
            <aside className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 lg:sticky lg:top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">🐾</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-gray-900">{selected.petName}</h3>
                    {selected.atRisk && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠️ 이탈 위험</span>}
                  </div>
                  <p className="text-xs text-gray-500">{selected.breed} · {selected.age}세</p>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-gray-400">보호자</dt><dd className="font-semibold text-gray-700 text-right">{selected.ownerName}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-gray-400">연락처</dt><dd className="font-semibold text-gray-700 text-right">{selected.ownerPhone}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-gray-400">최근 안내 유형</dt><dd className="font-semibold text-gray-700 text-right">{MSG_LABEL[selected.messageType] ?? selected.messageType}</dd></div>
                {selected.surgeryType && <div className="flex justify-between gap-2"><dt className="text-gray-400">수술/처치</dt><dd className="font-semibold text-gray-700 text-right">{selected.surgeryType}</dd></div>}
                {selected.medications && <div className="flex justify-between gap-2"><dt className="text-gray-400">처방약</dt><dd className="font-semibold text-gray-700 text-right">{selected.medications}</dd></div>}
                <div className="flex justify-between gap-2"><dt className="text-gray-400">최근 방문일</dt><dd className="font-semibold text-gray-700 text-right">{selected.lastVisit ?? "-"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-gray-400">최초 방문일</dt><dd className="font-semibold text-gray-700 text-right">{selected.firstVisit ?? "-"}</dd></div>
              </dl>

              <Link
                href={`/pets/${selected.id}`}
                className="block text-center mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors"
              >
                반려동물 상세 보기 →
              </Link>
            </aside>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
