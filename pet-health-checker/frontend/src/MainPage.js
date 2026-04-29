import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { diagnose, getHistory } from "./api";

const MODEL_COLORS = { "Claude (Bedrock)": "#d97706", "GPT (OpenAI)": "#10a37f", "Gemini (Google)": "#4285f4" };
const PETS_STORAGE_KEY = "pet_health_checker_f1_pets_v1";
const DAILY_LOGS_STORAGE_KEY = "pet_health_checker_f1_daily_logs_v1";
const PRESET_PETS = [
  { id: "preset-ppoppi", name: "뽀삐", species: "dog", breed: "말티즈", age: { years: 3, months: 0 }, gender: "female", neutered: true, weightKg: 4.1 },
  { id: "preset-choco", name: "초코", species: "dog", breed: "푸들", age: { years: 5, months: 0 }, gender: "male", neutered: true, weightKg: 5.2 },
  { id: "preset-sugar", name: "설탕이", species: "cat", breed: "코리안숏헤어", age: { years: 8, months: 0 }, gender: "female", neutered: true, weightKg: 3.8 },
];

const emptyPetForm = {
  id: "",
  name: "",
  species: "dog",
  breed: "",
  ageYears: "",
  ageMonths: "0",
  gender: "male",
  neutered: "true",
  weightKg: "",
  medicalHistory: "",
  medications: "",
  foodType: "",
  preferredFoodBrand: "",
  favoriteFoods: "",
  allergies: "",
  yesterdayFood: "",
  stoolType: "",
  activityLevel: "",
  notes: "",
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
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [llmNotes, setLlmNotes] = useState({ gpt: "", gemini: "", claude: "" });
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [showPetForm, setShowPetForm] = useState(true);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  useEffect(() => {
    try {
      const petRaw = localStorage.getItem(PETS_STORAGE_KEY);
      const loadedPets = petRaw ? JSON.parse(petRaw) : [];
      const mergedPets = [...loadedPets];
      PRESET_PETS.forEach((preset) => {
        if (!mergedPets.some((p) => p.id === preset.id || p.name === preset.name)) {
          mergedPets.push({
            ...preset,
            medicalHistory: [],
            medications: [],
            foodType: null,
            preferredFoodBrand: null,
            favoriteFoods: [],
            allergies: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });
      setPets(mergedPets);
      setSelectedPetId("");
      setPetForm(emptyPetForm);
      setShowPetForm(true);
    } catch {
      setPets(PRESET_PETS);
      setSelectedPetId("");
      setPetForm(emptyPetForm);
      setShowPetForm(true);
    }
  }, []);

  const updatePetForm = (key, value) => {
    setPetForm((prev) => ({ ...prev, [key]: value }));
  };

  const parseList = (value) =>
    value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const loadSelectedPetIntoForm = () => {
    if (!selectedPet) return;
    setPetForm({
      id: selectedPet.id,
      name: selectedPet.name || "",
      species: selectedPet.species || "dog",
      breed: selectedPet.breed || "",
      ageYears: String(selectedPet.age?.years ?? 0),
      ageMonths: String(selectedPet.age?.months ?? 0),
      gender: selectedPet.gender || "male",
      neutered: String(selectedPet.neutered ?? true),
      weightKg: String(selectedPet.weightKg ?? ""),
      medicalHistory: (selectedPet.medicalHistory || []).join(", "),
      medications: (selectedPet.medications || []).join(", "),
      foodType: selectedPet.foodType || "",
      preferredFoodBrand: selectedPet.preferredFoodBrand || "",
      favoriteFoods: (selectedPet.favoriteFoods || []).join(", "),
      allergies: (selectedPet.allergies || []).join(", "),
      yesterdayFood: "",
      stoolType: "",
      activityLevel: "",
      notes: "",
    });
    setShowPetForm(true);
  };

  const savePetInfo = (e) => {
    e.preventDefault();
    if (!petForm.name.trim() || !petForm.breed.trim() || !petForm.ageYears.trim() || !petForm.weightKg.trim()) {
      alert("이름, 품종, 나이, 몸무게는 필수 입력입니다.");
      return;
    }

    const now = new Date().toISOString();
    const petId = petForm.id || `${Date.now()}`;
    const pet = {
      id: petId,
      name: petForm.name.trim(),
      species: petForm.species,
      breed: petForm.breed.trim(),
      age: { years: Number(petForm.ageYears || "0"), months: Number(petForm.ageMonths || "0") },
      gender: petForm.gender,
      neutered: petForm.neutered === "true",
      weightKg: Number(petForm.weightKg || "0"),
      medicalHistory: parseList(petForm.medicalHistory),
      medications: parseList(petForm.medications),
      foodType: petForm.foodType || null,
      preferredFoodBrand: petForm.preferredFoodBrand.trim() || null,
      favoriteFoods: parseList(petForm.favoriteFoods),
      allergies: parseList(petForm.allergies),
      createdAt: selectedPet?.createdAt || now,
      updatedAt: now,
    };

    const hasDailyLog = petForm.yesterdayFood || petForm.stoolType || petForm.activityLevel || petForm.notes;
    const dailyLog = hasDailyLog
      ? {
          petId,
          date: now.slice(0, 10),
          yesterdayFood: petForm.yesterdayFood || null,
          stoolType: petForm.stoolType || null,
          activityLevel: petForm.activityLevel || null,
          notes: petForm.notes || null,
        }
      : null;

    const nextPets = pets.some((p) => p.id === petId) ? pets.map((p) => (p.id === petId ? pet : p)) : [pet, ...pets];
    setPets(nextPets);
    setSelectedPetId(petId);
    setShowPetForm(false);
    localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(nextPets));

    if (dailyLog) {
      try {
        const logsRaw = localStorage.getItem(DAILY_LOGS_STORAGE_KEY);
        const logs = logsRaw ? JSON.parse(logsRaw) : [];
        const nextLogs = [dailyLog, ...logs.filter((l) => l.petId !== petId)];
        localStorage.setItem(DAILY_LOGS_STORAGE_KEY, JSON.stringify(nextLogs));
      } catch {
        localStorage.setItem(DAILY_LOGS_STORAGE_KEY, JSON.stringify([dailyLog]));
      }
    }
  };

  const startWithSelectedPet = () => {
    if (!selectedPet) {
      setShowPetForm(true);
      return;
    }
    setPetType(selectedPet.species);
    setShowPetForm(false);
  };

  const handleImportFromLlm = (provider) => {
    const links = {
      gpt: "https://chat.openai.com",
      gemini: "https://gemini.google.com",
      claude: "https://claude.ai",
    };
    const promptText =
      "과거 대화 중 내 반려동물 건강진단에 도움이 될 만한 정보를 요약해서 추출해줘.";
    window.open(links[provider], "_blank", "noopener,noreferrer");
    const pasted = window.prompt(
      `${provider.toUpperCase()} 창에서 아래 요청을 입력 후 결과 요약을 붙여넣어 주세요:\n\n${promptText}`,
      llmNotes[provider] || ""
    );
    if (pasted && pasted.trim()) {
      setLlmNotes((prev) => ({ ...prev, [provider]: pasted.trim() }));
      alert(`${provider.toUpperCase()} 요약을 가져왔습니다.`);
    }
  };

  const handleDiagnose = async (e) => {
    e.preventDefault();
    if (!selectedPet) {
      alert("먼저 펫 정보를 등록/선택해주세요.");
      return;
    }
    setLoading(true);
    setResults([]);
    setSummary("");
    setNeedsHospital(false);
    try {
      const llmSummaryText = Object.entries(llmNotes)
        .filter(([, v]) => v)
        .map(([k, v]) => `[${k.toUpperCase()} 요약]\n${v}`)
        .join("\n\n");
      const symptomPayload = llmSummaryText ? `${symptoms}\n\n${llmSummaryText}` : symptoms;
      const petContext = { pet: selectedPet };
      const data = await diagnose(petType, symptomPayload, petContext);
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
        <h1>🐾 펫 건강 체크</h1>
      </header>

      <div className="diagnose-section">
          <section className="f1-section">
            <div className="f1-title-block">
              <h2>F1. 펫 정보 등록</h2>
              <p>보호자가 반려동물 정보를 등록/수정하고, 이 정보로 진단을 시작합니다.</p>
            </div>

            <div className="f1-control-grid">
              <div className="f1-actions">
                <select value={selectedPetId} onChange={(e) => setSelectedPetId(e.target.value)}>
                  <option value="">등록된 펫 선택</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} · {pet.breed}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={loadSelectedPetIntoForm} disabled={!selectedPetId}>수정</button>
                <button type="button" onClick={() => { setPetForm(emptyPetForm); setShowPetForm(true); }}>새 등록</button>
              </div>
            </div>

            {showPetForm ? (
              <form className="f1-form-grid" onSubmit={savePetInfo}>
                <section className="f1-form-card">
                  <h3>기본 정보 (필수)</h3>
                  <div className="species-toggle-row">
                    <button
                      type="button"
                      className={petForm.species === "dog" ? "active" : ""}
                      onClick={() => updatePetForm("species", "dog")}
                    >
                      🐶 강아지
                    </button>
                    <button
                      type="button"
                      className={petForm.species === "cat" ? "active" : ""}
                      onClick={() => updatePetForm("species", "cat")}
                    >
                      🐱 고양이
                    </button>
                  </div>
                  <div className="f1-card-grid">
                    <input placeholder="이름 *" value={petForm.name} onChange={(e) => updatePetForm("name", e.target.value)} />
                    <input placeholder="품종 *" value={petForm.breed} onChange={(e) => updatePetForm("breed", e.target.value)} />
                    <input type="number" placeholder="나이(년) *" value={petForm.ageYears} onChange={(e) => updatePetForm("ageYears", e.target.value)} />
                    <select value={petForm.gender} onChange={(e) => updatePetForm("gender", e.target.value)}>
                      <option value="male">수컷</option>
                      <option value="female">암컷</option>
                    </select>
                    <select value={petForm.neutered} onChange={(e) => updatePetForm("neutered", e.target.value)}>
                      <option value="true">중성화 함</option>
                      <option value="false">중성화 안 함</option>
                    </select>
                    <input type="number" step="0.1" placeholder="몸무게(kg) *" value={petForm.weightKg} onChange={(e) => updatePetForm("weightKg", e.target.value)} />
                  </div>
                </section>

                <section className="f1-form-card">
                  <h3>건강/식이 정보 (선택)</h3>
                  <div className="f1-card-grid">
                    <input placeholder="병력 (쉼표로 구분)" value={petForm.medicalHistory} onChange={(e) => updatePetForm("medicalHistory", e.target.value)} />
                    <input placeholder="상시 복용 약물 (쉼표로 구분)" value={petForm.medications} onChange={(e) => updatePetForm("medications", e.target.value)} />
                    <select value={petForm.foodType} onChange={(e) => updatePetForm("foodType", e.target.value)}>
                      <option value="">사료 종류</option>
                      <option value="dry">건식</option>
                      <option value="wet">습식</option>
                      <option value="raw">생식</option>
                      <option value="mixed">혼합</option>
                    </select>
                    <input placeholder="자주 먹는 사료 브랜드" value={petForm.preferredFoodBrand} onChange={(e) => updatePetForm("preferredFoodBrand", e.target.value)} />
                    <input placeholder="좋아하는 음식 (쉼표로 구분)" value={petForm.favoriteFoods} onChange={(e) => updatePetForm("favoriteFoods", e.target.value)} />
                    <input placeholder="알레르기 (쉼표로 구분)" value={petForm.allergies} onChange={(e) => updatePetForm("allergies", e.target.value)} />
                  </div>
                </section>

                <section className="f1-form-card">
                  <h3>일일 컨디션 (선택)</h3>
                  <div className="f1-card-grid">
                    <input placeholder="전날 먹은 음식" value={petForm.yesterdayFood} onChange={(e) => updatePetForm("yesterdayFood", e.target.value)} />
                    <select value={petForm.stoolType} onChange={(e) => updatePetForm("stoolType", e.target.value)}>
                      <option value="">용변 형태</option>
                      <option value="normal">정상</option>
                      <option value="diarrhea">설사</option>
                      <option value="constipation">변비</option>
                      <option value="bloody">혈변</option>
                    </select>
                    <select value={petForm.activityLevel} onChange={(e) => updatePetForm("activityLevel", e.target.value)}>
                      <option value="">활동량</option>
                      <option value="normal">평소대로</option>
                      <option value="decreased">줄어듦</option>
                      <option value="increased">늘어남</option>
                    </select>
                    <textarea placeholder="자유 메모" value={petForm.notes} onChange={(e) => updatePetForm("notes", e.target.value)} rows={2} />
                  </div>
                </section>
                <button type="submit" className="f1-save-btn">펫 정보 저장</button>
              </form>
            ) : selectedPet ? (
              <div className="f1-summary-card">
                <h3>{selectedPet.name} · {selectedPet.breed}</h3>
                <p>종: {selectedPet.species === "dog" ? "강아지" : selectedPet.species === "cat" ? "고양이" : "기타"} / 나이: {selectedPet.age?.years ?? 0}년 {selectedPet.age?.months ?? 0}개월 / 성별: {selectedPet.gender === "male" ? "수컷" : "암컷"}</p>
                <p>중성화: {selectedPet.neutered ? "예" : "아니오"} / 몸무게: {selectedPet.weightKg}kg</p>
                <p>병력: {(selectedPet.medicalHistory || []).join(", ") || "-"}</p>
                <p>상시 복용 약물: {(selectedPet.medications || []).join(", ") || "-"}</p>
                <p>알레르기: {(selectedPet.allergies || []).join(", ") || "-"}</p>
                <button type="button" onClick={startWithSelectedPet}>이 정보로 시작</button>
              </div>
            ) : (
              <p className="f1-empty-help">등록된 펫이 없습니다. 새 등록으로 시작해주세요.</p>
            )}
          </section>

          <form onSubmit={handleDiagnose} className="diagnose-form-card">
            <h3 className="symptom-title">증상 입력하기</h3>
            <textarea placeholder="증상을 자세히 입력해주세요. 예: 식욕이 없고 구토를 하며 기운이 없어요" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} required />
            <section className="llm-history-block">
              <h3>LLM대화기록에서 펫 히스토리 불러오기 (선택)</h3>
              <p className="f1-llm-title">나의 LLM에서 펫 정보 불러오기</p>
              <div className="f1-llm-buttons">
                <button type="button" onClick={() => handleImportFromLlm("gpt")}>GPT에서 불러오기</button>
                <button type="button" onClick={() => handleImportFromLlm("gemini")}>Gemini에서 불러오기</button>
                <button type="button" onClick={() => handleImportFromLlm("claude")}>Claude에서 불러오기</button>
              </div>
            </section>
            <button type="submit" disabled={!petType || loading || !selectedPet}>{loading ? "AI 분석 중..." : "진단 요청"}</button>
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
