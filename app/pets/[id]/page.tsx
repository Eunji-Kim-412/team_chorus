"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import { buildConversation, inboundFrom, type InboundUrgency } from "@/lib/conversations";

const URGENCY_META: Record<InboundUrgency, { label: string; badge: string }> = {
  emergency: { label: "응급", badge: "bg-red-100 text-red-700" },
  caution: { label: "주의", badge: "bg-amber-100 text-amber-700" },
  routine: { label: "일반", badge: "bg-emerald-100 text-emerald-700" },
};

type HistoryTab = "sent" | "received" | "conversation";

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  vaccination:    { label: "예방접종", icon: "💉", color: "text-emerald-700", bg: "bg-emerald-50" },
  "pre-surgery":  { label: "수술 전",  icon: "🏥", color: "text-blue-700",    bg: "bg-blue-50" },
  "post-surgery": { label: "수술 후",  icon: "🐾", color: "text-violet-700",  bg: "bg-violet-50" },
  revisit:        { label: "재내원",   icon: "📅", color: "text-amber-700",   bg: "bg-amber-50" },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { patients, messages } = usePatients();

  const pet = useMemo(() => patients.find((p) => p.id === id), [patients, id]);
  const history = useMemo(
    () =>
      messages
        .filter((m) => m.patientId === id)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [messages, id]
  );

  const conversation = useMemo(
    () => (pet ? buildConversation(pet.id, pet.petName, history) : []),
    [pet, history]
  );
  const received = useMemo(() => inboundFrom(conversation), [conversation]);

  const [tab, setTab] = useState<HistoryTab>("sent");

  const goCompose = () => {
    if (!pet) return;
    sessionStorage.setItem("vetscribe_prefill", JSON.stringify({
      patientId: pet.id, ownerName: pet.ownerName,
      messageType: pet.messageType, patientName: pet.petName, breed: pet.breed, age: pet.age,
      vaccineType: pet.vaccineType, vaccineDate: pet.vaccineDate, reminderDays: pet.reminderDays,
      surgeryType: pet.surgeryType, medications: pet.medications, nextVisit: pet.nextVisit,
      revisitDate: pet.revisitDate, revisitReason: pet.revisitReason,
    }));
    router.push(`/compose?type=${pet.messageType}&prefill=1`);
  };

  return (
    <AppLayout active="pets" title="반려동물 상세">
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <button onClick={() => router.push("/pets")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          반려동물 목록
        </button>

        {!pet ? (
          <div className="text-center text-sm text-gray-400 py-20">해당 반려동물을 찾을 수 없어요.</div>
        ) : (
          <>
            {/* 환자 정보 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl flex-shrink-0">🐾</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-gray-900">{pet.petName}</h2>
                    {pet.atRisk && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠️ 이탈 위험</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{pet.breed} · {pet.age}세 · {pet.ownerName} 보호자</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div><p className="text-gray-400">연락처</p><p className="font-semibold text-gray-700">{pet.ownerPhone}</p></div>
                    <div><p className="text-gray-400">최근 방문일</p><p className="font-semibold text-gray-700">{pet.lastVisit ?? "-"}</p></div>
                    <div><p className="text-gray-400">최초 방문일</p><p className="font-semibold text-gray-700">{pet.firstVisit ?? "-"}</p></div>
                    <div><p className="text-gray-400">총 발송</p><p className="font-semibold text-gray-700">{history.length}건</p></div>
                  </div>
                </div>
                <button onClick={goCompose} className="flex-shrink-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl transition-colors">
                  새 메시지 작성
                </button>
              </div>
            </div>

            {/* 이력 탭 */}
            <div className="flex items-center gap-1 mb-3 border-b border-gray-100">
              {([
                { k: "sent", label: `발송 이력 (${history.length})` },
                { k: "received", label: `수신 이력 (${received.length})` },
                { k: "conversation", label: `대화 이력 (${conversation.length})` },
              ] as { k: HistoryTab; label: string }[]).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`px-3 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
                    tab === t.k
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 발송 이력 */}
            {tab === "sent" &&
              (history.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-14 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-gray-400 mb-4">아직 이 반려동물에게 발송된 메시지가 없어요.</p>
                  <button onClick={goCompose} className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors">
                    첫 메시지 작성하기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((m) => {
                    const meta = TYPE_META[m.messageType] ?? { label: m.messageType, icon: "📩", color: "text-gray-700", bg: "bg-gray-50" };
                    return (
                      <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center text-lg flex-shrink-0`}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${meta.bg} ${meta.color}`}>{meta.label}</span>
                            <span className="text-[11px] text-gray-400">{formatDateTime(m.sentAt)}</span>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-auto">발송완료</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{m.preview}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* 수신 이력 */}
            {tab === "received" &&
              (received.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-14 text-center">
                  <div className="text-3xl mb-2">📥</div>
                  <p className="text-sm text-gray-400">아직 이 반려동물 보호자에게서 받은 메시지가 없어요.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {received.map((m) => {
                    const u = URGENCY_META[m.urgency ?? "routine"];
                    return (
                      <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">💬</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-gray-700">보호자</span>
                            <span className="text-[11px] text-gray-400">{formatDateTime(m.at)}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto ${u.badge}`}>{u.label}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* 대화 이력 */}
            {tab === "conversation" &&
              (conversation.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-14 text-center">
                  <div className="text-3xl mb-2">🗨️</div>
                  <p className="text-sm text-gray-400">아직 주고받은 대화가 없어요.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                  {conversation.map((t) => {
                    const out = t.direction === "out";
                    const u = t.urgency ? URGENCY_META[t.urgency] : null;
                    return (
                      <div key={t.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${out ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400">{out ? "병원" : "보호자"}</span>
                            {!out && u && <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${u.badge}`}>{u.label}</span>}
                            <span className="text-[10px] text-gray-300">{formatDateTime(t.at)}</span>
                          </div>
                          <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            out ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-700 rounded-tl-sm"
                          }`}>
                            {t.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </>
        )}
      </div>
    </AppLayout>
  );
}
