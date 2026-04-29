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

export const diagnose = (pet_type, symptoms) => request("/api/diagnose", { method: "POST", body: JSON.stringify({ pet_type, symptoms }) });
export const getHistory = () => request("/api/history");
export const chat = (llm, messages, system_prompt) => request("/api/chat", { method: "POST", body: JSON.stringify({ llm, messages, system_prompt }) });
export const diagnoseSummary = (diagnoses) => request("/api/diagnose-summary", { method: "POST", body: JSON.stringify({ diagnoses }) });
