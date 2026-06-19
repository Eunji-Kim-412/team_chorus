import type { MessageType } from "./ai/types";

export type SendStatus = "pending" | "sent";

export interface MockPatient {
  id: string;
  ownerName: string;
  ownerPhone: string;
  petName: string;
  breed: string;
  age: string;
  messageType: MessageType;
  dDay: number;
  status: SendStatus;
  atRisk?: boolean;
  vaccineType?: string;
  vaccineDate?: string;
  reminderDays?: string;
  surgeryType?: string;
  medications?: string;
  nextVisit?: string;
  revisitDate?: string;
  revisitReason?: string;
  firstVisit?: string;
  lastVisit?: string;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const OWNER_NAMES = [
  "이서연","김민준","박지훈","최수아","정하은","강민서","윤지우","임채원","송유진","한지수",
  "오세훈","배나영","신동현","류지원","황민경","전태양","고은비","백현우","노지혜","장민호",
  "권수빈","문가영","양지성","조하늘","서준혁","남지은","안재원","성유리","하준서","천소희",
  "방태준","엄지영","표민우","금나래","탁현수","위소연","구자명","노현정","심재훈","피은영",
  "진서우","라미라","도현준","예지원","사미영","기태현","공하은","음민서","당지현","류민아",
  "유재석","박명수","정형돈","노홍철","하하","김종국","이광수","지석진","송지효","전소민",
  "이예지","박소현","최민혁","김다은","이준호","박채연","정유진","김태양","류서연","오민준",
  "강지수","윤채원","임서하","송민지","한지혜","오승훈","배지은","신나영","류준혁","황지원",
  "전민경","고태양","백소희","노민서","장지성","권하늘","문재원","양수빈","조유리","서가영",
  "남준혁","안지은","성민우","하나래","천현수","방소연","엄자명","표현정","금재훈","탁은영",
  "허지민","도준서","예소희",
];

const PHONE_PREFIXES = ["010-1234","010-2345","010-3456","010-4567","010-5678","010-6789","010-7890","010-8901","010-9012","010-0123"];

const PET_NAMES = [
  "보리","가나디","두부","초코","루나","코코","망고","별이","해피","뭉치",
  "몽이","콩이","토리","하루","나비","구름","바람","햇살","달이","별빛",
  "복실","탄탄","포동","통통","살구","매실","자두","복숭아","감귤","수박",
  "딸기","블루","그레이","화이트","블랙","브라운","골드","실버","퍼플","핑크",
  "미소","기쁨","행복","사랑","평화","희망","꿈","믿음","소망","기적",
  "찰리","쿠키","버터","크림","모카","라떼","에스프레소","카푸치노","마카롱","에클레어",
  "로이","맥스","벨라","루시","몰리","데이지","로즈","팝콘","허니","버블",
  "두리","세리","네오","다라","오즈","유빈","치코","카카오","밀크","요거트",
  "치즈","피자","파스타","리조또","뇨끼","라면","우동","소바","쌀국수","팟타이",
  "천둥","번개","폭풍","태풍","소나기","이슬","안개","무지개","노을","여명",
  "알파","베타","감마","델타","엡실론",
];

const BREEDS = [
  "푸들","말티즈","시츄","비숑프리제","웰시코기","진돗개","골든리트리버","포메라니안","치와와","닥스훈트",
  "불독","퍼그","보스턴테리어","프렌치불독","비글","코커스패니얼","요크셔테리어","미니어처슈나우저","사모예드","허스키",
  "라브라도리트리버","저먼셰퍼드","로트와일러","도베르만","복서","그레이트데인","달마시안","차우차우","아키타","시바이누",
  "페르시안","러시안블루","스코티시폴드","브리티시쇼트헤어","메인쿤","벵갈","아비시니안","이집션마우","버마","샴",
];

const VACCINE_TYPES = ["종합백신 (DHPPL)","광견병","켄넬코프","코로나","인플루엔자","심장사상충 예방","종합백신+광견병","FELV (고양이 백혈병)"];
const SURGERY_TYPES = ["중성화 수술","슬개골 탈구 수술","발치","종양 제거","위장 수술","정형외과 수술","안과 수술","피부 봉합","귀 수술","비뇨기 수술"];
const MEDICATIONS = ["진통제, 항생제","소염제, 항생제","항생제, 위장약","진통제, 소염제","스테로이드제, 항생제","항히스타민제","이뇨제, 심장약","갑상선약","인슐린","관절보조제"];
const REVISIT_REASONS = ["실밥 제거","정기 검진","추가 접종","혈액 검사","방사선 촬영","초음파 검사","피부 재진","눈 검사","귀 청소","치과 스케일링"];
const MESSAGE_TYPES: MessageType[] = ["vaccination", "pre-surgery", "post-surgery", "revisit"];
const STATUSES: SendStatus[] = ["pending", "sent"];

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function makePhone(rand: () => number): string {
  const prefix = pick(PHONE_PREFIXES, rand);
  const suffix = String(Math.floor(rand() * 9000) + 1000);
  return `${prefix}-${suffix}`;
}

function generatePatients(): MockPatient[] {
  const rand = seededRand(42);
  const patients: MockPatient[] = [];

  // Keep original 10 for continuity
  const originals: MockPatient[] = [
    { id: "1", ownerName: "이서연", ownerPhone: "010-9876-5432", petName: "보리", breed: "푸들", age: "4", messageType: "post-surgery", dDay: 0, status: "pending", surgeryType: "왼쪽 무릎 슬개골 탈구 교정술", medications: "진통제, 항생제", nextVisit: daysFromNow(7) },
    { id: "2", ownerName: "김민준", ownerPhone: "010-1234-5678", petName: "가나디", breed: "말티즈", age: "3", messageType: "vaccination", dDay: 7, status: "pending", vaccineType: "종합백신 (DHPPL)", vaccineDate: daysFromNow(7), reminderDays: "7" },
    { id: "3", ownerName: "박지훈", ownerPhone: "010-1111-2222", petName: "두부", breed: "멕시코기", age: "5", messageType: "revisit", dDay: 5, status: "pending", revisitDate: daysFromNow(5), revisitReason: "재내원 안내" },
    { id: "4", ownerName: "최수아", ownerPhone: "010-3333-4444", petName: "초코", breed: "시츄", age: "7", messageType: "revisit", dDay: 3, status: "pending", revisitDate: daysFromNow(3), revisitReason: "실밥 제거" },
    { id: "5", ownerName: "정하은", ownerPhone: "010-5555-6666", petName: "루나", breed: "비숑프리제", age: "4", messageType: "vaccination", dDay: 1, status: "pending", vaccineType: "광견병", vaccineDate: daysFromNow(1), reminderDays: "1" },
    { id: "6", ownerName: "강민서", ownerPhone: "010-7777-8888", petName: "코코", breed: "푸들", age: "6", messageType: "post-surgery", dDay: -1, status: "sent", surgeryType: "발치", medications: "진통제, 항생제", nextVisit: daysFromNow(-1) },
    { id: "7", ownerName: "윤지우", ownerPhone: "010-2222-3333", petName: "망고", breed: "웰시코기", age: "1", messageType: "revisit", dDay: 7, status: "sent", revisitDate: daysFromNow(7), revisitReason: "종합 검진" },
    { id: "8", ownerName: "임채원", ownerPhone: "010-4444-5555", petName: "별이", breed: "진돗개", age: "8", messageType: "pre-surgery", dDay: 0, status: "pending", surgeryType: "종양 제거", nextVisit: daysFromNow(0) },
    { id: "9", ownerName: "송유진", ownerPhone: "010-6666-7777", petName: "해피", breed: "골든리트리버", age: "9", messageType: "revisit", dDay: -45, status: "pending", revisitDate: daysFromNow(-45), revisitReason: "정기 검진", atRisk: true },
    { id: "10", ownerName: "한지수", ownerPhone: "010-8888-9999", petName: "뭉치", breed: "말티즈", age: "11", messageType: "revisit", dDay: -60, status: "pending", revisitDate: daysFromNow(-60), revisitReason: "심장 검사 추적", atRisk: true },
  ];
  patients.push(...originals);

  // Generate 101 more (total 111)
  for (let i = 11; i <= 111; i++) {
    const messageType = pick(MESSAGE_TYPES, rand);
    const dDay = Math.floor(rand() * 30) - 10;
    const status: SendStatus = rand() > 0.45 ? "sent" : "pending";
    const atRisk = dDay < -30 && rand() > 0.6;
    const age = String(Math.floor(rand() * 13) + 1);
    const ownerIdx = Math.floor(rand() * OWNER_NAMES.length);
    const petIdx = Math.floor(rand() * PET_NAMES.length);
    const breedIdx = Math.floor(rand() * BREEDS.length);

    const base: MockPatient = {
      id: String(i),
      ownerName: OWNER_NAMES[ownerIdx],
      ownerPhone: makePhone(rand),
      petName: PET_NAMES[petIdx],
      breed: BREEDS[breedIdx],
      age,
      messageType,
      dDay,
      status,
      atRisk: atRisk || undefined,
    };

    if (messageType === "vaccination") {
      base.vaccineType = pick(VACCINE_TYPES, rand);
      base.vaccineDate = daysFromNow(dDay);
      base.reminderDays = pick(["1", "3", "7"], rand);
    } else if (messageType === "pre-surgery") {
      base.surgeryType = pick(SURGERY_TYPES, rand);
      base.nextVisit = daysFromNow(dDay);
    } else if (messageType === "post-surgery") {
      base.surgeryType = pick(SURGERY_TYPES, rand);
      base.medications = pick(MEDICATIONS, rand);
      base.nextVisit = daysFromNow(dDay + 7);
    } else if (messageType === "revisit") {
      base.revisitDate = daysFromNow(dDay);
      base.revisitReason = pick(REVISIT_REASONS, rand);
    }

    patients.push(base);
  }

  // 방문 이력(최초/최근 방문일) — id 기반 시드로 결정적 생성
  for (const p of patients) {
    const seed = (parseInt(p.id, 10) * 2654435761) % 2147483647;
    const r = seededRand(seed || 1);
    const lastAgo = p.atRisk ? (Math.abs(p.dDay) || 90) : Math.floor(r() * 110) + 5;
    const firstAgo = lastAgo + Math.floor(r() * 1280) + 200;
    p.lastVisit = daysFromNow(-lastAgo);
    p.firstVisit = daysFromNow(-firstAgo);
  }

  return patients;
}

export const MOCK_PATIENTS: MockPatient[] = generatePatients();
