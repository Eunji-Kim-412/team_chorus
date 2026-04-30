const API = "http://localhost:8000";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

/**
 * 진단 요청.
 */
export const diagnose = (pet_type, symptoms, options = {}) =>
  request("/api/diagnose", {
    method: "POST",
    body: JSON.stringify({
      pet_type,
      symptoms,
      messages: options.messages || null,
      pet_context: options.pet_context || null,
    }),
  });

export const getHistory = () => request("/api/history");

/**
 * F2 멀티턴 대화: 첫 증상 메시지 → 3개 LLM 동시 응답
 */
export const chatInitial = (first_message, pet_context = null) =>
  request("/api/chat/initial", {
    method: "POST",
    body: JSON.stringify({ first_message, pet_context }),
  });

/**
 * F2 멀티턴 대화: 선택된 LLM과 1턴 대화
 */
export const chatStep = (model_name, messages, pet_context = null) =>
  request("/api/chat/step", {
    method: "POST",
    body: JSON.stringify({ model_name, messages, pet_context }),
  });

/**
 * F2 멀티 패널 대화 (은지님 스타일):
 * 선택된 LLM들에게만 동시 호출, 각자 독립된 대화 유지.
 * @param target_models - 선택된 LLM 이름 배열
 * @param user_text - 사용자 입력
 * @param llms_state - { "Claude (Bedrock)": {"messages": [...]}, ... }
 * @param pet_context
 */
export const chatTurn = (target_models, user_text, llms_state, pet_context = null) =>
  request("/api/chat/turn", {
    method: "POST",
    body: JSON.stringify({ target_models, user_text, llms_state, pet_context }),
  });
