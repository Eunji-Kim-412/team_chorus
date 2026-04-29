import React, { useState, useEffect } from "react";

const FALLBACK_GUIDE = {
  dos: ["미지근한 물을 조금씩 자주 줍니다", "따뜻하고 조용한 곳에서 쉬게 합니다", "활동량과 식욕 변화를 꾸준히 관찰합니다"],
  donts: ["사람 음식을 주지 마세요", "인터넷 민간요법은 시도하지 마세요", "임의로 약을 먹이지 마세요"],
  warningsigns: ["12시간 이상 증상이 지속될 때", "혈변 또는 혈뇨가 보일 때", "의식이 흐려지거나 경련이 있을 때"],
};

const URGENCY_LABEL = [
  { max: 2.9, label: "거의 정상", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  { max: 4.9, label: "가벼운 이상", color: "#65a30d", bg: "#f7fee7", border: "#bef264" },
  { max: 6.9, label: "주의 필요", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { max: 8.9, label: "응급", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  { max: 10, label: "즉시 응급", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
];

function getUrgencyInfo(score) {
  return URGENCY_LABEL.find((u) => score <= u.max) || URGENCY_LABEL[URGENCY_LABEL.length - 1];
}

export default function HomecareGuide({ diagnosisResult, onBackToDiagnose, onGoToHospital }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const petContext = diagnosisResult?.petContext;
  const consolidatedUrgency = diagnosisResult?.consolidatedUrgency ?? 3.2;
  const consolidatedDiagnoses = diagnosisResult?.consolidatedDiagnoses ?? [{ name: "증상 분석 완료" }];

  const petName = petContext?.pet?.name || "우리 아이";
  const petBreed = petContext?.pet?.breed || "";
  const petAge = petContext?.pet?.age ? `${petContext.pet.age.years}살` : "";
  const diagnosisName = consolidatedDiagnoses?.[0]?.name || "증상 분석 완료";
  const urgencyInfo = getUrgencyInfo(consolidatedUrgency);

  useEffect(() => {
    const fetchGuide = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/homecare-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pet_type: petContext?.pet?.species || "dog",
            breed: petBreed,
            age_years: petContext?.pet?.age?.years || 0,
            medical_history: petContext?.pet?.medicalHistory || [],
            diagnosis_name: diagnosisName,
            urgency_score: consolidatedUrgency,
          }),
        });
        const data = await res.json();
        if (data.guide) {
          setGuide(data.guide);
        } else {
          setGuide(FALLBACK_GUIDE);
          setError("AI 가이드 생성 실패 — 기본 가이드를 표시합니다");
        }
      } catch (e) {
        setGuide(FALLBACK_GUIDE);
        setError("서버 연결 실패 — 기본 가이드를 표시합니다");
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, []);

  if (loading) {
    return (
      <div className="homecare-container">
        <div className="loading">
          <div className="spinner" />
          <p>Gemini가 홈케어 가이드를 작성 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="homecare-container">
      {error && (
        <div className="mock-banner">⚠️ {error}</div>
      )}

      {/* 펫 요약 칩 */}
      <div className="pet-chip">
        {petContext?.pet?.species === "cat" ? "🐱" : "🐶"} {petName}
        {petBreed && ` · ${petBreed}`}
        {petAge && ` · ${petAge}`}
      </div>

      {/* 위험도 헤더 */}
      <div
        className="urgency-header"
        style={{ background: urgencyInfo.bg, border: `1px solid ${urgencyInfo.border}` }}
      >
        <div className="urgency-score" style={{ color: urgencyInfo.color }}>
          {consolidatedUrgency.toFixed(1)}
          <span className="urgency-max"> / 10</span>
        </div>
        <div className="urgency-label" style={{ color: urgencyInfo.color }}>
          {urgencyInfo.label}
        </div>
        <div className="urgency-diagnosis">의심 증상: {diagnosisName}</div>
        <div className="urgency-message">
          집에서 잘 돌봐주시면 회복에 도움이 됩니다. 아래 가이드를 따라주세요.
        </div>
      </div>

      {/* 해야 할 것 */}
      <div className="guide-card guide-do">
        <div className="guide-card-header">
          <span className="guide-icon">✓</span>
          <h3>지금 해야 할 것</h3>
        </div>
        <ul>
          {guide.dos.map((item, i) => (
            <li key={i}>
              <span className="do-bullet">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 하지 말 것 */}
      <div className="guide-card guide-dont">
        <div className="guide-card-header">
          <span className="guide-icon">✗</span>
          <h3>절대 하지 말 것</h3>
        </div>
        <ul>
          {guide.donts.map((item, i) => (
            <li key={i}>
              <span className="dont-bullet">✗</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 악화 신호 */}
      <div className="guide-card guide-warning">
        <div className="guide-card-header">
          <span className="guide-icon">⚠️</span>
          <h3>이런 신호가 보이면 즉시 병원으로</h3>
        </div>
        <ul>
          {guide.warningsigns.map((item, i) => (
            <li key={i}>
              <span className="warning-bullet">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 하단 버튼 */}
      <div className="homecare-actions">
        <button className="action-btn-secondary" onClick={onBackToDiagnose}>
          상태가 나빠지면 다시 진단
        </button>
        <button className="action-btn-danger" onClick={onGoToHospital}>
          그래도 병원에 가고 싶어요
        </button>
      </div>

      {/* 고정 푸터 */}
      <div className="homecare-footer">
        본 가이드는 수의학적 진단을 대체하지 않습니다
      </div>
    </div>
  );
}
