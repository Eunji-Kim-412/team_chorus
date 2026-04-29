import React from "react";
import ReactMarkdown from "react-markdown";

const MODEL_COLORS = { "Claude (Bedrock)": "#d97706", "GPT (OpenAI)": "#10a37f", "Gemini (Google)": "#4285f4" };

export default function SymptomSummaryCard({ petType, symptoms, results, summary, timestamp, onClose }) {
  const petLabel = petType === "dog" ? "🐶 강아지" : petType === "cat" ? "🐱 고양이" : petType;
  const timeLabel = timestamp ? new Date(timestamp).toLocaleString("ko-KR") : "";

  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="summary-card-modal">
        <div className="modal-header">
          <h2>📋 병원 방문용 증상 요약 카드</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="card-section">
          <h3>펫 기본 정보</h3>
          <p><strong>종:</strong> {petLabel}</p>
          {timeLabel && <p><strong>진단 시각:</strong> {timeLabel}</p>}
        </div>

        <div className="card-section">
          <h3>현재 증상 (보호자 입력)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{symptoms}</p>
        </div>

        {results && results.length > 0 && (
          <div className="card-section">
            <h3>AI 트리아지 결과 (모델별)</h3>
            <ul>
              {results.map((r) => (
                <li key={r.model} className="model-result-item" style={{ borderLeftColor: MODEL_COLORS[r.model] || "#d1d5db" }}>
                  <strong style={{ color: MODEL_COLORS[r.model] || "#374151" }}>{r.model}</strong>
                  {r.error
                    ? <span style={{ color: "#dc2626" }}>오류: {r.error}</span>
                    : <ReactMarkdown>{r.diagnosis}</ReactMarkdown>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary && (
          <div className="card-section">
            <h3>통합 진단 요약</h3>
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        )}

        <p className="disclaimer">
          ※ 본 내용은 AI 참고용이며 수의학적 진단을 대체하지 않습니다.
        </p>

        <button className="print-btn" onClick={handlePrint}>🖨️ 인쇄 / PDF로 저장</button>
      </div>
    </div>
  );
}
