import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { diagnose, getHistory } from "./api";
import HospitalSection from "./HospitalSection";
import SymptomSummaryCard from "./SymptomSummaryCard";
import SymptomChat from "./SymptomChat";
import PetProfileSection from "./PetProfileSection";

const MODEL_COLORS = {
  "Claude (Bedrock)": "#d97706",
  "Claude (Anthropic)": "#d97706",
  "GPT (OpenAI)": "#10a37f",
  "GPT-OSS (Bedrock)": "#10a37f",
  "GPT (미설정)": "#9ca3af",
  "Gemini (Google)": "#4285f4",
};

// 화면 표시용 라벨 (플랫폼명 제거)
function displayModelName(fullName) {
  if (!fullName) return fullName;
  // "모델명 (플랫폼)" 패턴에서 괄호 앞부분만 추출
  return fullName.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

const URGENCY_ICONS = { 1: "🟢", 2: "🟡", 3: "🟠", 4: "🔴", 5: "🚨" };

// 위험도 스케일 범례 (사용자 설명용)
const URGENCY_SCALE = [
  { range: "1 – 2.9", label: "거의 정상", color: "green", icon: "🟢", action: "집에서 관찰" },
  { range: "3 – 4.9", label: "가벼운 이상", color: "lime", icon: "🟡", action: "홈케어" },
  { range: "5 – 6.9", label: "주의 필요", color: "yellow", icon: "🟠", action: "내일 병원" },
  { range: "7 – 8.9", label: "응급", color: "orange", icon: "🔴", action: "오늘 병원" },
  { range: "9 – 10", label: "즉시 응급", color: "red", icon: "🚨", action: "24시간 응급실" },
];

function UrgencyBar({ score }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="urgency-bar-small">
      <div className="urgency-bar-small-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    success: { label: "✓ 완료", cls: "pill-ok" },
    schema_violation: { label: "⚠ 형식 오류", cls: "pill-warn" },
    failed: { label: "✗ 실패", cls: "pill-fail" },
    timeout: { label: "⏱ 시간 초과", cls: "pill-fail" },
  };
  const info = map[status] || { label: status, cls: "pill-warn" };
  return <span className={`status-pill ${info.cls}`}>{info.label}</span>;
}

export default function MainPage() {
  const [petType, setPetType] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [llmResponses, setLlmResponses] = useState([]);
  const [consolidated, setConsolidated] = useState(null);
  const [totalLatency, setTotalLatency] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("diagnose");
  const [history, setHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [diagnosisTimestamp, setDiagnosisTimestamp] = useState(null);
  const [petContext, setPetContext] = useState(null); // F1: 선택된 펫 정보

  // PetProfileSection의 onPetContextChange가 리렌더마다 재생성되지 않도록
  const handlePetContextChange = useCallback((ctx) => {
    setPetContext(ctx);
    if (ctx?.pet?.species) {
      setPetType(ctx.pet.species);
    }
  }, []);

  const handleDiagnose = async (messages, collectedAnswers) => {
    // 펫 선택 안 됐으면 가드
    if (!petContext) {
      alert("먼저 반려동물 정보를 등록하거나 선택해주세요.");
      return;
    }

    const compactSymptoms = buildCompactSymptoms(collectedAnswers, messages);
    setSymptoms(compactSymptoms);

    setLoading(true);
    setLlmResponses([]);
    setConsolidated(null);
    setShowDetails(false);
    try {
      const data = await diagnose(petContext.pet.species, compactSymptoms, {
        messages,
        pet_context: petContext,
      });
      setLlmResponses(data.llmResponses || []);
      setConsolidated(data.consolidated || null);
      setTotalLatency(data.totalLatencyMs || 0);
      setDiagnosisTimestamp(new Date().toISOString());
      if (data.consolidated?.shouldVisitHospital) {
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

  // 대화 내용 → 증상 요약 문자열 (백엔드 호환용)
  const buildCompactSymptoms = (answers, messages) => {
    if (answers && Object.keys(answers).length > 0) {
      const parts = [];
      if (answers.main_symptom) parts.push(`주요 증상: ${answers.main_symptom}`);
      if (answers.onset) parts.push(`시작 시점: ${answers.onset}`);
      if (answers.frequency) parts.push(`빈도: ${answers.frequency}`);
      if (answers.co_symptoms) parts.push(`동반 증상: ${answers.co_symptoms}`);
      if (answers.behavior) parts.push(`행동 변화: ${answers.behavior}`);
      return parts.join("\n");
    }
    // 폴백: user 메시지만 합침
    return messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" / ");
  };

  const handleRetry = () => {
    // 재진단 — 증상 수정 가능하도록 결과만 클리어
    setLlmResponses([]);
    setConsolidated(null);
  };

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data.history);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const naverMapUrl = userLocation
    ? `https://map.naver.com/v5/search/동물병원?c=${userLocation.lng},${userLocation.lat},15,0,0,0,dh`
    : "https://map.naver.com/v5/search/내주변%20동물병원";

  const u = consolidated?.urgency;
  const successCount = llmResponses.filter((r) => r.status === "success").length;

  return (
    <div className="main-container">
      <header>
        <h1>🐾 펫 건강 체커</h1>
        <nav>
          <button className={tab === "diagnose" ? "active" : ""} onClick={() => setTab("diagnose")}>
            진단하기
          </button>
          <button className={tab === "pets" ? "active" : ""} onClick={() => setTab("pets")}>
            내 반려동물
          </button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
            상담 기록
          </button>
        </nav>
      </header>

      {tab === "diagnose" && (
        <div className="diagnose-section">
          {/* F1: 펫 선택 (간단 버전) */}
          <PetProfileSection
            mode="selector"
            onPetContextChange={handlePetContextChange}
            onGoToManager={() => setTab("pets")}
          />

          {/* F2: 3-phase 멀티턴 LLM 선택 대화 (펫이 선택된 경우에만) */}
          {petContext ? (
            <SymptomChat
              onSubmit={(msgs, answers) => handleDiagnose(msgs, answers)}
              onReset={() => {
                setLlmResponses([]);
                setConsolidated(null);
              }}
              petContext={petContext}
              selectedPetType={petContext.pet.species}
              petName={petContext.pet.name}
              disabled={loading}
            />
          ) : null}

          {loading && (
            <div className="loading">
              <div className="spinner" />
              <p>Claude · GPT · Gemini 세 개 AI가 동시에 분석 중입니다...</p>
            </div>
          )}

          {/* ======= F3 결과 화면 ======= */}
          {consolidated && (
            <div className="result-container">
              {/* 헤드라인: 통합 위험도 */}
              {u && (
                <div className={`urgency-badge urgency-${u.color}`}>
                  <div className="urgency-header">
                    <span className="urgency-icon">{URGENCY_ICONS[u.level] || "⚪"}</span>
                    <div className="urgency-titles">
                      <div className="urgency-level-name">
                        등급 {u.level}단계 · {u.label}
                      </div>
                      <div className="urgency-score">
                        통합 위험도 <strong>{u.score}</strong> / 10
                      </div>
                    </div>
                  </div>
                  <div className="urgency-bar">
                    <div
                      className="urgency-bar-fill"
                      style={{ width: `${(u.score / 10) * 100}%` }}
                    />
                  </div>
                  <p className="urgency-message">{consolidated.headlineMessage}</p>
                </div>
              )}

              {/* 모델별 위험도 비교 (SPEC의 투명성 요구) */}
              <div className="model-scores-card">
                <h3>🤖 AI 모델별 위험도 ({successCount}/3 성공 · {totalLatency}ms)</h3>

                {/* 위험도 스케일 설명 */}
                <div className="urgency-scale-help">
                  <p className="scale-intro">
                    위험도는 <strong>1(안전)</strong>에서 <strong>10(즉시 응급)</strong> 사이의 점수입니다.
                    AI들이 증상을 분석해 이 점수를 매겼어요.
                  </p>
                  <div className="scale-legend">
                    {URGENCY_SCALE.map((s) => (
                      <div key={s.range} className={`scale-item scale-${s.color}`}>
                        <span className="scale-icon">{s.icon}</span>
                        <div className="scale-text">
                          <div className="scale-range">{s.range}</div>
                          <div className="scale-label">{s.label}</div>
                          <div className="scale-action">{s.action}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="model-scores-list">
                  {llmResponses.map((r) => {
                    const score = r.parsedResponse?.urgency_score;
                    // 해당 모델의 등급 찾기 (modelRationales에서)
                    const rationale = consolidated?.modelRationales?.find(
                      (m) => m.model === r.modelName
                    );
                    const level = rationale?.urgency_level;
                    return (
                      <div key={r.modelName} className="model-score-row">
                        <span
                          className="model-name"
                          style={{ color: MODEL_COLORS[r.modelName] || "#666" }}
                        >
                          {displayModelName(r.modelName)}
                        </span>
                        {score != null ? (
                          <>
                            <UrgencyBar score={score} />
                            <div className="model-score-info">
                              <span className="model-score-num">{score.toFixed(1)}</span>
                              {level && (
                                <span className={`model-level-pill level-${level.color}`}>
                                  {URGENCY_ICONS[level.level]} {level.label}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="model-score-error">
                            <StatusPill status={r.status} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 종합 자연어 요약 */}
              {consolidated.narrativeSummary && (
                <div className="narrative-summary-card">
                  <h3>📝 종합 요약</h3>
                  <ReactMarkdown>{consolidated.narrativeSummary}</ReactMarkdown>
                </div>
              )}

              {/* 통합 진단명 */}
              {consolidated.consolidatedDiagnoses?.length > 0 && (
                <div className="diagnosis-card">
                  <h3>
                    🩺 진단 결과{" "}
                    {consolidated.consensusType === "agreed" ? (
                      <span className="consensus-pill agreed">AI 의견 일치</span>
                    ) : (
                      <span className="consensus-pill split">AI 의견 분기</span>
                    )}
                  </h3>
                  {consolidated.consensusType === "agreed" ? (
                    <p className="diagnosis-main">
                      {consolidated.consolidatedDiagnoses[0]?.name}
                    </p>
                  ) : (
                    <div>
                      <p className="consensus-note">AI마다 의견이 달라 모두 보여드립니다:</p>
                      <ul className="diagnosis-list">
                        {consolidated.modelRationales.map((m) => (
                          <li key={m.model}>
                            <strong style={{ color: MODEL_COLORS[m.model] }}>{displayModelName(m.model)}</strong>:{" "}
                            {m.top_diagnosis || "(진단 없음)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consolidated.redFlags?.length > 0 && (
                    <div className="red-flags">
                      <h4>⚠️ 주의해야 할 신호</h4>
                      <ul>
                        {consolidated.redFlags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 접힘: 모델별 상세 근거 */}
              <button
                className="details-toggle"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? "▲ AI들의 의견 접기" : "▼ AI들의 의견 자세히 보기"}
              </button>
              {showDetails && (
                <div className="model-details">
                  {consolidated.modelRationales.map((m) => (
                    <div key={m.model} className="model-detail-card">
                      <h4 style={{ color: MODEL_COLORS[m.model] }}>{displayModelName(m.model)}</h4>
                      <p className="detail-meta">
                        위험도 {m.urgency_score} · {m.latencyMs}ms
                      </p>
                      <p>
                        <strong>진단:</strong> {m.top_diagnosis || "(없음)"}
                      </p>
                      <p>
                        <strong>근거:</strong> {m.reasoning || "(없음)"}
                      </p>
                      <p>
                        <strong>위험도 판단:</strong> {m.urgency_rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 분기 CTA */}
              {consolidated.shouldVisitHospital ? (
                <HospitalSection
                  userLocation={userLocation}
                  urgencyScore={u?.score}
                  onShowCard={() => setShowSummaryCard(true)}
                />
              ) : (
                <div className="safe-section">
                  <h3>😊 집에서 관찰 가능합니다</h3>
                  <p>
                    현재 증상은 홈케어 가능한 수준으로 보입니다. 충분한 휴식과 수분을 제공해
                    주시고, 상태가 악화되면 즉시 병원을 방문하세요.
                  </p>
                </div>
              )}

              {/* 재진단 버튼 */}
              <button className="retry-btn" onClick={handleRetry}>
                ↻ 이 진단이 맞지 않아요 (다시 설명할게)
              </button>

              <p className="disclaimer">
                ⚠️ 본 결과는 참고용이며, 수의학적 진단을 대체하지 않습니다. 반드시 수의사와
                상담하세요.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "pets" && (
        <div className="pets-section">
          <PetProfileSection mode="manager" />
        </div>
      )}

      {tab === "history" && (
        <div className="history-section">
          {selectedRecord ? (
            <div>
              <button className="back-btn" onClick={() => setSelectedRecord(null)}>
                ← 목록으로
              </button>
              <h3>
                {selectedRecord.pet_type === "dog" ? "🐶" : "🐱"} {selectedRecord.symptoms}
              </h3>
              <p className="date">
                {new Date(selectedRecord.created_at).toLocaleString("ko-KR")}
              </p>
              <div className="results-grid">
                {[
                  { model: "Claude", diagnosis: selectedRecord.result_claude },
                  { model: "GPT", diagnosis: selectedRecord.result_gpt },
                  { model: "Gemini", diagnosis: selectedRecord.result_gemini },
                ].map((r) => (
                  <div
                    key={r.model}
                    className="result-card"
                    style={{ borderTopColor: MODEL_COLORS[`${r.model} (OpenAI)`] || "#888" }}
                  >
                    <h3>{r.model}</h3>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>
                      {r.diagnosis || "결과 없음"}
                    </pre>
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
                  <span className="date">
                    {new Date(h.created_at).toLocaleString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 병원 방문용 증상 요약 카드 모달 (F5) */}
      {showSummaryCard && (
        <SymptomSummaryCard
          petType={petType}
          symptoms={symptoms}
          llmResponses={llmResponses}
          consolidated={consolidated}
          timestamp={diagnosisTimestamp}
          onClose={() => setShowSummaryCard(false)}
        />
      )}
    </div>
  );
}
