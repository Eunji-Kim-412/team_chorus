"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MockPatient } from "@/lib/mockData";

interface ReportSection { icon: string; title: string; body: string }
interface ReportData {
  petName: string;
  ownerName?: string;
  firstVisit?: string;
  lastVisit?: string;
  headline: string;
  sections: ReportSection[];
  reminders: string[];
  disclaimer: string;
  fallback?: boolean;
}

export default function ReportPage() {
  const { patients } = usePatients();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const selected: MockPatient | undefined = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  // 환자 이름(또는 보호자명)으로 검색
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => p.petName.toLowerCase().includes(q) || p.ownerName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [patients, query]);

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "레포트 생성에 실패했어요.");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    const meta =
      `보호자: ${report.ownerName ?? "-"}\n` +
      `최초 방문일: ${report.firstVisit ?? "-"} · 최근 방문일: ${report.lastVisit ?? "-"}\n\n`;
    const text =
      `${report.headline}\n\n` + meta +
      report.sections.map((s) => `[${s.title}]\n${s.body}`).join("\n\n") +
      (report.reminders.length ? `\n\n[챙길 일정]\n` + report.reminders.map((r) => `· ${r}`).join("\n") : "") +
      `\n\n${report.disclaimer}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 레포트 내용을 보호자용 SMS로 변환해 발송 흐름(/result)으로 전달
  const sendToOwner = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push(`${report.ownerName ?? ""} 보호자님, 안녕하세요. 우리동물병원입니다 🐾`.trim());
    lines.push(`${report.petName}의 건강 안내를 전해드려요.`);
    lines.push("");
    // 관리/회복/주의/팁 관련 섹션 발췌
    const care = report.sections.find((s) => /관리|팁|회복|주의|요약/.test(s.title));
    if (care) { lines.push(care.body); lines.push(""); }
    if (report.reminders.length) {
      lines.push("[챙겨주실 일정]");
      report.reminders.forEach((r) => lines.push(`· ${r}`));
      lines.push("");
    }
    lines.push("궁금하신 점은 언제든 병원으로 연락 주세요. 감사합니다 :)");

    sessionStorage.setItem("vetscribe_result", JSON.stringify({
      message: lines.join("\n"),
      messages: null,
      patientName: report.petName,
      messageType: "report",
      language: "ko",
    }));
    router.push("/result");
  };

  return (
    <AppLayout active="report" title="건강 레포트">
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500 mb-5">
          환자의 진료 기록을 바탕으로 <span className="font-semibold text-gray-700">보호자용 건강 요약 레포트</span>를 AI가 자동 생성합니다.
        </p>

        {/* 환자 검색 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">환자 이름 검색</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPatientId(""); }}
              placeholder="반려동물 이름 또는 보호자명을 입력하세요"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* 검색 결과 */}
          {query.trim() && (
            <div className="mt-3 space-y-1.5">
              {matches.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">검색 결과가 없어요.</p>
              ) : (
                matches.map((p) => {
                  const active = p.id === patientId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPatientId(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        active ? "bg-emerald-50 border-emerald-300" : "bg-gray-50 border-gray-200 hover:border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{p.petName}</span>
                        <span className="text-xs text-gray-400">{p.breed} · {p.age}세</span>
                        {p.atRisk && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">이탈 위험</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <span className="text-gray-500">보호자 <span className="font-semibold text-gray-700">{p.ownerName}</span></span>
                        <span className="text-gray-500">최근 방문 <span className="font-semibold text-gray-700">{p.lastVisit ?? "-"}</span></span>
                        <span className="text-gray-500">최초 방문 <span className="font-semibold text-gray-700">{p.firstVisit ?? "-"}</span></span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* 선택된 환자 + 생성 버튼 */}
          {selected && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-100">
              <div className="flex-1 text-sm">
                <span className="font-bold text-gray-900">{selected.petName}</span>
                <span className="text-gray-500"> · {selected.ownerName} 보호자 · 최근 방문 {selected.lastVisit ?? "-"}</span>
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                {loading ? "생성 중…" : "🤖 레포트 생성"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* 레포트 */}
        {report && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-50/80 mb-0.5">
                    Pawly 건강 레포트 · {report.fallback ? "규칙 기반" : "AI 생성"}
                  </p>
                  <h2 className="text-lg font-black">{report.headline}</h2>
                </div>
                <span className="text-3xl">🐾</span>
              </div>
              {/* 보호자명 · 방문일 메타 */}
              <div className="mt-3 grid grid-cols-3 gap-2 bg-white/10 rounded-xl px-3 py-2.5 text-[11px]">
                <div>
                  <p className="text-emerald-50/70">보호자</p>
                  <p className="font-bold">{report.ownerName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-emerald-50/70">최근 방문일</p>
                  <p className="font-bold">{report.lastVisit ?? "-"}</p>
                </div>
                <div>
                  <p className="text-emerald-50/70">최초 방문일</p>
                  <p className="font-bold">{report.firstVisit ?? "-"}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {report.sections.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{s.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                  </div>
                </div>
              ))}

              {report.reminders.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-2">📌 챙길 일정</p>
                  <ul className="space-y-1">
                    {report.reminders.map((r, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <span>·</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">{report.disclaimer}</p>

              <button
                onClick={sendToOwner}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                📩 보호자에게 안내사항 보내기
              </button>
              <div className="flex gap-2">
                <button
                  onClick={copyReport}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-bold transition-colors"
                >
                  {copied ? "✅ 복사됨" : "📋 레포트 복사"}
                </button>
                <button
                  onClick={generate}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  다시 생성
                </button>
              </div>
            </div>
          </div>
        )}

        {!report && !loading && (
          <div className="text-center text-sm text-gray-400 py-12">환자를 선택하고 레포트를 생성해 보세요 🐾</div>
        )}
      </div>
    </AppLayout>
  );
}
