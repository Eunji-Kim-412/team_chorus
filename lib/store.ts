import { MOCK_PATIENTS, type MockPatient } from "./mockData";

export interface MessageLog {
  id: string;
  patientId: string;
  patientName: string;
  ownerName: string;
  messageType: string;
  sentAt: string;
  preview: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __pawlyPatients: MockPatient[] | undefined;
  // eslint-disable-next-line no-var
  var __pawlyMessages: MessageLog[] | undefined;
}

// ── 시연용 발송 이력 더미데이터 생성 ──
const PREVIEW_TEMPLATES: Record<string, string[]> = {
  vaccination: [
    "안녕하세요, 우리동물병원입니다 💉 {name} 예방접종 예정일이 다가왔어요. 당일 컨디션 체크 후 방문 부탁드려요.",
    "{name} 보호자님, 예방접종 하루 전 안내드려요. 접종 후 1~2일은 무리한 활동을 피해주세요 🐾",
    "{name} 종합백신 접종이 완료됐어요. 다음 접종 일정은 문자로 다시 안내드릴게요. 감사합니다!",
  ],
  "pre-surgery": [
    "{name} 보호자님, 수술 전 안내드려요. 수술 12시간 전부터 금식, 물은 6시간 전까지 가능합니다 🏥",
    "안녕하세요, 우리동물병원입니다. {name} 수술 당일 준비사항 안내드려요. 평소 복용약이 있으면 미리 알려주세요.",
  ],
  "post-surgery": [
    "안녕하세요 🐾 {name} 수술 잘 끝났어요. 봉합 부위 14일간 보호, 처방약 하루 2회 식후 급여 부탁드려요. 이상 시 즉시 연락 주세요.",
    "{name} 수술 후 경과 안내드려요. 식욕·활력이 점차 돌아오고 있어요. 다음 내원일에 실밥 제거 예정입니다.",
    "{name} 보호자님, 수술 부위가 붓거나 진물이 보이면 바로 병원으로 연락 주세요. 회복 잘 하고 있어요!",
  ],
  revisit: [
    "{name} 보호자님, 재내원 안내드려요. 정기 검진 시기가 되어 방문을 권장드립니다 📅",
    "안녕하세요, 우리동물병원입니다. {name} 실밥 제거를 위한 재방문 안내드려요. 편하신 시간에 연락 주세요.",
    "{name} 정기 건강검진 시기예요. 마지막 방문 이후 시간이 지나 한 번 살펴보면 좋겠습니다 🐾",
  ],
};

function daysAgoISO(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor((days * 7) % 60), 0, 0);
  return d.toISOString();
}

function generateMockMessages(patients: MockPatient[]): MessageLog[] {
  const logs: MessageLog[] = [];
  for (const p of patients) {
    // 발송완료 환자 + 이탈 위험 환자에게 과거 발송 이력 부여
    const seed = parseInt(p.id, 10) || 1;
    let count = 0;
    if (p.status === "sent") count = 1 + (seed % 2); // 1~2건
    else if (p.atRisk) count = 1;
    if (count === 0) continue;

    const templates = PREVIEW_TEMPLATES[p.messageType] ?? PREVIEW_TEMPLATES.revisit;
    for (let j = 0; j < count; j++) {
      const daysAgo = 4 + j * 38 + (seed % 11); // 최근 → 과거로 간격
      const hour = 9 + ((seed + j) % 9);
      const tpl = templates[(seed + j) % templates.length];
      logs.push({
        id: `seed-${p.id}-${j}`,
        patientId: p.id,
        patientName: p.petName,
        ownerName: p.ownerName,
        messageType: p.messageType,
        sentAt: daysAgoISO(daysAgo, hour),
        preview: tpl.replace(/\{name\}/g, p.petName),
      });
    }
  }
  // 시연용 개별 지정 이력 — 망고: 심장사상충 예방접종 안내
  const mango = patients.find((p) => p.petName === "망고");
  if (mango) {
    const y = new Date().getFullYear();
    logs.push({
      id: `seed-${mango.id}-heartworm`,
      patientId: mango.id,
      patientName: mango.petName,
      ownerName: mango.ownerName,
      messageType: "vaccination",
      sentAt: new Date(y, 1, 20, 10, 30, 0).toISOString(), // 2월 20일 발송
      preview: "안녕하세요, 우리동물병원입니다 💉 망고 보호자님, 심장사상충 예방접종일이 3월 1일입니다. 잊지 마시고 내원 바랍니다 🐾 우리동물병원 드림",
    });
  }

  // 최신순 정렬
  logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  return logs;
}

if (!global.__pawlyPatients) {
  global.__pawlyPatients = [...MOCK_PATIENTS];
}
if (!global.__pawlyMessages) {
  global.__pawlyMessages = generateMockMessages(global.__pawlyPatients);
}

export function getPatients(): MockPatient[] {
  return global.__pawlyPatients!;
}

export function setPatients(patients: MockPatient[]): void {
  global.__pawlyPatients = patients;
}

export function getMessages(): MessageLog[] {
  return global.__pawlyMessages!;
}

export function addMessageLog(msg: MessageLog): void {
  global.__pawlyMessages = [msg, ...(global.__pawlyMessages ?? [])];
}
