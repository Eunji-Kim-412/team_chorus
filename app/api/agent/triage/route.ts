import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

type Urgency = "emergency" | "caution" | "routine";

interface TriageResult {
  urgency: Urgency;
  category: string;
  redFlags: string[];
  reasoning: string;
  recommendedAction: string;
  draftReply: string;
  escalate: boolean;
  fallback?: boolean;
}

interface PatientContext {
  petName?: string;
  breed?: string;
  age?: string;
  messageType?: string;
  surgeryType?: string;
  medications?: string;
}

// 응급/주의 신호 키워드 — AI 미사용(키 없음/할당량) 시 폴백 분류에 사용
const EMERGENCY_KEYWORDS = [
  "경련", "발작", "호흡", "숨", "피", "출혈", "쓰러", "의식", "축 늘어",
  "청색", "파랗", "보라색", "계속 토", "멈추지 않", "대량", "쇼크", "움직이지", "기절",
];
const CAUTION_KEYWORDS = [
  "토", "구토", "설사", "열", "붓", "부었", "빨개", "진물", "안 먹", "사료 안",
  "기력", "무기력", "절뚝", "아파", "통증", "상처", "벌어", "긁", "핥",
];

function keywordTriage(reply: string, ctx: PatientContext): TriageResult {
  const pet = ctx.petName ?? "반려동물";
  const hitE = EMERGENCY_KEYWORDS.filter((k) => reply.includes(k));
  const hitC = CAUTION_KEYWORDS.filter((k) => reply.includes(k));

  if (hitE.length) {
    return {
      urgency: "emergency",
      category: "응급 의심",
      redFlags: hitE,
      reasoning: `보호자 메시지에서 응급 신호(${hitE.join(", ")})가 감지되었습니다. 즉시 수의사 확인이 필요합니다.`,
      recommendedAction: "수의사에게 즉시 에스컬레이션 · 보호자에게 내원 안내",
      escalate: true,
      draftReply: `${pet} 보호자님, 말씀하신 증상은 빠른 확인이 필요해 보여요. 가능한 한 빨리 병원으로 연락 주시거나 내원해 주세요. 상태를 바로 살펴드리겠습니다.`,
      fallback: true,
    };
  }
  if (hitC.length) {
    return {
      urgency: "caution",
      category: "주의 관찰",
      redFlags: hitC,
      reasoning: `경증으로 보이는 증상(${hitC.join(", ")})이 언급되었습니다. 경과 관찰을 안내하고, 악화 시 내원하도록 가이드합니다.`,
      recommendedAction: "안내 초안 검토 후 발송 · 악화 시 내원 조건 포함",
      escalate: false,
      draftReply: `${pet} 보호자님, 안내드린 주의사항을 잘 지켜주고 계신지 확인 부탁드려요. 증상이 더 심해지거나 24시간 이상 지속되면 병원으로 연락 주세요. 경과를 함께 지켜보겠습니다 🐾`,
      fallback: true,
    };
  }
  return {
    urgency: "routine",
    category: "일반 문의",
    redFlags: [],
    reasoning: "응급/주의 신호가 감지되지 않은 일반 문의입니다.",
    recommendedAction: "안내 초안 검토 후 발송",
    escalate: false,
    draftReply: `${pet} 보호자님, 문의 주셔서 감사합니다. 말씀하신 내용 확인했어요. 추가로 궁금한 점 있으시면 언제든 병원으로 연락 주세요 🐾`,
    fallback: true,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reply: string = body.replyText ?? "";
  const ctx: PatientContext = body.patientContext ?? {};

  if (!reply.trim()) {
    return NextResponse.json({ error: "보호자 메시지를 입력해 주세요." }, { status: 400 });
  }

  try {
    const provider = getAIProvider();
    const system = `당신은 한국 동물병원의 "보호자 답장 대응" AI 에이전트입니다.
보호자가 보낸 답장을 분석해 응급도를 판단하고, 다음 행동을 결정합니다.

매우 중요한 안전 규칙:
- 당신은 의학적 확정 진단을 내리지 않습니다. 응급도 분류와 안내 초안만 작성합니다.
- 응급 신호(경련, 호흡곤란, 다량 출혈, 의식 저하, 멈추지 않는 구토 등)가 보이면 반드시 urgency를 "emergency", escalate를 true로 설정하고, 보호자에게 즉시 내원/연락을 안내하세요.
- 애매하거나 의학적 판단이 필요한 경우 수의사에게 에스컬레이션하세요(escalate=true).
- draftReply는 한국어 SMS 형식, 200자 이내, 따뜻하고 명확하게. 진단·처방 단정 금지.

반드시 아래 JSON 형식으로만 응답하세요:
{"urgency":"emergency|caution|routine","category":"짧은 분류명","redFlags":["감지된 신호"],"reasoning":"판단 근거 1~2문장","recommendedAction":"권장 다음 행동","escalate":true,"draftReply":"보호자에게 보낼 안내 초안"}`;

    const user = `환자 정보:
- 이름: ${ctx.petName ?? "-"} (${ctx.breed ?? "-"}, ${ctx.age ?? "-"}세)
- 최근 안내 유형: ${ctx.messageType ?? "-"}
- 수술/처치: ${ctx.surgeryType ?? "-"}
- 처방약: ${ctx.medications ?? "-"}

보호자가 보낸 답장:
"""${reply}"""

위 답장을 분석해 JSON으로만 응답하세요.`;

    const raw = await provider.generate(system, user);
    const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI 응답 파싱 실패");
    const parsed = JSON.parse(m[0]) as TriageResult;

    // 안전 보정: 값 검증 + 응급이면 무조건 에스컬레이션
    if (!["emergency", "caution", "routine"].includes(parsed.urgency)) parsed.urgency = "caution";
    parsed.redFlags = Array.isArray(parsed.redFlags) ? parsed.redFlags : [];
    parsed.escalate = parsed.urgency === "emergency" ? true : !!parsed.escalate;
    parsed.category = parsed.category ?? "분류";
    parsed.reasoning = parsed.reasoning ?? "";
    parsed.recommendedAction = parsed.recommendedAction ?? "";
    parsed.draftReply = parsed.draftReply ?? "";
    return NextResponse.json(parsed);
  } catch {
    // API 키 없음/할당량 초과/파싱 실패 → 키워드 기반 폴백(데모 항상 동작)
    return NextResponse.json(keywordTriage(reply, ctx));
  }
}
