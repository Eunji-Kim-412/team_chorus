"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MockPatient } from "@/lib/mockData";
import type { MessageType } from "@/lib/ai/types";
import { usePatients } from "@/context/PatientsContext";

type TabType = "all" | MessageType | "atRisk";

const TYPE_META: Record<MessageType, { label: string; icon: string; color: string; bg: string; tagLabel: string }> = {
  vaccination:    { label: "예방접종",   icon: "💉", color: "text-emerald-700", bg: "bg-emerald-50",  tagLabel: "접종 리마인드"  },
  "pre-surgery":  { label: "수술 전",    icon: "🏥", color: "text-blue-700",    bg: "bg-blue-50",     tagLabel: "수술 전 케어"   },
  "post-surgery": { label: "수술 후",    icon: "🐾", color: "text-violet-700",  bg: "bg-violet-50",   tagLabel: "수술 후 케어"   },
  revisit:        { label: "재내원",     icon: "📅", color: "text-amber-700",   bg: "bg-amber-50",    tagLabel: "재내원 안내"    },
};

const SAFETY_CHECKS = [
  "반려동물명·견종 포함",
  "수술명 보호자 언어로 변환",
  "주의사항·응급징후 포함",
  "과도한 의학 표현 없음",
  "진료기록 기반 생성",
  "과장·단정 표현 없음",
];

function dDayBadge(d: number) {
  if (d < 0) return { label: `D+${Math.abs(d)} 지남`, cls: "bg-red-100 text-red-700" };
  if (d === 0) return { label: "D-day", cls: "bg-orange-100 text-orange-700 font-bold" };
  return { label: `D-${d}`, cls: "bg-gray-100 text-gray-600" };
}

function statusBadge(p: MockPatient) {
  if (p.status === "sent") return { label: "발송 완료", cls: "bg-emerald-50 text-emerald-700" };
  if (p.dDay <= 0) return { label: "오늘 마감", cls: "bg-orange-100 text-orange-700 font-bold" };
  return { label: "검수 대기", cls: "bg-gray-100 text-gray-500" };
}

function formatDate(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDate(p: MockPatient) {
  return p.vaccineDate ?? p.nextVisit ?? p.revisitDate;
}

function getSampleMessage(p: MockPatient): string {
  switch (p.messageType) {
    case "post-surgery":
      return `안녕하세요, 우리동물병원입니다. 🐾\n${p.petName}(${p.breed}·${p.age}세)의 수술이 잘 끝났어요.\n\n오늘 받은 수술은 '${p.surgeryType}'입니다. 어긋나 있던 부위를 제자리로 교정하는 수술이에요.\n\n[집에서 꼭 지켜주세요]\n· 봉합 부위는 14일간 닿지 않게 해주세요\n· 점프·계단 오르내리기는 2주간 제한해주세요\n· 처방된 ${p.medications}은 하루 2회, 식사 후 급여해주세요\n\n[이럴 땐 바로 연락 주세요]\n· 봉합 부위가 붉게 붓거나 진물이 날 때\n· 식욕이 24시간 이상 없을 때\n\n다음 내원: ${formatDate(p.nextVisit)} (실밥 제거)\n궁금한 점 있으시면 언제든 연락 주세요.\n우리동물병원 드림`;
    case "vaccination":
      return `안녕하세요, 우리동물병원입니다. 💉\n${p.petName}(${p.breed}·${p.age}세) 예방접종 안내드려요.\n\n· 접종 종류: ${p.vaccineType}\n· 예정일: ${formatDate(p.vaccineDate)}\n\n당일 ${p.petName}의 컨디션이 좋지 않으면 미리 연락 주세요.\n접종 전 12시간 공복은 불필요하지만, 과격한 운동은 피해주세요.\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`;
    case "pre-surgery":
      return `안녕하세요, 우리동물병원입니다. 🏥\n${p.petName}(${p.breed}·${p.age}세) 수술 전 안내드려요.\n\n· 수술: ${p.surgeryType}\n· 수술 예정일: ${formatDate(p.nextVisit)}\n\n[수술 전 주의사항]\n· 수술 12시간 전부터 금식해주세요\n· 물은 6시간 전까지 가능해요\n· 당일 목욕은 피해주세요\n· 목걸이·하네스는 풀어서 내원해주세요\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`;
    case "revisit":
      return `안녕하세요, 우리동물병원입니다. 📅\n${p.petName}(${p.breed}·${p.age}세) 재내원 안내드려요.\n\n· 방문 사유: ${p.revisitReason}\n· 방문 예정일: ${formatDate(p.revisitDate)}\n\n예약 날짜에 맞춰 방문 부탁드려요.\n변경이 필요하시면 미리 연락 주세요.\n\n우리동물병원 드림`;
    default:
      return "";
  }
}

function getByteLength(str: string) {
  return new TextEncoder().encode(str).length;
}

function Sidebar({ active }: { active: "dashboard" | "marketing" }) {
  const navItems: { key: string; href: string; label: string; d: string; isNew?: boolean }[] = [
    { key: "dashboard", href: "/", label: "오늘의 케어 메시지", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "messages",  href: "/messages",          label: "메시지 관리",       d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
    { key: "report",    href: "/report",          label: "건강 레포트",        d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", isNew: true },
    { key: "pets",      href: "/pets",          label: "반려동물",          d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { key: "owners",    href: "/owners",          label: "보호자",            d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "templates", href: "/templates",          label: "템플릿",            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { key: "insight",   href: "/insight",          label: "케어 인사이트",      d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { key: "marketing", href: "/marketing", label: "마케팅 인사이트",    d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", isNew: true },
    { key: "auto",      href: "/automation",          label: "자동화 규칙",        d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 bottom-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-50">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-base">🐾</div>
        <div className="flex items-baseline gap-1">
          <span className="font-black text-gray-900 text-sm tracking-tight">Pawly</span>
          <span className="text-gray-400 text-xs">Care</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <Link key={item.key} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors ${
                isActive ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.d} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.isNew && <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-semibold">EMR 연동</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">우리엔 PMS</span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>연결됨
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">진료 문진 데이터를 분석해 보호자와 소통하고 마케팅 기회를 발굴합니다.</p>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { patients, updatePatient } = usePatients();
  const [selectedId, setSelectedId] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    const p = patients.find((x) => x.id === id);
    if (p) updatePatient(id, { status: p.status === "pending" ? "sent" : "pending" });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? patients[0] ?? null;
  const msg = selectedPatient ? getSampleMessage(selectedPatient) : "";
  const byteLen = getByteLength(msg);

  // 오늘 보낼 것: 발송 대기 중 우선순위(긴급/연체)순 상위 6건만 미리보기
  const todayList = [...patients]
    .filter((p) => p.status === "pending")
    .sort((a, b) => a.dDay - b.dDay)
    .slice(0, 6);

  const pending = patients.filter((p) => p.status === "pending").length;
  const todayDeadline = patients.filter((p) => p.dDay <= 0 && p.status === "pending").length;
  const sent = patients.filter((p) => p.status === "sent").length;
  const atRiskCount = patients.filter((p) => p.atRisk).length;

  const handleCompose = (p: MockPatient) => {
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
    <div className="min-h-screen bg-gray-50 flex">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
      <Sidebar active="dashboard" />

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-20 flex-shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm">🐾</div>
              <span className="font-black text-gray-900 text-sm">Pawly</span>
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3">
              <button className="relative">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white text-[7px] text-white flex items-center justify-center font-bold">3</span>
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-700 font-semibold hidden sm:block">우리동물병원</span>
                <svg className="w-3 h-3 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">김</div>
                <span className="text-gray-600 text-xs hidden sm:block">Dr. 김지연</span>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <div className="flex flex-1 min-h-0">
          {/* 메인 */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-6 py-6 space-y-5 max-w-3xl">

              {/* 인사 + CTA */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">Good morning, 우리동물병원 🐾</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    오늘 보호자에게 전달할 케어 메시지 <span className="font-bold text-gray-800">{pending}건</span>이 준비되어 있어요.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/compose?type=post-surgery")}
                  className="flex-shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI 케어 메시지 만들기
                </button>
              </div>

              {/* 통계 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", iconColor: "text-orange-400", label: "발송 대기", value: `${pending}건`, sub: "+2 전일 대비", subColor: "text-orange-500" },
                  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", iconColor: "text-red-400", label: "오늘 마감", value: `${todayDeadline}건`, sub: "긴급", subColor: "text-red-500 font-semibold" },
                  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", iconColor: "text-emerald-400", label: "발송 완료", value: `${sent}건`, sub: "+1 전일 대비", subColor: "text-emerald-600" },
                  { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", iconColor: "text-blue-400", label: "재방문 기여 매출", value: "₩168만", sub: "이번 달 · 전월 18건", subColor: "text-gray-400" },
                ].map((c) => (
                  <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className={`w-4 h-4 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
                      </svg>
                      <span className="text-xs text-gray-500">{c.label}</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{c.value}</div>
                    <div className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* 이탈 위험 배너 */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-amber-800">이탈 위험 환자 {atRiskCount + 10}마리</p>
                    <p className="text-xs text-amber-600 mt-0.5">마지막 내원 후 정기 검진 시기를 놓친 단골 환자에요. 케어 메시지로 다시 연결해 보세요.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/messages")}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
                >
                  일괄 메시지 보내기
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 오늘 보낼 것 (미리보기) */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">
                  오늘 보낼 것 <span className="text-gray-400 font-medium">{todayList.length}</span>
                </h2>
                <button onClick={() => router.push("/messages")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  전체 보기 →
                </button>
              </div>

              {/* 환자 목록 */}
              <div className="space-y-2">
                {todayList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
                    발송 대기 중인 환자가 없습니다.
                  </div>
                )}
                {todayList.map((p) => {
                  const meta = TYPE_META[p.messageType];
                  const dday = dDayBadge(p.dDay);
                  const status = statusBadge(p);
                  const isSelected = p.id === selectedId;
                  const date = getDate(p);
                  const dateStr = date ? new Date(date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }) : "";

                  return (
                    <div key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 cursor-pointer transition-all ${
                        isSelected ? "border-emerald-300 shadow-md ring-1 ring-emerald-200" : "border-gray-100 hover:border-emerald-200 hover:shadow-md"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-shrink-0 min-w-[76px]">
                        <p className="font-bold text-gray-900 text-sm">{p.petName}</p>
                        <p className="text-xs text-gray-400">{p.breed}·{p.age}세</p>
                      </div>
                      <div className="flex-shrink-0 min-w-[120px]">
                        <p className="text-sm text-gray-700 font-medium">{p.ownerName} 보호자</p>
                        <p className="text-xs text-gray-400">{p.ownerPhone}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${meta.bg} ${meta.color}`}>
                          {meta.tagLabel}
                        </span>
                        {dateStr && <p className="text-xs text-gray-500">{dateStr}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${dday.cls}`}>{dday.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(p.id); }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 transition-colors ${status.cls}`}
                      >
                        {status.label}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleCompose(p); }}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* 우측 미리보기 패널 */}
          <aside className="hidden xl:flex flex-col w-[420px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
            {selectedPatient ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">메시지 미리보기</h2>
                    <p className="text-xs text-gray-400 mt-0.5">환자를 선택하면 예상 메시지를 확인할 수 있어요</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">✨ AI 생성</span>
                </div>
                <div className="flex-1 px-6 py-5 space-y-5">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${TYPE_META[selectedPatient.messageType].bg}`}>
                      {TYPE_META[selectedPatient.messageType].icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">To. {selectedPatient.ownerName} 보호자</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedPatient.petName} · {selectedPatient.breed} · {selectedPatient.age}세</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${TYPE_META[selectedPatient.messageType].bg} ${TYPE_META[selectedPatient.messageType].color}`}>
                        {TYPE_META[selectedPatient.messageType].label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">메시지 내용</span>
                      <span className="text-[10px] text-gray-400">{byteLen} / 1,000 byte</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100 min-h-[200px]">
                      {msg}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">긴 안내문도 자동 분할 발송</p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-800">Safety Check</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">검수 통과</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SAFETY_CHECKS.map((item) => (
                        <div key={item} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
                    <span className="font-semibold">원진 진료 차트 · 우리엔 PMS</span> 데이터를 기반으로 AI가 보호자 맞춤 메시지를 자동 생성했어요.
                  </div>
                </div>
                <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={() => handleCompose(selectedPatient)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    수정하기
                  </button>
                  <button onClick={() => showToast(`${selectedPatient.ownerName} 보호자님께 메시지가 예약되었습니다`)}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                  >
                    발송 예약
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🐾</div>
                <div>
                  <p className="text-sm font-bold text-gray-700">환자를 선택해 주세요</p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">왼쪽 목록에서 환자를 클릭하면<br />메시지 미리보기가 표시돼요</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center py-3 gap-1 text-emerald-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-semibold">발송</span>
        </Link>
        <Link href="/marketing" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-semibold">마케팅</span>
        </Link>
      </nav>
    </div>
  );
}
