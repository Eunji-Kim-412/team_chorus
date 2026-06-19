"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import type { PatientInfo, MessageType, Language, Tone } from "@/lib/ai/types";
import { usePatients } from "@/context/PatientsContext";

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
];

const TYPE_META: Record<MessageType, { title: string; icon: string; bg: string }> = {
  vaccination: { title: "예방접종 리마인드", icon: "💉", bg: "bg-emerald-500" },
  "pre-surgery": { title: "수술 전 안내", icon: "🏥", bg: "bg-blue-500" },
  "post-surgery": { title: "수술 후 퇴원 안내", icon: "🐾", bg: "bg-violet-500" },
  revisit: { title: "재내원 리마인드", icon: "📅", bg: "bg-amber-500" },
};

const VACCINE_OPTIONS = ["종합백신 (DHPPL)", "광견병", "켄넬코프", "코로나", "인플루엔자", "심장사상충 예방"];
const SURGERY_OPTIONS = ["중성화 수술", "슬개골 탈구 수술", "발치", "종양 제거", "위장 수술", "정형외과 수술", "안과 수술", "기타"];
const REMINDER_OPTIONS = [
  { value: "7", label: "D-7 (일주일 전)" },
  { value: "3", label: "D-3 (3일 전)" },
  { value: "1", label: "D-1 (하루 전)" },
];
const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "friendly", label: "친절한",   desc: "이모지 포함, 따뜻한 말투" },
  { value: "simple",   label: "간단한",   desc: "핵심만 간결하게" },
  { value: "custom",   label: "직접입력", desc: "병원 고유 말투 저장" },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent focus:bg-white transition-colors";

function ComposeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { updatePatient, logMessage } = usePatients();
  const messageType = (searchParams.get("type") ?? "post-surgery") as MessageType;
  const meta = TYPE_META[messageType] ?? TYPE_META["post-surgery"];

  const [patientId, setPatientId] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [form, setForm] = useState<Partial<PatientInfo>>({ messageType, patientName: "", breed: "", age: "", language: "ko", tone: "friendly" });
  const [reminderDaysList, setReminderDaysList] = useState<string[]>(["7"]);
  const [customTone, setCustomTone] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("vetscribe_custom_tone") ?? "";
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("vetscribe_prefill");
    if (raw && searchParams.get("prefill") === "1") {
      try {
        const prefill = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...prefill }));
        if (prefill.reminderDays) setReminderDaysList([prefill.reminderDays]);
        if (prefill.patientId) setPatientId(prefill.patientId);
        if (prefill.ownerName) setOwnerName(prefill.ownerName);
        sessionStorage.removeItem("vetscribe_prefill");
      } catch {}
    }
  }, [searchParams]);

  const set = (key: keyof PatientInfo, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const addReminder = () => {
    const used = new Set(reminderDaysList);
    const next = REMINDER_OPTIONS.find((o) => !used.has(o.value));
    if (next) setReminderDaysList((p) => [...p, next.value]);
  };
  const removeReminder = (idx: number) => setReminderDaysList((p) => p.filter((_, i) => i !== idx));
  const updateReminder = (idx: number, value: string) => setReminderDaysList((p) => p.map((v, i) => (i === idx ? value : v)));
  const handleCustomToneChange = (val: string) => {
    setCustomTone(val);
    localStorage.setItem("vetscribe_custom_tone", val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, reminderDaysList, customTone: form.tone === "custom" ? customTone : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      const preview = (data.message ?? data.messages?.[0]?.message ?? "").slice(0, 80);
      if (patientId) {
        await updatePatient(patientId, { status: "sent" });
        await logMessage({
          patientId,
          patientName: form.patientName ?? "",
          ownerName,
          messageType,
          preview,
        });
      }
      sessionStorage.setItem("vetscribe_result", JSON.stringify({
        message: data.message ?? null,
        messages: data.messages ?? null,
        patientName: form.patientName,
        messageType,
        language: form.language ?? "ko",
      }));
      router.push("/result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-8 h-8 ${meta.bg} rounded-lg flex items-center justify-center text-lg`}>{meta.icon}</div>
          <h1 className="font-bold text-gray-900">{meta.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">안내문 언어</span>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button key={lang.value} type="button" onClick={() => set("language", lang.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ${form.language === lang.value ? "bg-slate-900 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <span>{lang.flag}</span><span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <span className="text-sm font-bold text-gray-700">안내문 말투</span>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((t) => (
                <button key={t.value} type="button" onClick={() => set("tone", t.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${form.tone === t.value ? "bg-slate-900 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  <span>{t.label}</span>
                  <span className={`text-[10px] font-normal ${form.tone === t.value ? "text-gray-300" : "text-gray-400"}`}>{t.desc}</span>
                </button>
              ))}
            </div>
            {form.tone === "custom" && (
              <input type="text" placeholder="예: 존댓말, 격식체, 짧게 끊어 쓰기"
                value={customTone} onChange={(e) => handleCustomToneChange(e.target.value)} className={inputCls} />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900 text-sm">반려동물 기본 정보</h2>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Field label="환자 이름" required>
                  <input required type="text" placeholder="예: 몽이" value={form.patientName ?? ""} onChange={(e) => set("patientName", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Field label="품종" required>
                  <input required type="text" placeholder="예: 말티즈" value={form.breed ?? ""} onChange={(e) => set("breed", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Field label="나이 (세)" required>
                  <input required type="text" placeholder="예: 5" value={form.age ?? ""} onChange={(e) => set("age", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900 text-sm">안내문 세부 정보</h2>
            </div>
            <div className="p-6 space-y-4">
              {messageType === "vaccination" && (
                <>
                  <Field label="접종 종류" required>
                    <select required value={form.vaccineType ?? ""} onChange={(e) => set("vaccineType", e.target.value)} className={inputCls + " bg-gray-50"}>
                      <option value="">선택하세요</option>
                      {VACCINE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="접종 예정일" required>
                    <input required type="date" value={form.vaccineDate ?? ""} onChange={(e) => set("vaccineDate", e.target.value)} className={inputCls} />
                  </Field>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">발송 시점</label>
                      {reminderDaysList.length < REMINDER_OPTIONS.length && (
                        <button type="button" onClick={addReminder}
                          className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                          추가
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {reminderDaysList.map((days, idx) => {
                        const usedValues = new Set(reminderDaysList.filter((_, i) => i !== idx));
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <select value={days} onChange={(e) => updateReminder(idx, e.target.value)} className={inputCls + " bg-gray-50 flex-1"}>
                              {REMINDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} disabled={usedValues.has(opt.value)}>{opt.label}</option>
                              ))}
                            </select>
                            {reminderDaysList.length > 1 && (
                              <button type="button" onClick={() => removeReminder(idx)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {reminderDaysList.length > 1 && (
                      <p className="text-xs text-teal-600 mt-2 font-medium">💡 {reminderDaysList.length}개 시점의 안내문이 각각 생성됩니다</p>
                    )}
                  </div>
                </>
              )}
              {(messageType === "pre-surgery" || messageType === "post-surgery") && (
                <>
                  <Field label="수술 종류" required>
                    <select required value={form.surgeryType ?? ""} onChange={(e) => set("surgeryType", e.target.value)} className={inputCls + " bg-gray-50"}>
                      <option value="">선택하세요</option>
                      {SURGERY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  {messageType === "post-surgery" && (
                    <Field label="처방약" required>
                      <input required type="text" placeholder="예: 항생제, 소염제, 진통제" value={form.medications ?? ""} onChange={(e) => set("medications", e.target.value)} className={inputCls} />
                    </Field>
                  )}
                  <Field label={messageType === "pre-surgery" ? "수술 예정일" : "다음 내원일 (실밥제거 등)"} required>
                    <input required type="date" value={form.nextVisit ?? ""} onChange={(e) => set("nextVisit", e.target.value)} className={inputCls} />
                  </Field>
                </>
              )}
              {messageType === "revisit" && (
                <>
                  <Field label="재내원 예정일" required>
                    <input required type="date" value={form.revisitDate ?? ""} onChange={(e) => set("revisitDate", e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="내원 사유">
                    <input type="text" placeholder="예: 실밥 제거, 검진, 추가 접종" value={form.revisitReason ?? ""} onChange={(e) => set("revisitReason", e.target.value)} className={inputCls} />
                  </Field>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 font-medium">⚠️ {error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-2xl transition-colors text-base shadow-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                AI 안내문 생성 중...
              </span>
            ) : (
              `✨ 안내문 생성하기${reminderDaysList.length > 1 ? ` (${reminderDaysList.length}개)` : ""}`
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">로딩 중...</div>}>
      <ComposeForm />
    </Suspense>
  );
}
