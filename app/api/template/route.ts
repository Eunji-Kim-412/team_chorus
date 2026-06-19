import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  vaccination: "예방접종 리마인드",
  "pre-surgery": "수술 전 안내",
  "post-surgery": "수술 후 케어",
  revisit: "재내원 안내",
  reservation: "예약 안내",
};

const FALLBACK: Record<string, string> = {
  vaccination: `안녕하세요, 우리동물병원입니다. 💉\n[반려동물명] 예방접종 예정일이 다가왔어요.\n\n· 접종 종류: [백신명]\n· 예정일: [날짜]\n\n당일 컨디션이 좋지 않으면 미리 연락 주세요.`,
  "pre-surgery": `안녕하세요, 우리동물병원입니다. 🏥\n[반려동물명] 수술 전 안내드려요.\n\n[수술 전 주의사항]\n· 수술 12시간 전부터 금식\n· 물은 6시간 전까지 가능\n· 당일 목욕 금지\n\n궁금하신 점은 병원으로 연락 주세요.`,
  "post-surgery": `안녕하세요, 우리동물병원입니다. 🐾\n[반려동물명] 수술이 잘 끝났어요.\n\n[집에서 꼭 지켜주세요]\n· 봉합 부위 [일수]일간 보호\n· 처방약 하루 [횟수]회 식후 급여\n· 부위가 붓거나 진물이 나면 즉시 연락\n· 다음 내원: [날짜]`,
  revisit: `안녕하세요, 우리동물병원입니다. 📅\n[반려동물명] 재내원 안내드려요.\n\n· 방문 사유: [사유]\n· 방문 예정일: [날짜]\n\n변경이 필요하시면 미리 연락 주세요.`,
  reservation: `안녕하세요, 우리동물병원입니다. 🗓️\n[반려동물명] 예약 안내드려요.\n\n· 예약 항목: [항목]\n· 예약 일시: [날짜] [시간]\n\n예약 변경이 필요하시면 미리 연락 주세요.`,
};

// 제목/설명에서 핵심 주제어 추출 (예: "미용 예약 안내" → "미용")
function deriveSubject(title: string, desc: string): string {
  const raw = `${title} ${desc}`.trim();
  const cleaned = (title || raw)
    .replace(/(예약|안내|리마인드|케어|메시지|알림|템플릿|발송|문자)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

// 주제어별 추가 안내 한 줄 (미용/스케일링/검진 등)
const SUBJECT_HINTS: { kw: string[]; note: string }[] = [
  { kw: ["미용", "목욕", "스파", "그루밍"], note: "· 미용 전 예방접종 여부와 피부 상태를 확인해 주세요." },
  { kw: ["스케일링", "치과", "스케일"], note: "· 스케일링은 마취가 필요해 [시간]시간 금식이 필요해요." },
  { kw: ["검진", "건강검진", "종합검진"], note: "· 정확한 검진을 위해 [시간]시간 금식 후 방문해 주세요." },
  { kw: ["초음파", "엑스레이", "방사선", "ct", "mri"], note: "· 검사 준비를 위해 내원 시간에 맞춰 방문 부탁드려요." },
];

function buildFallback(type: string, title: string, desc: string): string {
  const subject = deriveSubject(title, desc);
  // 예약(또는 일반) 유형은 주제어를 반영해 맞춤 생성
  if (type === "reservation" || !FALLBACK[type]) {
    const subjLabel = subject ? `${subject} ` : "";
    const item = subject || "[항목]";
    const hint = SUBJECT_HINTS.find((h) => h.kw.some((k) => `${title} ${desc}`.toLowerCase().includes(k)));
    const hintLine = hint ? `\n${hint.note}` : "";
    return `안녕하세요, 우리동물병원입니다. 🗓️\n[반려동물명] ${subjLabel}예약 안내드려요.\n\n· 예약 항목: ${item}\n· 예약 일시: [날짜] [시간]${hintLine}\n\n예약 변경이 필요하시면 미리 연락 주세요.`;
  }
  return FALLBACK[type];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type: string = body.type ?? "vaccination";
  const title: string = body.title ?? "";
  const desc: string = body.desc ?? "";

  try {
    const provider = getAIProvider();
    const system = `당신은 한국 동물병원의 보호자 안내 SMS 템플릿을 작성하는 AI입니다.
특정 환자가 아닌 '재사용 가능한 템플릿'을 작성하세요.
규칙:
- 환자별로 달라지는 값은 대괄호 변수로 표기: [반려동물명], [날짜], [시간], [백신명], [사유], [항목] 등
- 한국어, SMS 형식(줄바꿈 사용), 500자 이내
- 의학용어는 최소화하고 따뜻하고 명확하게
- 인사 → 핵심 안내 → 마무리(연락 안내) 구조
- 템플릿 본문만 출력하세요. 설명이나 따옴표 없이.`;
    const user = `템플릿 유형: ${TYPE_LABEL[type] ?? type}
${title ? `템플릿 이름: ${title}` : ""}
${desc ? `설명/요청사항: ${desc}` : ""}

위 조건에 맞는 SMS 안내 템플릿 본문을 작성하세요.`;
    const raw = await provider.generate(system, user);
    const content = raw.trim();
    if (content) return NextResponse.json({ content });
    throw new Error("empty");
  } catch {
    return NextResponse.json({ content: buildFallback(type, title, desc), fallback: true });
  }
}
