import React, { useState, useCallback, useEffect, useRef } from "react";
import { chat, diagnoseSummary } from "./api";

// ── LLM 설정 (연수 UI 색상에 맞게) ──────────────────────────────────────────
const LLM_IDS = ["claude", "chatgpt", "gemini"];

const LLM_CONFIG = {
  claude:  { name: "Claude",  color: "#d97706", borderTop: "#d97706" },
  chatgpt: { name: "ChatGPT", color: "#10a37f", borderTop: "#10a37f" },
  gemini:  { name: "Gemini",  color: "#4285f4", borderTop: "#4285f4" },
};

// ── localStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "pawsori_conv_v1";

function loadConvHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveConvHistory(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function makeTitle(text) {
  return text.length > 28 ? text.slice(0, 28) + "…" : text;
}

// ── 시스템 프롬프트 ───────────────────────────────────────────────────────────
function buildPetHistory(convHistory, currentId) {
  const past = convHistory.filter(
    (c) => c.step === "diagnosis" && c.summary && c.id !== currentId
  );
  if (!past.length) return "";
  return past.slice(0, 3).map((c) => {
    const risk = { low: "낮음", medium: "중간", high: "높음" }[c.summary.riskLevel] || c.summary.riskLevel || "";
    return `- ${c.date}: ${c.summary.topCause || "진단 완료"} (증상: ${c.title}${risk ? ", 위험도: " + risk : ""})`;
  }).join("\n");
}

function buildSystemPrompt(step, crossContext, exchangeCount, petHistory, directAnswer = false) {
  const crossBlock = crossContext
    ? `\n[다른 AI가 이미 보호자에게 확인한 정보 — 아래 내용은 절대 다시 묻지 마세요]\n${crossContext}\n`
    : "";
  const historyBlock = petHistory
    ? `\n[이 반려동물의 과거 진단 기록 — 첫 질문에서 자연스럽게 언급하여 주치의처럼 연속성을 보여주세요]\n${petHistory}\n`
    : "";

  if (directAnswer) {
    return `당신은 이 반려동물의 주치의입니다.${historyBlock}${crossBlock}
보호자가 진단 후 궁금한 점을 질문했습니다. 이전 대화와 진단 내용을 바탕으로 질문에 직접 답변해주세요.
추가 질문은 하지 말고, 답변만 간결하고 명확하게 한국어로 해주세요.`;
  }

  if (step === "symptom-qa") {
    if (exchangeCount >= 3) {
      return `당신은 이 반려동물의 주치의입니다.${historyBlock}${crossBlock}
지금까지 충분히 대화했습니다. 더 이상 질문하지 마세요.
보호자의 마지막 답변을 듣고, 지금까지 파악한 내용을 1~2줄로 간단히 정리한 후
"다른 AI와도 이야기해보시거나, 이제 진단을 받아보셔도 좋을 것 같아요." 라고 마무리하세요.
한국어로 답변하세요.`;
    }
    return `당신은 이 반려동물의 주치의입니다.${historyBlock}${crossBlock}
보호자가 증상을 설명하면, 과거 진단 기록이 있다면 첫 질문에서 자연스럽게 언급하세요 (예: "지난번 급성 위장염 때처럼 구토를 하나요?").
아직 확인되지 않은 정보만 1~2개 질문하세요.
- 위 [다른 AI가 이미 확인한 정보]에 있는 내용은 절대 다시 묻지 마세요
- 아직 진단하지 마세요
- 질문은 짧고 명확하게, 한국어로 답변하세요`;
  }

  return `당신은 이 반려동물의 주치의입니다.${historyBlock}${crossBlock}
지금까지의 대화를 바탕으로 진단해주세요.

**가장 유력한 원인**: (1가지만, 가장 확률 높은 것)
**판단 이유**: (왜 그렇게 판단했는지 2~3줄, 과거 병력과 연관 있으면 언급)
**위험도**: 낮음 / 중간 / 높음
**즉시 조치**: (지금 당장 해야 할 것 1~2가지)
**병원 방문**: 필요 여부 + 이유

한국어로 간결하게 답변하세요.`;
}

// ── 크로스 컨텍스트 ────────────────────────────────────────────────────────
function buildCrossContext(llms, excludeIds) {
  const sections = [];
  for (const id of LLM_IDS) {
    if (excludeIds.includes(id)) continue;
    const msgs = llms[id].messages;
    if (!msgs.length) continue;
    const name = LLM_CONFIG[id].name;
    const transcript = msgs.map((m) => {
      const speaker = m.role === "user" ? "보호자" : name;
      const content = m.content.length > 100
        ? m.content.slice(0, 100).replace(/\n/g, " ") + "…"
        : m.content.replace(/\n/g, " ");
      return `${speaker}: ${content}`;
    }).join("\n");
    sections.push(`── ${name}와의 대화 ──\n${transcript}`);
  }
  return sections.join("\n\n");
}

const initLlms = () => ({
  claude:  { messages: [], loading: false },
  chatgpt: { messages: [], loading: false },
  gemini:  { messages: [], loading: false },
});
const initSelected = () => ({ claude: false, chatgpt: false, gemini: false });

// ── 데모 데이터 ───────────────────────────────────────────────────────────────
const DEMO_CONV = {
  id: "demo-kongyi-001",
  title: "사료를 토하고 기운이 없어요",
  date: "4/29 14:23",
  step: "diagnosis",
  summary: {
    topCause: "급성 위장염",
    agreement: "all",
    riskLevel: "medium",
    perLlm: [
      { llm: "Claude",  cause: "급성 위장염 — 탈수 동반, 오늘 내원 권장" },
      { llm: "ChatGPT", cause: "급성 위장염 — 화분 흙 섭취로 인한 소화기 자극" },
      { llm: "Gemini",  cause: "급성 위장염 — 수액 처치 필요 가능성" },
    ],
  },
  llms: {
    claude: {
      loading: false,
      messages: [
        { role: "user",      content: "사료를 자꾸 토해요. 기운도 없고 잇몸이 건조해 보여요" },
        { role: "assistant", content: "아이고, 많이 걱정되시겠어요 😢 증상을 좀 더 정확히 파악하기 위해 여쭤볼게요.\n\n토하기 시작한 지 얼마나 됐나요? 그리고 평소보다 물은 마시고 있나요?" },
        { role: "user",      content: "오늘 아침부터요. 3번 정도 토했어요" },
        { role: "assistant", content: "잇몸이 건조하고 기운까지 없다니 탈수 가능성이 있어 걱정되네요. 한 가지만 더 여쭤볼게요.\n\n최근에 새로운 사료로 바꿨거나, 실내에서 이상한 것을 씹었을 가능성은 없나요?" },
        { role: "user",      content: "사료는 그대론데 어제 화분 흙을 좀 먹었어요" },
        { role: "assistant", content: "**가장 유력한 원인**: 급성 위장염 (Acute Gastroenteritis)\n\n**판단 이유**: 화분 흙 섭취 후 구토·무기력이 나타난 것으로 보아 이물질로 인한 소화기 자극이 주된 원인으로 보여요. 잇몸 건조는 탈수가 이미 진행 중임을 시사해요.\n\n**위험도**: 중간\n\n**즉시 조치**: 음식은 잠시 중단하고 소량의 물을 자주 제공하세요. 잇몸을 손가락으로 살짝 눌렀을 때 2초 안에 분홍빛으로 돌아오지 않으면 탈수가 심한 거예요.\n\n**병원 방문**: 오늘 중으로 수의사 진료를 받으세요. 수액 처치가 필요할 수 있어요." },
      ],
    },
    chatgpt: {
      loading: false,
      messages: [
        { role: "user",      content: "사료를 자꾸 토해요. 기운도 없고 잇몸이 건조해 보여요" },
        { role: "assistant", content: "증상 알려주셔서 감사합니다. 정확한 상태 파악을 위해 몇 가지 확인이 필요해요.\n\n토한 횟수와 내용물(사료, 액체, 노란 담즙 등)을 알 수 있을까요? 체온도 측정해보셨나요?" },
        { role: "user",      content: "오늘 아침부터 3번 토했고 사료가 섞여 나왔어요" },
        { role: "assistant", content: "감사합니다. 추가로 한 가지 더 확인할게요.\n\n최근 식단 변화나 이물질을 삼킨 적이 있나요? 그리고 대변은 정상적으로 보고 있나요?" },
        { role: "user",      content: "사료는 그대론데 어제 화분 흙을 좀 먹었어요" },
        { role: "assistant", content: "**가장 유력한 원인**: 급성 위장염 — 이물질 섭취 유발 (Acute Gastroenteritis)\n\n**판단 이유**: 화분 흙에는 비료 성분·세균이 포함될 수 있어 소화기 점막을 자극합니다. 구토 3회·무기력·잇몸 건조는 중등도 탈수를 동반한 위장관 염증 패턴입니다.\n\n**위험도**: 중간\n\n**즉시 조치**: 2~4시간 금식 후 소량의 물을 제공하세요. 구토가 멈추면 닭가슴살+쌀죽으로 시작하세요.\n\n**병원 방문**: 잇몸 건조가 동반된 경우 수액 처치가 필요하므로 오늘 내원을 강력 권장합니다." },
      ],
    },
    gemini: {
      loading: false,
      messages: [
        { role: "user",      content: "사료를 자꾸 토해요. 기운도 없고 잇몸이 건조해 보여요" },
        { role: "assistant", content: "증상 확인했어요. 한 가지만 여쭤볼게요.\n\n증상이 갑자기 시작됐나요? 토한 것 외에 설사나 혈변은 없나요?" },
        { role: "user",      content: "오늘 갑자기 시작됐어요, 설사는 없어요" },
        { role: "assistant", content: "알겠어요. 마지막으로 하나만요.\n\n최근에 화분이나 식물, 이물질을 씹거나 먹은 적 있나요?" },
        { role: "user",      content: "사료는 그대론데 어제 화분 흙을 좀 먹었어요" },
        { role: "assistant", content: "**가장 유력한 원인**: 급성 위장염 (화분 흙 섭취)\n\n**판단 이유**: 화분 흙 섭취 → 소화기 자극 → 구토·무기력 순서로 진행된 전형적인 이물 섭취 후 위장관 반응. 잇몸 건조는 탈수 신호.\n\n**위험도**: 중간\n\n**즉시 조치**: 소량의 물 자주 제공. 2시간 금식 유지.\n\n**병원 방문**: 잇몸 건조 동반 시 수액 처치 필요. 오늘 즉시 내원 권장." },
      ],
    },
  },
};

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function MainPage() {
  const [tab, setTab]           = useState("qa");
  const [step, setStep]         = useState("symptom-qa");
  const [llms, setLlms]         = useState(initLlms());
  const [selected, setSelected] = useState(initSelected());
  const [prompt, setPrompt]     = useState("");
  const [convHistory, setConvHistory] = useState([]);
  const [activeId, setActiveId] = useState(() => String(Date.now()));
  const [sharedPanels, setSharedPanels]       = useState(initSelected());
  const [summary, setSummary]                 = useState(null);
  const [summaryLoading, setSummaryLoading]   = useState(false);
  const summaryTriggeredRef                   = useRef(false);

  const isAnyLoading   = LLM_IDS.some((id) => llms[id].loading);
  const hasMessages    = LLM_IDS.some((id) => llms[id].messages.length > 0);
  const selectedIds    = LLM_IDS.filter((id) => selected[id]);
  const noneSelected   = selectedIds.length === 0;
  const totalAssistant = LLM_IDS.reduce(
    (s, id) => s + llms[id].messages.filter((m) => m.role === "assistant").length, 0
  );
  const showNudge = step === "symptom-qa" && totalAssistant >= 4 && !isAnyLoading;

  // 듣는 중인 패널에 표시할 활성 패널 대화 수
  const activeLlmId = selectedIds.length === 1 ? selectedIds[0] : null;
  const activeUserMsgCount = activeLlmId
    ? llms[activeLlmId].messages.filter((m) => m.role === "user").length
    : 0;

  // 과거 진단 기록 참조 여부
  const petHistoryText = buildPetHistory(convHistory, activeId);
  const hasPetHistory = petHistoryText.length > 0;

  // 초기 로드 (데모 데이터 항상 최신으로 유지)
  useEffect(() => {
    const existing = loadConvHistory();
    const withDemo = [DEMO_CONV, ...existing.filter((c) => c.id !== DEMO_CONV.id)];
    saveConvHistory(withDemo);
    setConvHistory(withDemo);
  }, []);

  // 진단 완료 시 자동 요약
  useEffect(() => {
    if (step !== "diagnosis") return;
    if (isAnyLoading) return;
    if (summaryTriggeredRef.current) return;
    const diagnoses = LLM_IDS.map((id) => {
      const msgs = llms[id].messages;
      const last = msgs[msgs.length - 1];
      return { llm: LLM_CONFIG[id].name, content: last?.role === "assistant" ? last.content : "" };
    });
    if (diagnoses.every((d) => !d.content)) return;
    summaryTriggeredRef.current = true;
    setSummaryLoading(true);
    setSummary(null);
    diagnoseSummary(diagnoses)
      .then((data) => { setSummary(data); setSummaryLoading(false); })
      .catch(() => setSummaryLoading(false));
  }, [step, isAnyLoading, llms]);

  // 자동 저장
  useEffect(() => {
    if (!hasMessages || isAnyLoading) return;
    const firstMsg = LLM_IDS.flatMap((id) => llms[id].messages).find((m) => m.role === "user");
    if (!firstMsg) return;
    const conv = { id: activeId, title: makeTitle(firstMsg.content), date: formatDate(new Date()), llms, step, summary };
    setConvHistory((prev) => {
      const next = prev.some((c) => c.id === activeId)
        ? prev.map((c) => (c.id === activeId ? conv : c))
        : [conv, ...prev];
      saveConvHistory(next);
      return next;
    });
  }, [llms, isAnyLoading, summary]); // eslint-disable-line

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      if (prev[id]) return { ...prev, [id]: false };
      return { claude: false, chatgpt: false, gemini: false, [id]: true };
    });
  }, []);

  const sendMessage = useCallback(async (text, targetStep, explicitIds, directAnswer = false) => {
    const curStep = targetStep ?? step;
    if (!text.trim() || isAnyLoading) return;
    const targets = explicitIds ?? (!hasMessages ? [...LLM_IDS] : selectedIds);
    if (!targets.length) return;

    const crossContext = buildCrossContext(llms, targets);
    const petHistory = buildPetHistory(convHistory, activeId);
    const sysPerLlm = {};
    for (const id of targets) {
      const cnt = llms[id].messages.filter((m) => m.role === "assistant").length;
      sysPerLlm[id] = buildSystemPrompt(curStep, crossContext, cnt, petHistory, directAnswer);
    }
    setPrompt("");

    if (hasMessages && targets.length < LLM_IDS.length) {
      const shared = { claude: false, chatgpt: false, gemini: false };
      LLM_IDS.filter((id) => !targets.includes(id)).forEach((id) => { shared[id] = true; });
      setSharedPanels(shared);
      setTimeout(() => setSharedPanels(initSelected()), 2000);
    }

    setLlms((prev) => {
      const next = { ...prev };
      for (const id of targets) {
        next[id] = { ...prev[id], messages: [...prev[id].messages, { role: "user", content: text }], loading: true };
      }
      return next;
    });

    await Promise.all(targets.map(async (id) => {
      try {
        const msgs = [...llms[id].messages, { role: "user", content: text }];
        const data = await chat(id, msgs, sysPerLlm[id]);
        setLlms((prev) => ({
          ...prev,
          [id]: { ...prev[id], messages: [...prev[id].messages, { role: "assistant", content: data.content }], loading: false },
        }));
      } catch {
        setLlms((prev) => ({
          ...prev,
          [id]: { ...prev[id], messages: [...prev[id].messages, { role: "assistant", content: "⚠️ 응답 실패. 다시 시도해주세요." }], loading: false },
        }));
      }
    }));
  }, [llms, isAnyLoading, selectedIds, step, hasMessages]);

  const handleDiagnosis = useCallback(() => {
    setStep("diagnosis");
    setSummary(null);
    summaryTriggeredRef.current = false;
    sendMessage("지금까지 말씀드린 증상들을 바탕으로 종합 진단을 내려주세요.", "diagnosis", [...LLM_IDS]);
  }, [sendMessage]);

  const handleContinueQA = useCallback(() => {
    setStep("symptom-qa");
    setSelected(initSelected());
    setSummary(null);
    summaryTriggeredRef.current = false;
    setPrompt("");
  }, []);

  const handleSuggestedQuestion = useCallback((text) => {
    setStep("symptom-qa");
    setSelected(initSelected());
    setSummary(null);
    summaryTriggeredRef.current = false;
    setPrompt("");
    // directAnswer=true 로 전송 — 교환 횟수 제한 무시하고 바로 답변
    setTimeout(() => sendMessage(text, "symptom-qa", [...LLM_IDS], true), 50);
  }, [sendMessage]);

  const handleNew = useCallback(() => {
    setActiveId(String(Date.now()));
    setLlms(initLlms());
    setSelected(initSelected());
    setStep("symptom-qa");
    setSummary(null);
    summaryTriggeredRef.current = false;
    setPrompt("");
    setTab("qa");
  }, []);

  const handleSelectConv = useCallback((conv) => {
    setActiveId(conv.id);
    setLlms(conv.llms);
    setStep(conv.step || "symptom-qa");
    setSummary(conv.summary || null);
    summaryTriggeredRef.current = conv.step === "diagnosis";
    setSelected(initSelected());
    setPrompt("");
    setTab("qa");
  }, []);

  let placeholder = "반려동물의 증상을 자유롭게 설명해주세요…";
  if (hasMessages && noneSelected) placeholder = "답변할 AI 패널을 선택하세요";
  else if (hasMessages && selectedIds.length === 1)
    placeholder = `${LLM_CONFIG[selectedIds[0]].name}에게 질문 이어가기…`;

  const activeSelectedName = selectedIds.length === 1 ? LLM_CONFIG[selectedIds[0]].name : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f5f5f5" }}>

      {/* ── 왼쪽 사이드바 ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#fff", borderRight: "1px solid #e5e7eb",
      }}>
        <div style={{ padding: "18px 16px 10px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>🐾 펫 건강 체커</h2>
        </div>

        <div style={{ padding: "0 12px 8px" }}>
          <button
            onClick={handleNew}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "#f9fafb",
              color: "#4f46e5", fontSize: "0.82rem", cursor: "pointer",
              fontWeight: 600, textAlign: "left",
            }}
          >
            ＋ 새 대화
          </button>
        </div>

        <nav style={{ padding: "0 12px 8px" }}>
          <button
            onClick={() => setTab("history")}
            style={{
              width: "100%", padding: "7px 12px", borderRadius: 8, border: "none",
              background: tab === "history" ? "#eef2ff" : "transparent",
              color: tab === "history" ? "#4f46e5" : "#6b7280",
              fontSize: "0.82rem", cursor: "pointer", textAlign: "left",
              fontWeight: tab === "history" ? 600 : 400,
            }}
          >
            📋 진단 기록
          </button>
        </nav>

        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px" }}>
            <p style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              최근 대화
            </p>
            {convHistory.length > 0 && (
              <button
                onClick={() => {
                  saveConvHistory([]);
                  setConvHistory([]);
                }}
                style={{ fontSize: "0.68rem", color: "#d1d5db", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                전체 삭제
              </button>
            )}
          </div>
          {convHistory.length === 0 && (
            <p style={{ padding: "8px 16px", fontSize: "0.78rem", color: "#d1d5db" }}>대화 기록 없음</p>
          )}
          {convHistory.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConv(conv)}
              style={{
                width: "100%", padding: "8px 16px", border: "none",
                background: conv.id === activeId ? "#eef2ff" : "transparent",
                cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 1,
              }}
            >
              <span style={{
                fontSize: "0.8rem", fontWeight: 500,
                color: conv.id === activeId ? "#4f46e5" : "#374151",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%",
              }}>
                {conv.title}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{conv.date}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── 메인 영역 ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 헤더 */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 24px", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: "0.8rem", padding: "3px 10px", borderRadius: 12,
              background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe",
            }}>
              {step === "symptom-qa" ? "증상 파악 중" : "진단 결과"}
            </span>
            {step === "symptom-qa" && activeSelectedName && (
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                <span style={{ color: LLM_CONFIG[selectedIds[0]].color, fontWeight: 600 }}>●</span>
                {" "}{activeSelectedName}와(과) 대화 중 · 다른 AI들도 맥락을 공유받는 중
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {step === "diagnosis" && (
              <button onClick={handleContinueQA} style={btnOutline}>↩ 추가 문답하기</button>
            )}
            {hasMessages && !isAnyLoading && step === "symptom-qa" && (
              <button onClick={handleDiagnosis} style={btnFill}>진단 받기 →</button>
            )}
          </div>
        </header>

        {/* AI 문답 탭 */}
        {tab === "qa" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 입력창 */}
            {step === "symptom-qa" && (
              <div style={{ flexShrink: 0, padding: "14px 24px 10px", background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
                {hasPetHistory && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", marginBottom: 10,
                    background: "#eef2ff", borderRadius: 20,
                    border: "1px solid #c7d2fe",
                    fontSize: "0.76rem", color: "#4f46e5",
                    width: "fit-content",
                  }}>
                    <span>📋</span>
                    <span>과거 진단 기록 참조 중 · AI가 주치의처럼 이전 기록을 알고 있어요</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(prompt); } }}
                    placeholder={placeholder}
                    disabled={isAnyLoading || (hasMessages && noneSelected)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8,
                      border: "1px solid #d1d5db", fontSize: "0.9rem",
                      outline: "none", background: "#fff", color: "#111",
                    }}
                  />
                  <button
                    onClick={() => sendMessage(prompt)}
                    disabled={isAnyLoading || (hasMessages && noneSelected) || !prompt.trim()}
                    style={{ ...btnFill, opacity: (!prompt.trim() || isAnyLoading) ? 0.45 : 1 }}
                  >
                    전송
                  </button>
                </div>
                {isAnyLoading && <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#9ca3af", marginTop: 8 }}>AI 전문가들이 답변을 준비하고 있어요…</p>}
                {!isAnyLoading && hasMessages && noneSelected && <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#9ca3af", marginTop: 8 }}>↓ 답변할 AI 패널을 선택하세요</p>}
                {showNudge && (
                  <div style={{ textAlign: "center", marginTop: 10 }}>
                    <button
                      onClick={handleDiagnosis}
                      style={{ background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: 20, padding: "6px 16px", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      충분한 정보가 모였어요 — 진단을 받아볼까요?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 진단 요약 패널 */}
            {step === "diagnosis" && (summaryLoading || summary) && (
              <div style={{ flexShrink: 0, padding: "14px 24px 0" }}>
                <DiagnosisSummaryPanel summary={summary} loading={summaryLoading} onContinueQA={handleContinueQA} onSuggestedQuestion={handleSuggestedQuestion} />
              </div>
            )}

            {/* 3패널 그리드 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
              <div className="results-grid">
                {LLM_IDS.map((id) => (
                  <LLMPanel
                    key={id}
                    llmId={id}
                    messages={llms[id].messages}
                    loading={llms[id].loading}
                    selected={selected[id]}
                    isListening={hasMessages && !selected[id] && selectedIds.length === 1 && step === "symptom-qa"}
                    onToggleSelect={() => toggleSelect(id)}
                    step={step}
                    showShared={sharedPanels[id]}
                    listeningCount={activeUserMsgCount}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 상담 기록 탭 */}
        {tab === "history" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 8, color: "#111" }}>📋 진단 기록</h2>
            <div style={{
              fontSize: "0.78rem", color: "#6b7280", marginBottom: 20,
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 8, padding: "10px 14px", lineHeight: 1.7,
            }}>
              진단까지 완료된 상담만 표시돼요.<br />
              <span style={{ color: "#4f46e5", fontWeight: 600 }}>진단 기록은 다음 상담 시 AI에게 자동으로 공유</span>돼서,
              처음 만나는 의사가 아닌 <span style={{ fontWeight: 600 }}>내 반려동물을 아는 주치의</span>처럼 대화할 수 있어요.
            </div>
            {convHistory.filter((c) => c.step === "diagnosis" && c.summary).length === 0 && (
              <p style={{ color: "#d1d5db", fontSize: "0.85rem" }}>아직 진단 기록이 없어요. 문답 후 '진단 받기'를 눌러보세요.</p>
            )}
            {convHistory.filter((c) => c.step === "diagnosis" && c.summary).map((conv) => {
              const s = conv.summary;
              const riskColor = { low: "#16a34a", medium: "#d97706", high: "#dc2626" };
              const riskLabel = { low: "낮음", medium: "중간", high: "높음" };
              return (
                <div
                  key={conv.id}
                  onClick={() => { handleSelectConv(conv); setTab("qa"); }}
                  style={{
                    background: "#fff", borderRadius: 12, marginBottom: 12,
                    border: "1px solid #e5e7eb", cursor: "pointer", overflow: "hidden",
                  }}
                >
                  {/* 카드 헤더 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      🐾 {conv.title}
                    </span>
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem", flexShrink: 0, marginLeft: 8 }}>{conv.date}</span>
                  </div>
                  {/* 진단 요약 */}
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {s.topCause && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: 600, flexShrink: 0 }}>공통 원인</span>
                        <span style={{ fontSize: "0.85rem", color: "#111", fontWeight: 600 }}>{s.topCause}</span>
                        {s.riskLevel && (
                          <span style={{
                            fontSize: "0.72rem", padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                            background: (riskColor[s.riskLevel] || "#6b7280") + "18",
                            color: riskColor[s.riskLevel] || "#6b7280",
                            border: `1px solid ${(riskColor[s.riskLevel] || "#6b7280")}44`,
                            fontWeight: 600,
                          }}>
                            위험도 {riskLabel[s.riskLevel] || s.riskLevel}
                          </span>
                        )}
                      </div>
                    )}
                    {s.perLlm && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.perLlm.map(({ llm, cause }) => {
                          const id = llm === "Claude" ? "claude" : llm === "ChatGPT" ? "chatgpt" : "gemini";
                          const color = LLM_CONFIG[id]?.color || "#6b7280";
                          return (
                            <div key={llm} style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>
                              <span style={{ color, fontWeight: 700 }}>{llm}</span> · {cause}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LLM 패널 ────────────────────────────────────────────────────────────────
function LLMPanel({ llmId, messages, loading, selected, isListening, onToggleSelect, step, showShared, listeningCount }) {
  const config = LLM_CONFIG[llmId];
  const bottomRef = useRef(null);
  const isEmpty = messages.length === 0 && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div
      className="result-card"
      style={{
        borderTopColor: config.color,
        outline: selected ? `2px solid ${config.color}` : "none",
        background: isListening ? "#fafafa" : "#fff",
        display: "flex", flexDirection: "column",
        opacity: isListening ? 0.92 : 1,
        transition: "opacity 0.2s, background 0.2s",
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: selected ? config.color : isListening ? "#d1d5db" : config.color,
          display: "inline-block",
        }} />
        <h3 style={{ color: config.color, margin: 0, fontSize: "0.95rem", flex: 1 }}>{config.name}</h3>
        {showShared && (
          <span style={{ fontSize: "0.72rem", color: config.color, opacity: 0.8 }}>↗ 공유됨</span>
        )}
        {step === "diagnosis" && messages.some((m) => m.role === "assistant") && (
          <span style={{
            fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10,
            background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb",
          }}>진단 완료</span>
        )}
        {step === "symptom-qa" && selected && (
          <span style={{
            fontSize: "0.72rem", padding: "3px 10px", borderRadius: 20,
            background: config.color, color: "#fff",
            fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
          }}>
            ✓ 대화 중
          </span>
        )}
        {step === "symptom-qa" && isListening && (
          <span style={{
            fontSize: "0.72rem", padding: "3px 10px", borderRadius: 20, cursor: "pointer",
            background: "#fffbeb", color: "#92400e",
            border: "1px solid #fde68a",
            display: "flex", alignItems: "center", gap: 4,
          }}
            onClick={onToggleSelect}
            title="클릭하면 이 AI와 대화할 수 있어요"
          >
            💡 {listeningCount > 0 ? `${listeningCount}턴 듣는 중` : "듣고 있어요"}
          </span>
        )}
        {step === "symptom-qa" && !selected && !isListening && (
          <button
            onClick={onToggleSelect}
            style={{
              fontSize: "0.75rem", padding: "3px 10px", borderRadius: 20, cursor: "pointer",
              background: "#f9fafb", color: "#6b7280",
              border: "1px solid #e5e7eb",
              fontWeight: 400,
            }}
          >
            답변하기
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, minHeight: 220, maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {isEmpty && (
          <p style={{ color: "#d1d5db", fontSize: "0.8rem", textAlign: "center", marginTop: 24 }}>
            {step === "symptom-qa" ? "증상을 입력하면 질문드릴게요" : "진단 중…"}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "90%", borderRadius: 10, padding: "7px 11px",
              fontSize: "0.83rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
              background: msg.role === "user" ? "#eef2ff" : "#f9fafb",
              color: msg.role === "user" ? "#3730a3" : "#374151",
              border: `1px solid ${msg.role === "user" ? "#c7d2fe" : "#e5e7eb"}`,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 10, padding: "8px 12px", display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: config.color,
                  display: "inline-block",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 듣고 있어요 푸터 */}
      {isListening && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "#fffbeb", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: "0.76rem", color: "#92400e",
          border: "1px solid #fde68a",
        }}>
          <span>💡</span>
          <span>
            {listeningCount > 0
              ? `대화 ${listeningCount}턴 공유받는 중 · 진단 시 이 대화를 바탕으로 의견 드릴게요`
              : "대화를 듣고 있어요 · 진단 시 의견 드릴게요"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── 진단 요약 패널 ───────────────────────────────────────────────────────────
const RISK_COLOR = { low: "#16a34a", medium: "#d97706", high: "#dc2626" };
const RISK_LABEL = { low: "낮음", medium: "중간", high: "높음" };
const AGREE_LABEL = { all: "AI 전원 같은 진단", most: "AI 대다수 같은 진단", split: "AI마다 의견 다름" };

const SPLIT_QUESTIONS = [
  "세 AI 진단이 다른데, 각자 그렇게 판단한 핵심 이유가 뭔가요?",
  "어떤 추가 증상이나 정보가 있으면 원인을 더 좁힐 수 있을까요?",
  "지금 당장 제일 주의해야 할 증상이나 행동이 있나요?",
  "지금 상태에서 집에서 할 수 있는 응급 처치가 있나요?",
];

function DiagnosisSummaryPanel({ summary, loading, onContinueQA, onSuggestedQuestion }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 4 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111" }}>📋 AI 종합 분석</span>
          {loading && <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>분석 중…</span>}
          {summary && !loading && (
            <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{AGREE_LABEL[summary.agreement]}</span>
          )}
        </div>
        {!loading && (
          <button onClick={onContinueQA} style={btnOutline}>↩ 추가 문답하기</button>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: "12px 16px", display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f46e5", display: "inline-block", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      )}

      {/* 결과 */}
      {summary && !loading && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 공통 원인 + 위험도 */}
          {summary.topCause && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f46e5", flexShrink: 0 }}>공통 원인</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111", flex: 1 }}>{summary.topCause}</span>
              {summary.riskLevel && (
                <span style={{
                  fontSize: "0.78rem", padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                  background: RISK_COLOR[summary.riskLevel] + "18",
                  color: RISK_COLOR[summary.riskLevel],
                  border: `1px solid ${RISK_COLOR[summary.riskLevel]}44`,
                  fontWeight: 600,
                }}>
                  위험도 {RISK_LABEL[summary.riskLevel]}
                </span>
              )}
            </div>
          )}

          {/* AI별 소견 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(summary.perLlm || []).map(({ llm, cause }) => {
              const id = llm === "Claude" ? "claude" : llm === "ChatGPT" ? "chatgpt" : "gemini";
              const color = LLM_CONFIG[id]?.color || "#6b7280";
              return (
                <div key={llm} style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color, marginBottom: 4 }}>{llm}</p>
                  <p style={{ fontSize: "0.82rem", color: "#374151", lineHeight: 1.5 }}>{cause}</p>
                </div>
              );
            })}
          </div>

          {/* 추천 질문 — 항상 표시 */}
          <div style={{ background: "#fef9ee", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: "0.8rem", color: "#92400e", fontWeight: 600, marginBottom: 10 }}>
                {summary.agreement === "all"
                  ? "💬 AI 전원이 같은 진단이에요! 더 궁금한 게 있으면 눌러서 물어보세요."
                  : summary.agreement === "most"
                  ? "💬 한 AI 의견이 달라요. 아래 질문으로 더 확인해볼 수 있어요."
                  : "💬 AI마다 다른 원인을 지목하고 있어요. 아래 질문을 눌러 좁혀보세요!"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SPLIT_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSuggestedQuestion(q)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, border: "1px solid #fbbf24",
                      background: "#fff", color: "#92400e", fontSize: "0.78rem",
                      cursor: "pointer", textAlign: "left", lineHeight: 1.5,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

// ── 버튼 스타일 ──────────────────────────────────────────────────────────────
const btnFill = {
  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
  background: "#4f46e5", color: "#fff", fontSize: "0.85rem", fontWeight: 600,
};
const btnOutline = {
  padding: "7px 14px", borderRadius: 8, cursor: "pointer",
  background: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "0.82rem",
};
