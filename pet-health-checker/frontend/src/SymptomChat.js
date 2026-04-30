import React, { useState, useEffect, useRef } from "react";
import { chatTurn } from "./api";

/**
 * F2: 3개 LLM 멀티 패널 → 단일 선택 후 대화 지속
 *
 * 흐름:
 *   1. 유저: 첫 증상 입력
 *   2. 3개 LLM이 각자 답변 (동시)
 *   3. 유저가 1개 AI 선택 (라디오)
 *   4. 선택된 AI와만 대화 (호출은 선택된 AI만)
 *      → 유저 메시지와 AI 응답을 다른 2개 AI의 메시지 배열에도 동기화
 *      → (실제 호출은 안 하므로 비용 ×3 안 됨, 하지만 진단 시점엔 전체 맥락 보유)
 *   5. "진단 받기" → 3개 LLM 독립 진단 (전체 맥락)
 *   6. F3 통합 요약
 */

const LLM_CONFIGS = {
  "Claude (Bedrock)": {
    name: "Claude",
    color: "#cc785c",
    bg: "#fff8f5",
    bgActive: "#ffe9df",
    border: "#f3d9cd",
  },
  "GPT-OSS (Bedrock)": {
    name: "GPT-OSS",
    color: "#10a37f",
    bg: "#f1fdf8",
    bgActive: "#d5f3e6",
    border: "#c7ead9",
  },
  "Gemini (Google)": {
    name: "Gemini",
    color: "#4285f4",
    bg: "#f0f6ff",
    bgActive: "#dceafd",
    border: "#c7daf9",
  },
};
const LLM_IDS = Object.keys(LLM_CONFIGS);

function speciesEmoji(species) {
  return species === "dog" ? "🐶" : species === "cat" ? "🐱" : "🐾";
}

function displayModelName(fullName) {
  if (!fullName) return fullName;
  return LLM_CONFIGS[fullName]?.name || fullName.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

// 펫 불일치 감지
const PET_KEYWORDS = {
  dog: ["강아지", "개", "멍멍이", "멍뭉이", "댕댕이", "댕댕", "푸들", "리트리버", "말티즈",
        "포메라니안", "시바", "시츄", "치와와", "웰시", "비글", "진돗개", "닥스훈트"],
  cat: ["고양이", "냥이", "냥냥이", "냥냥", "야옹이", "야옹", "묘", "페르시안", "샴",
        "러시안블루", "먼치킨", "스코티쉬", "렉돌", "노르웨이숲", "브리티쉬"],
};
function detectPetMismatch(text, selectedType) {
  if (!text || !selectedType) return null;
  const lowered = text.toLowerCase();
  const other = selectedType === "dog" ? "cat" : "dog";
  const hasOther = PET_KEYWORDS[other].some((k) => lowered.includes(k.toLowerCase()));
  if (!hasOther) return null;
  const hasSelected = PET_KEYWORDS[selectedType].some((k) => lowered.includes(k.toLowerCase()));
  if (hasSelected) return null;
  return { detectedType: other, selectedType };
}


export default function SymptomChat({
  onSubmit,
  onReset,
  petContext,
  selectedPetType,
  petName,
  disabled = false,
}) {
  // 각 LLM의 대화 이력
  const [llms, setLlms] = useState(() => {
    const init = {};
    LLM_IDS.forEach((id) => {
      init[id] = { messages: [], loading: false, error: null };
    });
    return init;
  });

  // 단일 선택된 LLM (null이면 아직 선택 안 함 = 첫 턴 이후 선택 화면)
  const [chosenLlm, setChosenLlm] = useState(null);

  // Phase: "initial" → 첫 증상 입력 대기
  //        "compare" → 3개 응답 비교 중 (선택 대기)
  //        "locked"  → 1개 선택 후 해당 AI와만 대화
  const [phase, setPhase] = useState("initial");

  const [input, setInput] = useState("");
  const [turnLoading, setTurnLoading] = useState(false);
  const [pendingPetMismatch, setPendingPetMismatch] = useState(null);

  const hasAnyAssistant = LLM_IDS.some((id) =>
    llms[id].messages.some((m) => m.role === "assistant")
  );

  // 선택된 AI의 대화 횟수
  const chosenAssistantCount = chosenLlm
    ? llms[chosenLlm].messages.filter((m) => m.role === "assistant").length
    : 0;
  const showDiagnosisReady = chosenAssistantCount >= 2; // 2번 이상 대화 나누면 nudge

  // ===== 첫 증상 전송 (모든 LLM) =====
  const handleFirstSubmit = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || turnLoading || disabled) return;

    const mismatch = detectPetMismatch(text, selectedPetType);
    if (mismatch && !pendingPetMismatch) {
      setPendingPetMismatch({ text, ...mismatch });
      return;
    }

    await sendTurn(text, LLM_IDS, false); // 첫 턴: 전부에게, isFollowup=false
    setInput("");
    setPhase("compare");
  };

  // ===== 후속 턴: 선택된 AI에만 실제 호출, 나머지는 메시지만 복사 =====
  const handleFollowupSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || turnLoading || disabled || !chosenLlm) return;

    await sendTurn(text, [chosenLlm], true); // 후속 턴: 선택된 AI만, isFollowup=true
    setInput("");
  };

  /**
   * 핵심 함수: 한 턴 처리
   * @param userText 사용자 입력
   * @param targets 실제 LLM 호출 대상 (배열)
   * @param isFollowup true면 후속 턴 (선택된 1개 AI만 대답)
   */
  const sendTurn = async (userText, targets, isFollowup) => {
    setTurnLoading(true);

    // 1) 유저 메시지는 모든 패널에 추가 (공통 맥락이므로)
    setLlms((prev) => {
      const next = { ...prev };
      for (const id of LLM_IDS) {
        next[id] = {
          ...next[id],
          messages: [...next[id].messages, { role: "user", content: userText }],
          // 호출 대상만 loading=true
          loading: targets.includes(id),
          // 비선택 AI는 "듣고 있음" 표시
          listening: isFollowup && !targets.includes(id),
          error: null,
        };
      }
      return next;
    });

    try {
      // 2) 백엔드 호출: 타겟 AI에만 실제 요청
      const llms_state = {};
      LLM_IDS.forEach((id) => {
        llms_state[id] = { messages: llms[id].messages };
      });

      const data = await chatTurn(targets, userText, llms_state, petContext);
      const responses = data.responses || {};

      // 3) 응답 처리
      setLlms((prev) => {
        const next = { ...prev };

        // 3-A) 선택된 타겟들 응답 추가
        for (const target of targets) {
          const resp = responses[target];
          if (!resp) {
            next[target] = { ...next[target], loading: false, error: "응답 없음" };
            continue;
          }
          if (resp.status === "success") {
            next[target] = {
              ...next[target],
              messages: [
                ...next[target].messages,
                { role: "assistant", content: resp.content || "" },
              ],
              loading: false,
              error: null,
            };
          } else {
            next[target] = {
              ...next[target],
              loading: false,
              error: resp.errorMessage || resp.status,
            };
          }
        }

        // 3-B) 비선택 AI에게는 응답 복사 안 함!
        //      (진단 시점에 백엔드에서 crossContext로 전체 맥락 전달)
        //      listening 상태만 잠깐 유지 후 리셋
        if (isFollowup) {
          const nonTargets = LLM_IDS.filter((id) => !targets.includes(id));
          for (const id of nonTargets) {
            next[id] = { ...next[id], listening: true };
          }
        }

        return next;
      });
    } catch (err) {
      alert(err.message);
      setLlms((prev) => {
        const next = { ...prev };
        for (const id of targets) {
          next[id] = { ...next[id], loading: false, error: err.message };
        }
        return next;
      });
    } finally {
      setTurnLoading(false);
    }
  };

  const handleChoose = (llmId) => {
    setChosenLlm(llmId);
    setPhase("locked");
  };

  const handlePetMismatchResolve = (chosenType) => {
    setPendingPetMismatch(null);
    if (chosenType === selectedPetType) {
      handleFirstSubmit();
    } else {
      alert("종을 바꾸려면 '내 반려동물' 메뉴에서 다른 펫을 선택하세요.");
    }
  };

  const handleDiagnose = () => {
    // 선택된 LLM의 전체 메시지를 사용 (가장 풍부한 맥락)
    const primaryLlm = chosenLlm || LLM_IDS[0];
    const mergedMessages = [...llms[primaryLlm].messages];
    const firstUserMsg = mergedMessages.find((m) => m.role === "user")?.content || "";
    const collected = { main_symptom: firstUserMsg };
    onSubmit(mergedMessages, collected);
  };

  const handleResetAll = () => {
    const init = {};
    LLM_IDS.forEach((id) => {
      init[id] = { messages: [], loading: false, error: null };
    });
    setLlms(init);
    setChosenLlm(null);
    setPhase("initial");
    setInput("");
    setPendingPetMismatch(null);
    onReset && onReset();
  };

  // 입력창 활성화 조건
  const canSendFollowup = phase === "locked" && chosenLlm && !turnLoading && !disabled;
  const canSendFirst = phase === "initial" && !turnLoading && !disabled;

  return (
    <div className="symptom-chat-v3">
      {/* 상단 */}
      <div className="v3-header">
        {petName && (
          <span className="v3-pet-chip">
            {speciesEmoji(selectedPetType)} <strong>{petName}</strong>의 증상 문답
          </span>
        )}
        {phase === "compare" && (
          <span className="v3-guide-text">
            💡 3개 AI의 답변을 비교해보고, <strong>가장 마음에 드는 AI</strong>와 대화를 이어가세요
          </span>
        )}
        {phase === "locked" && chosenLlm && (
          <span className="v3-guide-text">
            🎯 <strong>{displayModelName(chosenLlm)}</strong>와(과) 대화 중 · 다른 AI들도 맥락을 공유받는 중
          </span>
        )}
      </div>

      {/* 입력창 (패널 위로 이동) */}
      {phase !== "compare" && (
        <div className="v3-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                phase === "initial" ? handleFirstSubmit(e) : handleFollowupSend(e);
              }
            }}
            placeholder={
              phase === "initial"
                ? "증상을 자유롭게 설명해주세요 (예: 어제부터 토하고 기운이 없어요)"
                : phase === "locked"
                ? `${displayModelName(chosenLlm)}에게 질문 이어가기...`
                : "..."
            }
            disabled={turnLoading || disabled}
            rows={2}
            className="v3-input"
          />
          <div className="v3-input-buttons">
            <button
              onClick={phase === "initial" ? handleFirstSubmit : handleFollowupSend}
              disabled={!input.trim() || turnLoading || disabled}
              className="v3-send-btn"
            >
              {turnLoading
                ? "AI 응답 중..."
                : phase === "initial"
                ? "↑ 3개 AI에 전송"
                : `↑ ${displayModelName(chosenLlm)}에게 전송`}
            </button>
          </div>
        </div>
      )}

      {/* compare 상태에서 입력창 대체: "AI를 선택하세요" 안내 */}
      {phase === "compare" && (
        <div className="v3-compare-guide">
          ☝️ 각 패널의 <strong>"이 AI로 결정"</strong> 버튼을 눌러 대화를 이어갈 AI를 선택하세요
        </div>
      )}

      {/* 펫 불일치 확인 */}
      {pendingPetMismatch && (
        <div className="pet-mismatch-box">
          <p>
            🐾 입력 내용에 '
            {pendingPetMismatch.detectedType === "dog" ? "강아지" : "고양이"}
            '가 언급되었어요. 현재 선택된 펫은{" "}
            <strong>{selectedPetType === "dog" ? "강아지" : "고양이"}</strong>인데, 어느 쪽이 맞나요?
          </p>
          <div className="pet-mismatch-buttons">
            <button onClick={() => handlePetMismatchResolve(selectedPetType)}>
              {speciesEmoji(selectedPetType)}{" "}
              {selectedPetType === "dog" ? "강아지" : "고양이"} 맞음
            </button>
            <button
              onClick={() => handlePetMismatchResolve(pendingPetMismatch.detectedType)}
              className="alt"
            >
              펫 프로필 다시 확인
            </button>
          </div>
        </div>
      )}

      {/* 3개 LLM 패널 그리드 */}
      <div className="v3-panels-grid">
        {LLM_IDS.map((id) => (
          <LLMPanel
            key={id}
            llmId={id}
            state={llms[id]}
            phase={phase}
            isChosen={chosenLlm === id}
            chosenLlm={chosenLlm}
            onChoose={() => handleChoose(id)}
            disabled={disabled || turnLoading}
          />
        ))}
      </div>

      {/* 진단 받기 / 리셋 */}
      <div className="v3-actions">
        <button
          className={`v3-diagnose-btn ${showDiagnosisReady ? "nudge" : ""}`}
          onClick={handleDiagnose}
          disabled={!hasAnyAssistant || turnLoading || disabled}
        >
          🔍 진단 받기
          {showDiagnosisReady && (
            <span className="v3-nudge-hint"> (충분한 정보가 모였어요)</span>
          )}
        </button>
        <button className="v3-reset-btn" onClick={handleResetAll} disabled={disabled}>
          ↻ 처음부터
        </button>
      </div>
    </div>
  );
}


// ==========================================
// LLM 개별 패널
// ==========================================
function LLMPanel({ llmId, state, phase, isChosen, chosenLlm, onChoose, disabled }) {
  const cfg = LLM_CONFIGS[llmId];
  const bottomRef = useRef(null);
  const isEmpty = state.messages.length === 0 && !state.loading;

  // locked 상태에서 비선택 LLM인지 여부
  const isDimmed = phase === "locked" && !isChosen;
  const isChosenPanel = phase === "locked" && isChosen;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.loading]);

  return (
    <div
      className={`v3-panel ${isChosenPanel ? "selected" : ""} ${isDimmed ? "dimmed" : ""}`}
      style={{
        background: isChosenPanel ? cfg.bgActive : cfg.bg,
        borderColor: isChosenPanel ? cfg.color : cfg.border,
        boxShadow: isChosenPanel ? `0 0 0 2px ${cfg.color}33` : "none",
      }}
    >
      {/* 헤더 */}
      <div className="v3-panel-header" style={{ borderBottomColor: cfg.border }}>
        <div className="v3-panel-title">
          <span className="v3-panel-dot" style={{ background: cfg.color }} />
          <strong style={{ color: cfg.color }}>{cfg.name}</strong>
        </div>
        <div className="v3-panel-meta">
          {isDimmed && state.listening && (
            <span className="v3-listening-badge" style={{ color: cfg.color, borderColor: cfg.color + "66" }}>
              <span className="v3-ear-icon">👂</span> 듣고 있어요
            </span>
          )}
          {isDimmed && !state.listening && (
            <span className="v3-shared-badge-static" style={{ color: cfg.color }}>
              ↗ {displayModelName(chosenLlm)} 대화 공유 중
            </span>
          )}
          {isChosenPanel && (
            <span className="v3-chosen-badge" style={{ background: cfg.color }}>
              ✓ 대화 중
            </span>
          )}
          {phase === "compare" && (
            <button
              className="v3-choose-btn"
              onClick={onChoose}
              disabled={disabled || state.loading || state.messages.length === 0}
              style={{
                background: cfg.color,
                color: "#fff",
              }}
            >
              이 AI로 결정
            </button>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="v3-panel-messages">
        {isEmpty && (
          <p className="v3-panel-empty">증상을 입력하면 질문드릴게요</p>
        )}
        {state.messages.map((m, i) => (
          <div
            key={i}
            className={`v3-bubble ${m.role === "user" ? "v3-bubble-user" : "v3-bubble-ai"}`}
            style={{
              background: m.role === "user" ? "#4f46e5" : "#fff",
              color: m.role === "user" ? "#fff" : "#1f2937",
              borderColor: m.role === "assistant" ? cfg.border : "transparent",
              opacity: isDimmed ? 0.6 : 1,
            }}
          >
            {m.content}
          </div>
        ))}
        {state.loading && (
          <div className="v3-bubble v3-bubble-ai" style={{ borderColor: cfg.border, background: "#fff" }}>
            <div className="v3-typing">
              <span className="dot" style={{ background: cfg.color }} />
              <span className="dot" style={{ background: cfg.color }} />
              <span className="dot" style={{ background: cfg.color }} />
            </div>
          </div>
        )}
        {/* 듣고 있는 AI의 placeholder */}
        {isDimmed && state.listening && !state.loading && (
          <div className="v3-listening-placeholder" style={{ borderColor: cfg.border, color: cfg.color }}>
            <span className="v3-listening-ear">👂</span>
            <span>대화를 듣고 있어요 · 진단 시 의견 드릴게요</span>
          </div>
        )}
        {state.error && (
          <div className="v3-panel-error">⚠ {state.error}</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
