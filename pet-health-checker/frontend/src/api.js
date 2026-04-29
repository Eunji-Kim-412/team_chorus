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
