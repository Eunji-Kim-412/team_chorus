import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { diagnose, getHistory } from "./api";
import HospitalSection from "./HospitalSection";
import SymptomSummaryCard from "./SymptomSummaryCard";

const MODEL_COLORS = { "Claude (Bedrock)": "#d97706", "GPT (OpenAI)": "#10a37f", "Gemini (Google)": "#4285f4" };

const MOCK_RESULT = {
  needs_hospital: true,
  summary: "반복적인 구토와 식욕 저하가 있어 오늘 중 동물병원 방문을 권장합니다.",
  results: [
    {
      model: "Claude (Bedrock)",
      diagnosis: "**의심 진단:** 급성 위장염 또는 이물질 섭취\n\n반복적인 구토와 식욕 저하는 위장관 자극 또는 이물질에 의한 폐색 가능성을 시사합니다. 탈수 증상 여부를 확인하고 오늘 중 수의사 진료를 받으세요.\n\n- 위험도: **8.0 / 10**\n- Red flags: 혈변, 12시간 이상 지속 구토",
      error: null,
    },
    {
      model: "GPT (OpenAI)",
      diagnosis: "**의심 진단:** 위장관 장애 (위염 또는 장염)\n\n증상 패턴상 위염 또는 장염이 가장 유력합니다. 음수 거부가 동반된다면 탈수 위험이 높으므로 즉시 병원을 방문하세요.\n\n- 위험도: **7.5 / 10**\n- Red flags: 무기력증, 지속적 식욕 부진",
      error: null,
    },
    {
      model: "Gemini (Google)",
      diagnosis: "**의심 진단:** 급성 위염 또는 췌장염\n\n구토 반복과 식욕 저하의 조합은 췌장염 가능성도 배제할 수 없습니다. 지방이 많은 음식 섭취 이력이 있다면 더욱 주의가 필요합니다.\n\n- 위험도: **8.2 / 10**\n- Red flags: 복부 팽만, 황달",
      error: null,
    },
  ],
};

export default function MainPage() {
  const [petType, setPetType] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState("");
  const [needsHospital, setNeedsHospital] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("diagnose");
  const [history, setHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [diagnosisTime, setDiagnosisTime] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const applyDiagnosisData = (data) => {
    setResults(data.results);
    setSummary(data.summary || "");
    setNeedsHospital(data.needs_hospital || false);
    setDiagnosisTime(new Date());
    if (data.needs_hospital) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  };

  const handleDiagnose = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setSummary("");
    setNeedsHospital(false);
    setFetchError("");
    try {
      const data = await diagnose(petType, symptoms);
      applyDiagnosisData(data);
    } catch (err) {
      setFetchError(err.message || "서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleMockTest = () => {
    setFetchError("");
    setResults([]);
    setSummary("");
    setNeedsHospital(false);
    if (!petType) setPetType("dog");
    if (!symptoms) setSymptoms("어제부터 구토를 3번 했고, 사료를 전혀 먹지 않으려 합니다. 기운도 없어 보여요.");
    applyDiagnosisData(MOCK_RESULT);
  };

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data.history);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  return (
    <div className="main-container">
      <header>
        <h1>🐾 펫 건강 체커</h1>
        <nav>
          <button className={tab === "diagnose" ? "active" : ""} onClick={() => setTab("diagnose")}>진단하기</button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>상담 기록</button>
        </nav>
      </header>

      {tab === "diagnose" && (
        <div className="diagnose-section">
          <form onSubmit={handleDiagnose}>
            <div className="pet-select">
              <label className={petType === "dog" ? "selected" : ""}>
                <input type="radio" name="pet" value="dog" onChange={() => setPetType("dog")} checked={petType === "dog"} /> 🐶 강아지
              </label>
              <label className={petType === "cat" ? "selected" : ""}>
                <input type="radio" name="pet" value="cat" onChange={() => setPetType("cat")} checked={petType === "cat"} /> 🐱 고양이
              </label>
            </div>
            <textarea placeholder="증상을 자세히 입력해주세요. 예: 식욕이 없고 구토를 하며 기운이 없어요" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} required />
            <button type="submit" disabled={!petType || loading}>{loading ? "AI 분석 중..." : "진단 요청"}</button>
          </form>

          <div style={{ marginTop: 8, textAlign: "center" }}>
            <button type="button" onClick={handleMockTest} style={{ background: "none", border: "1px dashed #a5b4fc", color: "#4f46e5", borderRadius: 6, padding: "6px 14px", fontSize: "0.85rem", cursor: "pointer" }}>
              🧪 F5 테스트 결과 보기
            </button>
          </div>

          {fetchError && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: "0.9rem" }}>
              ⚠️ {fetchError}
            </div>
          )}

          {loading && <div className="loading"><div className="spinner" /><p>AI 모델이 분석 중입니다...</p></div>}

          {results.length > 0 && (
            <>
              <div className="results-grid">
                {results.map((r) => (
                  <div key={r.model} className="result-card" style={{ borderTopColor: MODEL_COLORS[r.model] || "#888" }}>
                    <h3 style={{ color: MODEL_COLORS[r.model] || "#888" }}>{r.model}</h3>
                    {r.error ? <p className="error">오류: {r.error}</p> : <ReactMarkdown>{r.diagnosis}</ReactMarkdown>}
                  </div>
                ))}
              </div>

              {summary && (
                <div className="summary-section">
                  <h2>📋 종합 진단 결과</h2>
                  <div className="summary-card">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>

                  {needsHospital ? (
                    <HospitalSection
                      userLocation={userLocation}
                      onShowCard={() => setShowSummaryCard(true)}
                    />
                  ) : (
                    <div className="safe-section">
                      <h3>😊 안심하세요!</h3>
                      <p>현재 증상은 심각한 수준은 아닌 것으로 보입니다. 가정에서 경과를 관찰해주시고, 증상이 지속되거나 악화되면 수의사와 상담하세요.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="history-section">
          {selectedRecord ? (
            <div>
              <button className="back-btn" onClick={() => setSelectedRecord(null)}>← 목록으로</button>
              <h3>{selectedRecord.pet_type === "dog" ? "🐶" : "🐱"} {selectedRecord.symptoms}</h3>
              <p className="date">{new Date(selectedRecord.created_at).toLocaleString("ko-KR")}</p>
              <div className="results-grid">
                {[
                  { model: "Claude (Bedrock)", diagnosis: selectedRecord.result_claude },
                  { model: "GPT (OpenAI)", diagnosis: selectedRecord.result_gpt },
                  { model: "Gemini (Google)", diagnosis: selectedRecord.result_gemini },
                ].map((r) => (
                  <div key={r.model} className="result-card" style={{ borderTopColor: MODEL_COLORS[r.model] }}>
                    <h3 style={{ color: MODEL_COLORS[r.model] }}>{r.model}</h3>
                    <ReactMarkdown>{r.diagnosis || "결과 없음"}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ul className="history-list">
              {history.length === 0 && <p>상담 기록이 없습니다.</p>}
              {history.map((h) => (
                <li key={h.id} onClick={() => setSelectedRecord(h)}>
                  <span>{h.pet_type === "dog" ? "🐶" : "🐱"}</span>
                  <span className="symptoms-preview">{h.symptoms}</span>
                  <span className="date">{new Date(h.created_at).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showSummaryCard && (
        <SymptomSummaryCard
          petType={petType}
          symptoms={symptoms}
          results={results}
          summary={summary}
          timestamp={diagnosisTime}
          onClose={() => setShowSummaryCard(false)}
        />
      )}
    </div>
  );
}
