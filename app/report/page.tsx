"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/context/PatientsContext";
import type { MockPatient } from "@/lib/mockData";

interface ReportSection { icon: string; title: string; body: string }
interface ReportData {
  petName: string;
  headline: string;
  sections: ReportSection[];
  reminders: string[];
  disclaimer: string;
  fallback?: boolean;
}

export default function ReportPage() {
  const { patients } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const selected: MockPatient | undefined = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

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
    const text =
      `${report.headline}\n\n` +
      report.sections.map((s) => `[${s.title}]\n${s.body}`).join("\n\n") +
      (report.reminders.length ? `\n\n[챙길 일정]\n` + report.reminders.map((r) => `· ${r}`).join("\n") : "") +
      `\n\n${report.disclaimer}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout active="report" title="건강 레포트">
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500 mb-5">
          환자의 진료 기록을 바탕으로 <span className="font-semibold text-gray-700">보호자용 건강 요약 레포트</span>를 AI가 자동 생성합니다.
        </p>

        {/* 환자 선택 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">환자 선택</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">환자를 선택하세요</option>
              {patients.slice(0, 60).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.petName} · {p.breed} · {p.age}세 · {p.ownerName} 보호자
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!selected || loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {loading ? "생성 중…" : "🤖 레포트 생성"}
          </button>
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
