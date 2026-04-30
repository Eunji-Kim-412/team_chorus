import React, { useState, useEffect, useCallback } from "react";

/**
 * F1: 펫 정보 등록/선택/관리 컴포넌트
 *
 * mode:
 *   "selector" - 진단 탭에서 사용 (간단한 칩 선택 + 요약)
 *   "manager"  - 내 반려동물 탭에서 사용 (전체 관리 + 등록/수정/삭제)
 */

const PETS_STORAGE_KEY = "pet_health_checker_f1_pets_v1";
const DAILY_LOGS_STORAGE_KEY = "pet_health_checker_f1_daily_logs_v1";

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

// ===== localStorage 유틸 =====
function splitCsv(s) {
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function joinCsv(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.join(", ");
}
function newId() {
  return `pet-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
function loadPets() {
  try {
    const raw = localStorage.getItem(PETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function savePets(pets) {
  localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(pets));
}
function loadDailyLog(petId) {
  try {
    const raw = localStorage.getItem(DAILY_LOGS_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[petId] || null;
  } catch {
    return null;
  }
}
function saveDailyLog(petId, log) {
  try {
    const raw = localStorage.getItem(DAILY_LOGS_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[petId] = log;
    localStorage.setItem(DAILY_LOGS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function formToPet(form) {
  const now = new Date().toISOString();
  return {
    id: form.id || newId(),
    name: form.name.trim(),
    species: form.species,
    breed: form.breed.trim() || "미상",
    age: {
      years: parseInt(form.ageYears || "0", 10) || 0,
      months: parseInt(form.ageMonths || "0", 10) || 0,
    },
    gender: form.gender,
    neutered: form.neutered === "true",
    weightKg: parseFloat(form.weightKg || "0") || 0,
    medicalHistory: splitCsv(form.medicalHistory),
    medications: splitCsv(form.medications),
    foodType: form.foodType || null,
    preferredFoodBrand: form.preferredFoodBrand?.trim() || null,
    favoriteFoods: splitCsv(form.favoriteFoods),
    allergies: splitCsv(form.allergies),
    createdAt: now,
    updatedAt: now,
  };
}

function petToForm(pet, dailyLog) {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    ageYears: String(pet.age?.years ?? 0),
    ageMonths: String(pet.age?.months ?? 0),
    gender: pet.gender,
    neutered: pet.neutered ? "true" : "false",
    weightKg: String(pet.weightKg ?? ""),
    medicalHistory: joinCsv(pet.medicalHistory),
    medications: joinCsv(pet.medications),
    foodType: pet.foodType || "",
    preferredFoodBrand: pet.preferredFoodBrand || "",
    favoriteFoods: joinCsv(pet.favoriteFoods),
    allergies: joinCsv(pet.allergies),
    yesterdayFood: dailyLog?.yesterdayFood || "",
    stoolType: dailyLog?.stoolType || "",
    activityLevel: dailyLog?.activityLevel || "",
    notes: dailyLog?.notes || "",
  };
}

function speciesEmoji(species) {
  return species === "dog" ? "🐶" : species === "cat" ? "🐱" : "🐾";
}

function ageLabel(pet) {
  const y = pet.age?.years || 0;
  const m = pet.age?.months || 0;
  if (m) return `${y}살 ${m}개월`;
  return `${y}살`;
}


// ==========================================
// 메인 컴포넌트
// ==========================================
export default function PetProfileSection({
  mode = "selector",
  onPetContextChange,
  onGoToManager,  // "펫 관리 페이지로 이동" 콜백 (selector 모드에서 사용)
}) {
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(() => {
    // 마지막 선택 펫 복원
    return localStorage.getItem("pet_health_checker_selected_pet_id") || "";
  });
  const [form, setForm] = useState(emptyPetForm);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 초기 로드
  useEffect(() => {
    const list = loadPets();
    setPets(list);
    if (list.length > 0) {
      // 저장된 선택 ID가 유효하면 유지, 아니면 첫 번째
      const savedId = localStorage.getItem("pet_health_checker_selected_pet_id");
      if (savedId && list.find((p) => p.id === savedId)) {
        setSelectedPetId(savedId);
      } else {
        setSelectedPetId(list[0].id);
      }
    } else if (mode === "manager") {
      // manager 모드 + 펫이 없으면 자동 등록 폼
      setShowForm(true);
    }
  }, [mode]);

  // 선택 ID 저장 + 부모에 컨텍스트 전달
  useEffect(() => {
    if (selectedPetId) {
      localStorage.setItem("pet_health_checker_selected_pet_id", selectedPetId);
    }
    if (!onPetContextChange) return;

    const pet = pets.find((p) => p.id === selectedPetId);
    if (!pet) {
      onPetContextChange(null);
      return;
    }
    const dailyLog = loadDailyLog(pet.id);
    const petContext = {
      pet,
      dailyLog: dailyLog
        ? {
            petId: pet.id,
            date: dailyLog.date || new Date().toISOString().split("T")[0],
            yesterdayFood: dailyLog.yesterdayFood || null,
            stoolType: dailyLog.stoolType || null,
            activityLevel: dailyLog.activityLevel || null,
            notes: dailyLog.notes || null,
          }
        : null,
    };
    onPetContextChange(petContext);
  }, [selectedPetId, pets, onPetContextChange]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartAdd = () => {
    setForm(emptyPetForm);
    setEditMode(false);
    setShowForm(true);
  };

  const handleStartEdit = (petId) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    const dailyLog = loadDailyLog(pet.id);
    setForm(petToForm(pet, dailyLog));
    setEditMode(true);
    setShowForm(true);
  };

  const handleDelete = (petId) => {
    if (!window.confirm("정말 이 펫을 삭제하시겠어요?")) return;
    const next = pets.filter((p) => p.id !== petId);
    setPets(next);
    savePets(next);
    if (selectedPetId === petId) {
      setSelectedPetId(next[0]?.id || "");
    }
    if (next.length === 0 && mode === "manager") setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("반려동물 이름을 입력해주세요.");
      return;
    }
    const pet = formToPet(form);
    let nextPets;
    if (editMode && form.id) {
      nextPets = pets.map((p) =>
        p.id === form.id ? { ...pet, createdAt: p.createdAt } : p
      );
    } else {
      nextPets = [...pets, pet];
    }
    setPets(nextPets);
    savePets(nextPets);
    setSelectedPetId(pet.id);

    // 일일 로그 저장
    const dailyLog = {
      date: new Date().toISOString().split("T")[0],
      yesterdayFood: form.yesterdayFood.trim() || null,
      stoolType: form.stoolType || null,
      activityLevel: form.activityLevel || null,
      notes: form.notes.trim() || null,
    };
    saveDailyLog(pet.id, dailyLog);

    setShowForm(false);
    setEditMode(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditMode(false);
    if (mode === "manager" && pets.length === 0) setShowForm(true);
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  // ========================================
  // SELECTOR 모드 (진단 탭용 간단 바)
  // ========================================
  if (mode === "selector") {
    if (pets.length === 0) {
      return (
        <div className="pet-selector-empty">
          <p>
            <strong>🐾 등록된 반려동물이 없어요.</strong>
          </p>
          <p>진단을 시작하려면 먼저 반려동물 정보를 등록해주세요.</p>
          <button className="pet-add-btn-large" onClick={onGoToManager}>
            + 반려동물 등록하러 가기
          </button>
        </div>
      );
    }

    return (
      <div className="pet-selector-compact">
        <div className="pet-selector-header">
          <span className="pet-selector-label">진단할 반려동물</span>
          <button
            className="pet-mini-btn"
            onClick={onGoToManager}
            title="내 반려동물 관리 페이지로 이동"
          >
            ⚙️ 관리
          </button>
        </div>
        <div className="pet-chips">
          {pets.map((p) => (
            <button
              key={p.id}
              className={`pet-chip ${p.id === selectedPetId ? "active" : ""}`}
              onClick={() => setSelectedPetId(p.id)}
            >
              <span className="pet-chip-emoji">{speciesEmoji(p.species)}</span>
              <span className="pet-chip-name">{p.name}</span>
              <span className="pet-chip-meta">
                {p.breed} · {ageLabel(p)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========================================
  // MANAGER 모드 (내 반려동물 탭)
  // ========================================
  return (
    <div className="pet-manager">
      {/* 폼이 열려있으면 폼만 표시 */}
      {showForm ? (
        <form className="pet-form" onSubmit={handleSubmit}>
          <div className="pet-form-header">
            <h3>{editMode ? "🐾 펫 정보 수정" : "🐾 새 반려동물 등록"}</h3>
            {pets.length > 0 && (
              <button type="button" className="pet-mini-btn" onClick={handleCancel}>
                취소
              </button>
            )}
          </div>

          <div className="pet-form-grid">
            <label>
              이름 *
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="예: 콩이" required />
            </label>

            <label>
              종류 *
              <select name="species" value={form.species} onChange={handleFormChange}>
                <option value="dog">🐶 강아지</option>
                <option value="cat">🐱 고양이</option>
                <option value="other">🐾 기타</option>
              </select>
            </label>

            <label>
              품종
              <input name="breed" value={form.breed} onChange={handleFormChange} placeholder="예: 요크셔테리어" />
            </label>

            <div className="pet-form-row">
              <label>
                나이 (년)
                <input name="ageYears" type="number" min="0" max="40" value={form.ageYears} onChange={handleFormChange} placeholder="3" />
              </label>
              <label>
                개월
                <input name="ageMonths" type="number" min="0" max="11" value={form.ageMonths} onChange={handleFormChange} />
              </label>
            </div>

            <label>
              성별
              <select name="gender" value={form.gender} onChange={handleFormChange}>
                <option value="male">수컷</option>
                <option value="female">암컷</option>
              </select>
            </label>

            <label>
              중성화 여부
              <select name="neutered" value={form.neutered} onChange={handleFormChange}>
                <option value="true">예</option>
                <option value="false">아니요</option>
              </select>
            </label>

            <label>
              몸무게 (kg)
              <input name="weightKg" type="number" min="0" step="0.1" value={form.weightKg} onChange={handleFormChange} placeholder="3.5" />
            </label>

            <label>
              사료 종류
              <select name="foodType" value={form.foodType} onChange={handleFormChange}>
                <option value="">선택 안함</option>
                <option value="dry">건식</option>
                <option value="wet">습식</option>
                <option value="raw">생식</option>
                <option value="mixed">혼합</option>
              </select>
            </label>

            <label className="pet-form-full">
              병력 (쉼표로 구분)
              <input name="medicalHistory" value={form.medicalHistory} onChange={handleFormChange} placeholder="예: 슬개골 탈구, 알러지성 피부염" />
            </label>

            <label className="pet-form-full">
              상시 복용 약물 (쉼표로 구분)
              <input name="medications" value={form.medications} onChange={handleFormChange} placeholder="예: 심장사상충 예방약" />
            </label>

            <label className="pet-form-full">
              알레르기 (쉼표로 구분)
              <input name="allergies" value={form.allergies} onChange={handleFormChange} placeholder="예: 닭고기, 옥수수" />
            </label>
          </div>

          <details className="pet-form-daily">
            <summary>📋 오늘의 컨디션 (선택)</summary>
            <div className="pet-form-grid">
              <label className="pet-form-full">
                전날 먹은 음식
                <input name="yesterdayFood" value={form.yesterdayFood} onChange={handleFormChange} placeholder="예: 평소 사료 + 간식 몇 개" />
              </label>
              <label>
                용변 상태
                <select name="stoolType" value={form.stoolType} onChange={handleFormChange}>
                  <option value="">선택 안함</option>
                  <option value="normal">정상</option>
                  <option value="diarrhea">설사</option>
                  <option value="constipation">변비</option>
                  <option value="bloody">혈변</option>
                </select>
              </label>
              <label>
                활동량
                <select name="activityLevel" value={form.activityLevel} onChange={handleFormChange}>
                  <option value="">선택 안함</option>
                  <option value="normal">평소대로</option>
                  <option value="decreased">줄어듦</option>
                  <option value="increased">늘어남</option>
                </select>
              </label>
              <label className="pet-form-full">
                자유 메모
                <input name="notes" value={form.notes} onChange={handleFormChange} placeholder="예: 오후부터 평소랑 달리 조용함" />
              </label>
            </div>
          </details>

          <button type="submit" className="pet-save-btn">
            {editMode ? "💾 수정 완료" : "✅ 펫 등록"}
          </button>
        </form>
      ) : (
        /* 목록 뷰 */
        <>
          <div className="pet-manager-header">
            <h2>🐾 내 반려동물 ({pets.length})</h2>
            <button className="pet-add-btn" onClick={handleStartAdd}>
              + 새 반려동물 추가
            </button>
          </div>

          {pets.length === 0 ? (
            <div className="pet-manager-empty">
              <p>아직 등록된 반려동물이 없어요.</p>
              <button className="pet-add-btn-large" onClick={handleStartAdd}>
                + 첫 반려동물 등록하기
              </button>
            </div>
          ) : (
            <div className="pet-grid">
              {pets.map((p) => {
                const dailyLog = loadDailyLog(p.id);
                return (
                  <div key={p.id} className="pet-full-card">
                    <div className="pet-full-card-header">
                      <h3>
                        {speciesEmoji(p.species)} {p.name}
                      </h3>
                      <div className="pet-detail-actions">
                        <button className="pet-mini-btn" onClick={() => handleStartEdit(p.id)}>
                          ✏️ 수정
                        </button>
                        <button
                          className="pet-mini-btn pet-mini-btn-danger"
                          onClick={() => handleDelete(p.id)}
                        >
                          🗑 삭제
                        </button>
                      </div>
                    </div>

                    <dl className="pet-detail-grid">
                      <dt>품종</dt>
                      <dd>{p.breed}</dd>
                      <dt>나이</dt>
                      <dd>{ageLabel(p)}</dd>
                      <dt>성별</dt>
                      <dd>
                        {p.gender === "male" ? "수컷" : "암컷"}
                        {p.neutered ? " · 중성화 ✓" : ""}
                      </dd>
                      <dt>몸무게</dt>
                      <dd>{p.weightKg}kg</dd>
                      {p.foodType && (
                        <>
                          <dt>사료</dt>
                          <dd>
                            {{ dry: "건식", wet: "습식", raw: "생식", mixed: "혼합" }[p.foodType]}
                            {p.preferredFoodBrand ? ` (${p.preferredFoodBrand})` : ""}
                          </dd>
                        </>
                      )}
                      {p.medicalHistory?.length > 0 && (
                        <>
                          <dt>병력</dt>
                          <dd>{p.medicalHistory.join(", ")}</dd>
                        </>
                      )}
                      {p.medications?.length > 0 && (
                        <>
                          <dt>복용 약물</dt>
                          <dd>{p.medications.join(", ")}</dd>
                        </>
                      )}
                      {p.allergies?.length > 0 && (
                        <>
                          <dt>알레르기</dt>
                          <dd>{p.allergies.join(", ")}</dd>
                        </>
                      )}
                      {p.favoriteFoods?.length > 0 && (
                        <>
                          <dt>좋아하는 음식</dt>
                          <dd>{p.favoriteFoods.join(", ")}</dd>
                        </>
                      )}
                    </dl>

                    {dailyLog && (dailyLog.stoolType || dailyLog.activityLevel || dailyLog.yesterdayFood || dailyLog.notes) && (
                      <div className="pet-daily-summary">
                        <h4>📋 최근 컨디션</h4>
                        <dl className="pet-detail-grid">
                          {dailyLog.yesterdayFood && (
                            <>
                              <dt>전날 식이</dt>
                              <dd>{dailyLog.yesterdayFood}</dd>
                            </>
                          )}
                          {dailyLog.stoolType && (
                            <>
                              <dt>용변</dt>
                              <dd>
                                {{ normal: "정상", diarrhea: "설사", constipation: "변비", bloody: "혈변" }[dailyLog.stoolType]}
                              </dd>
                            </>
                          )}
                          {dailyLog.activityLevel && (
                            <>
                              <dt>활동량</dt>
                              <dd>
                                {{ normal: "평소대로", decreased: "줄어듦", increased: "늘어남" }[dailyLog.activityLevel]}
                              </dd>
                            </>
                          )}
                          {dailyLog.notes && (
                            <>
                              <dt>메모</dt>
                              <dd>{dailyLog.notes}</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}

                    <div className="pet-card-footer">
                      <small>
                        등록: {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                        {p.updatedAt !== p.createdAt && (
                          <> · 수정: {new Date(p.updatedAt).toLocaleDateString("ko-KR")}</>
                        )}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
