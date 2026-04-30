import React from "react";

const MODEL_COLORS = {
  "Claude (Bedrock)": "#d97706",
  "Claude (Anthropic)": "#d97706",
  "GPT (OpenAI)": "#10a37f",
  "GPT-OSS (Bedrock)": "#10a37f",
  "Gemini (Google)": "#4285f4",
};

function displayModelName(fullName) {
  if (!fullName) return fullName;
  return fullName.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export default function SymptomSummaryCard({
  petType,
  symptoms,
  llmResponses = [],
  consolidated = null,
  timestamp,
  onClose,
}) {
  const petLabel = petType === "dog" ? "🐶 강아지" : petType === "cat" ? "🐱 고양이" : petType;
  const timeLabel = timestamp ? new Date(timestamp).toLocaleString("ko-KR") : "";
  const handlePrint = () => window.print();

  const rationales = consolidated?.modelRationales || [];
  const u = consolidated?.urgency;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="summary-card-modal">
        <div className="modal-header">
          <h2>📋 병원 방문용 증상 요약 카드</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="card-section">
          <h3>펫 기본 정보</h3>
          <p>
            <strong>종:</strong> {petLabel}
          </p>
          {timeLabel && (
            <p>
              <strong>진단 시각:</strong> {timeLabel}
            </p>
          )}
        </div>

        <div className="card-section">
          <h3>현재 증상 (보호자 입력)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{symptoms}</p>
        </div>

        {consolidated && (
          <div className="card-section">
            <h3>AI 통합 트리아지 결과</h3>
            {u && (
              <p>
                <strong>통합 위험도:</strong> {u.score} / 10 ({u.label}, 등급 {u.level})
              </p>
            )}
            <p>
              <strong>모델별 점수:</strong>{" "}
              {Object.entries(consolidated.modelScores || {})
                .map(([m, s]) => `${displayModelName(m)} ${s}`)
                .join(" / ") || "(없음)"}
            </p>
            {consolidated.consolidatedDiagnoses?.length > 0 && (
              <p>
                <strong>의심 진단:</strong>{" "}
                {consolidated.consolidatedDiagnoses
                  .map((d) => d.name)
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            )}
            {consolidated.redFlags?.length > 0 && (
              <p>
                <strong>주의 신호(Red Flags):</strong> {consolidated.redFlags.join(", ")}
              </p>
            )}
            <p>
              <strong>AI 합의:</strong>{" "}
              {consolidated.consensusType === "agreed" ? "의견 일치" : "의견 분기"}
            </p>
          </div>
        )}

        {rationales.length > 0 && (
          <div className="card-section">
            <h3>AI 모델별 근거</h3>
            <ul>
              {rationales.map((m) => (
                <li
                  key={m.model}
                  className="model-result-item"
                  style={{ borderLeftColor: MODEL_COLORS[m.model] || "#d1d5db" }}
                >
                  <strong style={{ color: MODEL_COLORS[m.model] || "#374151" }}>
                    {displayModelName(m.model)}
                  </strong>
                  <p>
                    위험도 {m.urgency_score} · 진단: {m.top_diagnosis || "(없음)"}
                  </p>
                  {m.reasoning && (
                    <p style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                      근거: {m.reasoning}
                    </p>
                  )}
                  {m.urgency_rationale && (
                    <p style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                      위험도 판단: {m.urgency_rationale}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {llmResponses.some((r) => r.status !== "success") && (
          <div className="card-section">
            <h3>분석 상태</h3>
            <ul>
              {llmResponses.map((r) => (
                <li key={r.modelName}>
                  <strong>{displayModelName(r.modelName)}:</strong> {r.status}
                  {r.errorMessage && (
                    <span style={{ color: "#dc2626", marginLeft: 8, fontSize: "0.85rem" }}>
                      {r.errorMessage.substring(0, 100)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="disclaimer">
          ※ 본 내용은 AI 참고용이며 수의학적 진단을 대체하지 않습니다.
        </p>

        <button className="print-btn" onClick={handlePrint}>
          🖨️ 인쇄 / PDF로 저장
        </button>
      </div>
    </div>
  );
}
