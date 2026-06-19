"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MockPatient } from "@/lib/mockData";
import type { MessageType } from "@/lib/ai/types";

const TYPE_META: Record<MessageType, { label: string; icon: string; color: string; bg: string; ring: string }> = {
  vaccination:    { label: "예방접종", icon: "💉", color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-300" },
  "pre-surgery":  { label: "수술 전",  icon: "🏥", color: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-300"    },
  "post-surgery": { label: "수술 후",  icon: "🐾", color: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-300"  },
  revisit:        { label: "재내원",   icon: "📅", color: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-300"   },
};

const BREED_EMOJI: Record<string, string> = {
  "푸들": "🐩", "말티즈": "🐶", "시츄": "🐕", "비숑프리제": "🐾",
  "웰시코기": "🐕", "진돗개": "🐕", "골든리트리버": "🦮",
  "포메라니안": "🐶", "치와와": "🐶", "닥스훈트": "🐕",
};

const MESSAGE_TYPES: MessageType[] = ["vaccination", "pre-surgery", "post-surgery", "revisit"];

type TypeFilter = "all" | MessageType | "atRisk";
type AgeFilter = "all" | "young" | "adult" | "senior";

interface PetForm {
  petName: string; breed: string; age: string;
  ownerName: string; ownerPhone: string; messageType: MessageType;
}
const EMPTY_FORM: PetForm = { petName: "", breed: "", age: "", ownerName: "", ownerPhone: "", messageType: "vaccination" };

export default function PetsPage() {
  const { patients, addPatient, updatePatient, deletePatient } = usePatients();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PetForm>(EMPTY_FORM);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const openAdd  = () => { setEditId(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p: MockPatient) => {
    setEditId(p.id);
    setForm({ petName: p.petName, breed: p.breed, age: p.age, ownerName: p.ownerName, ownerPhone: p.ownerPhone, messageType: p.messageType });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.petName.trim() || !form.breed.trim() || !form.ownerName.trim()) return;
    if (editId) { await updatePatient(editId, form); showToast("수정됐어요!"); }
    else {
      await addPatient({ id: String(Date.now()), ...form, dDay: 0, status: "pending" });
      showToast("새 반려동물이 등록됐어요!");
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => { await deletePatient(id); setShowModal(false); showToast("삭제됐어요."); };

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const searchOk = !q || p.petName.includes(q) || p.breed.toLowerCase().includes(q) || p.ownerName.includes(q);
    const typeOk = typeFilter === "all" || (typeFilter === "atRisk" ? p.atRisk : p.messageType === typeFilter);
    const age = parseInt(p.age);
    const ageOk = ageFilter === "all"
      || (ageFilter === "young"  && age <= 3)
      || (ageFilter === "adult"  && age >= 4 && age <= 8)
      || (ageFilter === "senior" && age >= 9);
    return searchOk && typeOk && ageOk;
  });

  const typeCounts: Record<string, number> = {};
  for (const p of patients) typeCounts[p.messageType] = (typeCounts[p.messageType] ?? 0) + 1;
  const atRiskCount = patients.filter((p) => p.atRisk).length;

  return (
    <AppLayout active="pets" title="반려동물">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          {toast}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-gray-900 text-lg mb-5">{editId ? "반려동물 정보 수정" : "새 반려동물 등록"}</h2>
            <div className="space-y-3">
              {[
                { label: "반려동물 이름 *", key: "petName", placeholder: "예: 보리" },
                { label: "품종 *", key: "breed", placeholder: "예: 푸들" },
                { label: "나이 (세)", key: "age", placeholder: "예: 3" },
                { label: "보호자 이름 *", key: "ownerName", placeholder: "예: 이서연" },
                { label: "연락처", key: "ownerPhone", placeholder: "010-0000-0000" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder={placeholder} value={form[key as keyof PetForm]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">메시지 유형</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={form.messageType} onChange={(e) => setForm((f) => ({ ...f, messageType: e.target.value as MessageType }))}>
                  {MESSAGE_TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t].icon} {TYPE_META[t].label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              {editId && <button onClick={() => handleDelete(editId)} className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50">삭제</button>}
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={handleSave} disabled={!form.petName.trim() || !form.breed.trim() || !form.ownerName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40">
                {editId ? "저장" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 font-medium">총 <span className="font-black text-gray-900">{filtered.length}</span>마리</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input type="text" placeholder="이름·품종·보호자 검색" value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl whitespace-nowrap">
              <span>+</span> 새 반려동물
            </button>
          </div>
        </div>

        {/* 메시지 유형 필터 */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all",   label: "전체",      icon: "🐾", cnt: patients.length },
            { key: "vaccination",    label: "예방접종", icon: "💉", cnt: typeCounts["vaccination"] ?? 0 },
            { key: "pre-surgery",    label: "수술 전",  icon: "🏥", cnt: typeCounts["pre-surgery"] ?? 0 },
            { key: "post-surgery",   label: "수술 후",  icon: "🐾", cnt: typeCounts["post-surgery"] ?? 0 },
            { key: "revisit",        label: "재내원",   icon: "📅", cnt: typeCounts["revisit"] ?? 0 },
            { key: "atRisk",         label: "이탈위험", icon: "⚠️", cnt: atRiskCount },
          ] as { key: TypeFilter; label: string; icon: string; cnt: number }[]).map((f) => {
            const active = typeFilter === f.key;
            const meta = f.key !== "all" && f.key !== "atRisk" ? TYPE_META[f.key as MessageType] : null;
            return (
              <button key={f.key} onClick={() => setTypeFilter(active ? "all" : f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? meta ? `${meta.bg} ${meta.color} ring-2 ${meta.ring}` : f.key === "atRisk" ? "bg-red-100 text-red-700 ring-2 ring-red-300" : "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                <span>{f.icon}</span> {f.label} <span className="opacity-60">{f.cnt}</span>
              </button>
            );
          })}
        </div>

        {/* 나이 필터 */}
        <div className="flex gap-2">
          {([
            { key: "all",    label: "전체 나이" },
            { key: "young",  label: "🐣 어린 (1-3세)" },
            { key: "adult",  label: "🐕 성체 (4-8세)" },
            { key: "senior", label: "🦴 시니어 (9세+)" },
          ] as { key: AgeFilter; label: string }[]).map((f) => (
            <button key={f.key} onClick={() => setAgeFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                ageFilter === f.key ? "bg-gray-900 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const meta  = TYPE_META[p.messageType];
            const emoji = BREED_EMOJI[p.breed];
            const age   = parseInt(p.age);
            const ageTag = age <= 3 ? "🐣 어린" : age >= 9 ? "🦴 시니어" : null;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${emoji ? "bg-gray-50" : meta.bg}`}>
                    {emoji ?? <span className={`font-black text-lg ${meta.color}`}>{p.breed.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/pets/${p.id}`} className="font-bold text-gray-900 hover:text-emerald-600 hover:underline">{p.petName}</Link>
                      {p.atRisk && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠️ 위험</span>}
                      {ageTag && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{ageTag}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{p.breed} · {p.age}세</p>
                  </div>
                  <button onClick={() => openEdit(p)} className="text-xs font-semibold text-gray-400 hover:text-emerald-600 border border-gray-200 hover:border-emerald-300 px-2 py-1 rounded-lg">수정</button>
                </div>
                <div className="space-y-1 border-t border-gray-50 pt-2.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="font-medium text-gray-700">{p.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.5 10.5a11.02 11.02 0 005 5l1.113-1.724a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span>{p.ownerPhone}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.bg} ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-medium">조건에 맞는 반려동물이 없습니다.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
