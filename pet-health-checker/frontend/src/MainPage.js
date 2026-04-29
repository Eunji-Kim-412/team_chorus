import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { diagnose, getHistory } from "./api";

const MODEL_COLORS = { "Claude (Bedrock)": "#d97706", "GPT (OpenAI)": "#10a37f", "Gemini (Google)": "#4285f4" };

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

  const handleDiagnose = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setSummary("");
    setNeedsHospital(false);
    try {
      const data = await diagnose(petType, symptoms);
      setResults(data.results);
      setSummary(data.summary || "");
      setNeedsHospital(data.needs_hospital || false);
      if (data.needs_hospital) {
        navigator.geolocation?.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => setUserLocation(null)
        );
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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

  const naverMapUrl = userLocation
    ? `https://map.naver.com/v5/search/동물병원?c=${userLocation.lng},${userLocation.lat},15,0,0,0,dh`
    : "https://map.naver.com/v5/search/내주변%20동물병원";

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
                    <div className="hospital-section">
                      <h3>🏥 병원 방문을 권장합니다</h3>
                      <p>증상의 심각도가 높아 가까운 동물병원 방문을 추천드립니다.</p>
                      <a href={naverMapUrl} target="_blank" rel="noopener noreferrer" className="hospital-btn">
                        📍 네이버 지도에서 주변 동물병원 찾기
                      </a>
                    </div>
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
    </div>
  );
}
