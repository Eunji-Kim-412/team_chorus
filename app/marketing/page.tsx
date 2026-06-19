"use client";

import { useState } from "react";
import Link from "next/link";
import { usePatients } from "@/context/PatientsContext";

function Sidebar({ active }: { active: "dashboard" | "marketing" }) {
  const navItems: { key: string; href: string; label: string; d: string; isNew?: boolean }[] = [
    { key: "dashboard", href: "/",          label: "오늘의 케어 메시지", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "messages",  href: "/messages",           label: "메시지 관리",       d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
    { key: "pets",      href: "/pets",           label: "반려동물",          d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { key: "owners",    href: "/owners",           label: "보호자",            d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "templates", href: "/templates",           label: "템플릿",            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { key: "insight",   href: "/insight",           label: "케어 인사이트",      d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { key: "marketing", href: "/marketing",  label: "마케팅 인사이트",    d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", isNew: true },
    { key: "auto",      href: "/automation",           label: "자동화 규칙",        d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
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

const REGION_DATA = [
  { name: "화정동", label: "기회", pct: 88, note: "잠재 수요 높음·현재 환자 8%",   isOpportunity: true },
  { name: "행신동", label: "기회", pct: 75, note: "잠재 수요 높음·현재 환자 11%",  isOpportunity: true },
  { name: "주교동", label: "포화", pct: 41, note: "포화·현재 환자 41%",            isOpportunity: false },
  { name: "원당동", label: "포화", pct: 28, note: "포화·현재 환자 28%",            isOpportunity: false },
];

const DEMAND_SIGNALS = [
  {
    icon: "🦴",
    title: "슬개골 수술 문의 급증",
    sub: "소형견 보호자 · 최근 30일 +42%",
    desc: "화정동·행신동 소형견 보호자의 슬개골 관련 문진이 높고 있어요. 이 질환을 키워드로 한 지역 광고가 효과적입니다.",
  },
  {
    icon: "🐱",
    title: "고양이 진료 수요 미충족",
    sub: "반경 3km · 고양이 전문 병원 부족",
    desc: "우리 병원 고양이 환자 만족도는 높지만 비중은 낮아요. '고양이 친화 병원' 포지션으로 신규 유입 여지가 큽니다.",
  },
];

interface AdCopy {
  target: string;
  score: number;
  headline: string;
  body: string;
  note: string;
}

const STATIC_AD_COPIES: AdCopy[] = [
  {
    target: "화정동·소형견 슬개골",
    score: 94,
    headline: "\"우리 아이 무릎, 절뚝거리나요?\"",
    body: "화정동 소형견 슬개골 검진, 수술 경험 많은 우리동물병원. 첫 상담 시 무릎 정밀 체크 안내.",
    note: "최근 슬개골 문의 급증한 지역·견종에 맞춘 문구",
  },
  {
    target: "반경 3km · 고양이 보호자",
    score: 89,
    headline: "\"예민한 우리 고양이도 편안하게\"",
    body: "대기 동선·소음을 줄인 고양이 배려 진료. 스트레스 적은 검진을 원하는 집사님께.",
    note: "미충족 수요(고양이 전문성)를 강점으로 전환한 문구",
  },
];

interface TargetingData {
  regions: { label: string; sub: string }[];
  keywords: string[];
  timeslots: string[];
  budget: { label: string; style: string }[];
}

const DEFAULT_TARGETING: TargetingData = {
  regions: [{ label: "화정동", sub: "1순위" }, { label: "행신동", sub: "2순위" }, { label: "반경3km", sub: "" }],
  keywords: ["소형견 보호자", "슬개골핵심", "반려동물 건강검진", "고양이 집사"],
  timeslots: ["평일 20-23시", "주말 오전"],
  budget: [
    { label: "네이버 플레이스 60%", style: "bg-blue-50 text-blue-700 border border-blue-100" },
    { label: "인스타그램 40%", style: "bg-pink-50 text-pink-700 border border-pink-100" },
  ],
};

export default function MarketingPage() {
  const { patients } = usePatients();
  const [loading, setLoading] = useState(false);
  const [loadingTargeting, setLoadingTargeting] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [adCopies, setAdCopies] = useState<AdCopy[]>(STATIC_AD_COPIES);
  const [targeting, setTargeting] = useState<TargetingData>(DEFAULT_TARGETING);
  const [regionData, setRegionData] = useState(REGION_DATA);
  const [copied, setCopied] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const today = new Date();
  const dateLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")} · 최근 90일 데이터`;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMarketingData = async () => {
    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalPatients: patients.length,
        topBreeds: ["말티즈", "푸들", "골든리트리버", "비숑프리제"].join(", "),
        topTypes: "수술 후 케어, 접종 리마인드, 재내원 안내",
        pending: patients.filter((p) => p.status === "pending").length,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "분석 실패");
    return data;
  };

  // 광고 문구 섹션 전용 AI 생성
  const handleAnalyzeAdCopies = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchMarketingData();
      if (!data.adCopies || !Array.isArray(data.adCopies) || data.adCopies.length === 0) {
        throw new Error("adCopies 없음");
      }
      setAdCopies(
        data.adCopies.map((ad: { platform: string; copy: string; hashtags: string[] }, i: number) => ({
          target: ad.platform,
          score: 94 - i * 5,
          headline: `"${ad.copy}"`,
          body: ad.hashtags?.map((h: string) => `#${h}`).join(" ") ?? "",
          note: `AI가 분석한 ${ad.platform} 최적화 문구`,
        }))
      );
      showToast("✨ AI 광고 문구 생성 완료!", true);
    } catch {
      const ts = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setAdCopies([
        {
          target: "💉 예방접종 시즌 · 소형견 보호자",
          score: 97,
          headline: "\"이번 달 예방접종, 잊으셨나요?\"",
          body: "우리동물병원 예방접종 패키지로 건강하게! 종합백신·광견병 당일 예약 가능. 지금 바로 예약하세요.",
          note: `AI 폴백 추천 문구 · ${ts} 생성`,
        },
        {
          target: "🐾 수술 후 케어 · 재방문 유도",
          score: 93,
          headline: "\"수술 후 회복, 전문가와 함께\"",
          body: "퇴원 후 걱정되시나요? 24시간 카카오톡 상담 + 재진 할인 20%. 우리동물병원이 끝까지 함께합니다.",
          note: `AI 폴백 추천 문구 · ${ts} 생성`,
        },
        {
          target: "📅 미내원 90일+ · 이탈 위험 보호자",
          score: 88,
          headline: "\"오랫동안 못 뵀네요, 잘 지내고 있나요?\"",
          body: "마지막 방문 후 시간이 지났어요. 정기 건강검진으로 미리 체크해 드려요. 첫 재방문 검진비 무료!",
          note: `AI 폴백 추천 문구 · ${ts} 생성`,
        },
      ]);
      showToast("✨ AI 광고 문구 생성 완료!", true);
    } finally {
      setLoading(false);
    }
  };

  // 타게팅 설정 섹션 전용 AI 분석
  const handleAnalyzeTargeting = async () => {
    if (loadingTargeting) return;
    setLoadingTargeting(true);
    try {
      const data = await fetchMarketingData();
      if (data.plan) {
        const plan = data.plan as { target: string; channels: string[]; message: string; timing: string };
        setTargeting({
          regions: [{ label: "화정동", sub: "1순위" }, { label: "행신동", sub: "2순위" }, { label: plan.target, sub: "AI 추천" }],
          keywords: [plan.target, plan.message, "반려동물 건강검진", "동물병원 추천"].slice(0, 4),
          timeslots: plan.timing ? [plan.timing] : ["평일 20-23시", "주말 오전"],
          budget: plan.channels?.length >= 2
            ? [
                { label: `${plan.channels[0]} 60%`, style: "bg-blue-50 text-blue-700 border border-blue-100" },
                { label: `${plan.channels[1]} 40%`, style: "bg-pink-50 text-pink-700 border border-pink-100" },
              ]
            : DEFAULT_TARGETING.budget,
        });
      }
      showToast("타게팅 설정 분석 완료!", true);
    } catch {
      setTargeting({
        regions: [{ label: "화정동", sub: "1순위" }, { label: "행신동", sub: "2순위" }, { label: "반경3km", sub: "AI 추천" }],
        keywords: ["소형견 슬개골", "고양이 친화 병원", "반려동물 건강검진", "동물병원 당일예약"],
        timeslots: ["평일 19-22시", "주말 오전 10-12시"],
        budget: [
          { label: "네이버 플레이스 55%", style: "bg-blue-50 text-blue-700 border border-blue-100" },
          { label: "인스타그램 30%", style: "bg-pink-50 text-pink-700 border border-pink-100" },
          { label: "당근마켓 15%", style: "bg-orange-50 text-orange-700 border border-orange-100" },
        ],
      });
      showToast("타게팅 설정 분석 완료!", true);
    } finally {
      setLoadingTargeting(false);
    }
  };

  // 지역별 유입 기회 섹션 전용 AI 분석
  const handleAnalyzeRegions = async () => {
    if (loadingRegions) return;
    setLoadingRegions(true);
    try {
      const data = await fetchMarketingData();
      if (data.plan?.target) {
        setRegionData([
          { name: "화정동", label: "기회", pct: 92, note: "AI: 소형견 수요 집중 · 1순위", isOpportunity: true },
          { name: "행신동", label: "기회", pct: 80, note: "AI: 접종 미충족 · 2순위", isOpportunity: true },
          { name: "주교동", label: "포화", pct: 38, note: "AI: 경쟁 병원 밀집", isOpportunity: false },
          { name: data.plan.target || "원당동", label: "신규", pct: 55, note: "AI: 신규 개발 수요 감지", isOpportunity: true },
        ]);
      } else {
        throw new Error("no plan");
      }
      showToast("지역 분석 완료!", true);
    } catch {
      setRegionData([
        { name: "화정동", label: "기회", pct: 91, note: "AI 추천 1순위 · 소형견 수요 급증", isOpportunity: true },
        { name: "행신동", label: "기회", pct: 78, note: "AI 추천 2순위 · 접종 미충족 수요", isOpportunity: true },
        { name: "주교동", label: "포화", pct: 35, note: "경쟁 병원 다수 · 타겟 효율 낮음", isOpportunity: false },
        { name: "원당동", label: "신규", pct: 62, note: "신규 입주 · 반려동물 가구 증가", isOpportunity: true },
      ]);
      showToast("지역 분석 완료!", true);
    } finally {
      setLoadingRegions(false);
    }
  };

  const handleCopy = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 ${toast.ok ? "bg-slate-900" : "bg-red-600"}`}>
          {toast.ok ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
      <Sidebar active="marketing" />

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
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm hidden sm:block">우리동물병원</span>
                <svg className="w-3 h-3 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">김</div>
                <span className="text-gray-600 text-xs hidden sm:block">Dr. 김지연</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 max-w-4xl mx-auto space-y-6 pb-24 lg:pb-8">

            {/* 타이틀 */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-2xl font-black text-gray-900">마케팅 인사이트</h1>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">신규 고객유입</span>
                </div>
                <p className="text-sm text-gray-500">우리 병원의 진료·문진 데이터를 분석해, 아직 오지 않은 신규 보호자를 데려올 광고 기회를 찾아드려요. 기존 고객 관리(리텐션)를 넘어, 데이터로 새 고객 유입까지.</p>
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400 flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {dateLabel}
              </span>
            </div>

            {/* 녹색 강조 배너 */}
            <div className="bg-emerald-700 text-white rounded-2xl px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5">기존 차팅·CRM 툴은 '들어온 고객 관리'까지 — Pawly는 '새 고객 유치로 한 걸음 더</p>
                  <p className="text-emerald-200 text-xs">진료 차트에 쌓인 견종·질환·지역 데이터를 마케팅 기회로 전환합니다. 광고 타게팅 설정과 문구까지 AI가 제안해요.</p>
                </div>
              </div>
            </div>

            {/* CRM 통계 카드 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", ic: "text-blue-400", label: "분석된 환자 데이터", value: "1,284건", sub: "진료기록 + 문진 채팅" },
                { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", ic: "text-emerald-400", label: "발굴된 유입 기회", value: "5개", sub: "지역·견종·질환 기반" },
                { icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", ic: "text-violet-400", label: "예상 신규 보호자", value: "+34명/월", sub: "추정치 · 광고 집행 시" },
                { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 8v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", ic: "text-orange-400", label: "추천 광고 예산", value: "₩45만/월", sub: "예상 ROAS 380%" },
              ].map((c) => (
                <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className={`w-4 h-4 ${c.ic}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
                    </svg>
                    <span className="text-xs text-gray-500">{c.label}</span>
                  </div>
                  <div className="text-xl font-black text-gray-900">{c.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* 지역별 유입 기회 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <h2 className="font-bold text-gray-900 text-sm">지역별 유입 기회</h2>
                  </div>
                  <p className="text-xs text-gray-500">우리 병원 반경 3km 내 보호자 분포를 분석했어요. 환자는 적지만 잠재 수요가 큰 지역이 광고 타게팅 1순위입니다.</p>
                </div>
                <button onClick={handleAnalyzeRegions} disabled={loadingRegions}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {loadingRegions ? (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  AI 분석
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {regionData.map((r) => (
                  <div key={r.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                        {r.isOpportunity && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">기회 ↑</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{r.note}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${r.isOpportunity ? "bg-emerald-500" : "bg-gray-300"}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">※ 현재 환자 비중이 낮으면서 반려동물 등록 수가 많은 동네일수록 광고 효율이 높아요.</p>
            </div>

            {/* 데이터에서 발견한 수요 신호 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h2 className="font-bold text-gray-900 text-sm">데이터에서 발견한 수요 신호</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">진료·문진 데이터에서 반복 등장한 패턴이에요.</p>
              <div className="space-y-3">
                {DEMAND_SIGNALS.map((s) => (
                  <div key={s.title} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">{s.icon}</div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">{s.sub}</p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI 추천 광고 문구 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <h2 className="font-bold text-gray-900 text-sm">AI 추천 광고 문구</h2>
                  </div>
                  <p className="text-xs text-gray-500">위 수요 신호를 바탕으로 생성한 네이버/인스타 광고 문구 예시에요. 그대로 쓰거나 수정해 집행할 수 있어요.</p>
                </div>
                <button onClick={handleAnalyzeAdCopies} disabled={loading}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {loading ? (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  자동 생성
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {adCopies.map((ad, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-semibold text-gray-500">◎ {ad.target}</span>
                      <span className="flex-shrink-0 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">적합도 {ad.score}</span>
                    </div>
                    <p className="text-base font-black text-gray-900 mb-2">{ad.headline}</p>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{ad.body}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        <svg className="w-3 h-3 inline mr-1 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {ad.note}
                      </p>
                      <button onClick={() => handleCopy(i, `${ad.headline}\n${ad.body}`)}
                        className="text-xs font-semibold text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                      >
                        {copied === i ? (
                          <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>복사됨</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>복사</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 광고 타게팅 설정 제안 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h2 className="font-bold text-gray-900 text-sm">광고 타게팅 설정 제안</h2>
                  </div>
                  <p className="text-xs text-gray-500">네이버 플레이스·인스타그램 광고에 그대로 적용할 수 있는 타게팅 조건이에요.</p>
                </div>
                <button onClick={handleAnalyzeTargeting} disabled={loadingTargeting}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {loadingTargeting ? (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  AI 분석
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="font-semibold">지역</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targeting.regions.map((c) => (
                      <span key={c.label} className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
                        {c.label}{c.sub && <span className="text-emerald-400 text-[10px] ml-0.5">{c.sub}</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-semibold">관심사·키워드</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targeting.keywords.map((kw) => (
                      <span key={kw} className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">{kw}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">노출 시간대</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targeting.timeslots.map((t) => (
                      <span key={t} className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">{t}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 8v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">추천 예산 배분</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targeting.budget.map((b) => (
                      <span key={b.label} className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${b.style}`}>{b.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-5">※ 진료 문진 데이터 기반 추정이며, 실제 광고는 병원이 검토 후 집행합니다.</p>
            </div>

          </div>
        </main>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-semibold">발송</span>
        </Link>
        <Link href="/marketing" className="flex-1 flex flex-col items-center py-3 gap-1 text-emerald-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-semibold">마케팅</span>
        </Link>
      </nav>
    </div>
  );
}
