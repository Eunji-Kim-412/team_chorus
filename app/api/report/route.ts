import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface ReportSection { icon: string; title: string; body: string }
interface ReportData {
  petName: string;
  ownerName?: string;
  firstVisit?: string;
  lastVisit?: string;
  headline: string;
  sections: ReportSection[];
  reminders: string[];
  disclaimer: string;
  fallback?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  vaccination: "예방접종", "pre-surgery": "수술 전 준비", "post-surgery": "수술 후 회복", revisit: "재내원",
};

const DISCLAIMER = "본 레포트는 진료 기록을 바탕으로 AI가 자동 요약한 보호자용 안내입니다. 의학적 진단이 아니며, 정확한 상태는 담당 수의사와 상담해 주세요.";

function buildFallbackReport(p: any): ReportData {
  const name = p.petName ?? "반려동물";
  const info = `${p.breed ?? "-"} · ${p.age ?? "-"}세`;
  const typeLabel = TYPE_LABEL[p.messageType] ?? "정기 관리";
  const sections: ReportSection[] = [
    { icon: "🐾", title: "기본 정보", body: `${name} (${info})\n보호자: ${p.ownerName ?? "-"}\n최초 방문: ${p.firstVisit ?? "-"} · 최근 방문: ${p.lastVisit ?? "-"}\n최근 케어 단계: ${typeLabel}` },
  ];
  const reminders: string[] = [];

  if (p.messageType === "post-surgery") {
    sections.push({ icon: "🏥", title: "최근 진료 요약", body: `최근 '${p.surgeryType ?? "수술"}'을(를) 받았습니다. 현재는 회복 관리 단계입니다.` });
    sections.push({ icon: "💊", title: "현재 관리 포인트", body: `${p.medications ? `처방약: ${p.medications}\n` : ""}봉합 부위 보호, 처방약 용법 준수, 무리한 활동 제한이 중요합니다. 부위가 붓거나 진물·출혈이 있으면 즉시 병원에 연락하세요.` });
    if (p.nextVisit) reminders.push(`다음 내원 예정: ${p.nextVisit}`);
  } else if (p.messageType === "pre-surgery") {
    sections.push({ icon: "🏥", title: "예정 수술", body: `'${p.surgeryType ?? "수술"}'이 예정되어 있습니다.` });
    sections.push({ icon: "📋", title: "수술 전 준비", body: `수술 전 금식(보통 8~12시간), 복용 중인 약 알리기, 당일 컨디션 체크가 필요합니다.` });
    if (p.nextVisit) reminders.push(`수술 예정일: ${p.nextVisit}`);
  } else if (p.messageType === "vaccination") {
    sections.push({ icon: "💉", title: "예방접종 안내", body: `'${p.vaccineType ?? "예방접종"}'이 예정되어 있습니다. 접종 전후 컨디션 관찰이 필요합니다.` });
    if (p.vaccineDate) reminders.push(`접종 예정일: ${p.vaccineDate}`);
  } else {
    sections.push({ icon: "📅", title: "재내원 안내", body: `'${p.revisitReason ?? "정기 검진"}'을(를) 위한 재내원이 권장됩니다.` });
    if (p.revisitDate) reminders.push(`방문 예정일: ${p.revisitDate}`);
  }

  // 나이 기반 생활 관리 팁
  const age = parseInt(p.age ?? "0", 10);
  const lifeTip = age >= 8
    ? "노령기에 접어든 만큼 6개월마다 정기 건강검진과 체중·치아 관리를 권장합니다."
    : age <= 1
    ? "성장기에는 예방접종 일정 준수와 균형 잡힌 식이가 중요합니다."
    : "정기 예방접종과 연 1회 건강검진으로 컨디션을 꾸준히 관리해 주세요.";
  sections.push({ icon: "🌿", title: "생활 관리 팁", body: lifeTip });

  if (p.atRisk) reminders.push("최근 내원이 지연되었습니다. 정기 검진 시기를 다시 잡아 주세요.");

  return {
    petName: name,
    ownerName: p.ownerName,
    firstVisit: p.firstVisit,
    lastVisit: p.lastVisit,
    headline: `${name}의 건강 요약 레포트`,
    sections,
    reminders,
    disclaimer: DISCLAIMER,
    fallback: true,
  };
}

export async function POST(req: NextRequest) {
  const p = await req.json();
  if (!p?.petName) {
    return NextResponse.json({ error: "환자 정보가 필요합니다." }, { status: 400 });
  }

  try {
    const provider = getAIProvider();
    const system = `당신은 동물병원의 보호자용 건강 레포트를 작성하는 AI입니다.
환자의 진료 데이터를 바탕으로, 보호자가 이해하기 쉬운 건강 요약 레포트를 한국어로 작성합니다.

규칙:
- 의학적 확정 진단을 하지 마세요. 기록 기반 요약과 일반적 관리 안내만 작성합니다.
- 의학용어는 최소화하고 따뜻하고 명확하게.
- 근거 없는 내용(할루시네이션)을 만들지 마세요. 주어진 데이터에 기반하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{"headline":"제목","sections":[{"icon":"이모지","title":"섹션 제목","body":"내용(2~4문장)"}],"reminders":["챙겨야 할 일정/할 일"]}`;
    const user = `환자 진료 데이터:
- 이름: ${p.petName}
- 보호자: ${p.ownerName ?? "-"}
- 품종/나이: ${p.breed ?? "-"}, ${p.age ?? "-"}세
- 최초 방문일: ${p.firstVisit ?? "-"}
- 최근 방문일: ${p.lastVisit ?? "-"}
- 최근 케어 유형: ${TYPE_LABEL[p.messageType] ?? p.messageType ?? "-"}
- 수술/처치: ${p.surgeryType ?? "-"}
- 처방약: ${p.medications ?? "-"}
- 예방접종: ${p.vaccineType ?? "-"} ${p.vaccineDate ?? ""}
- 재내원: ${p.revisitReason ?? "-"} ${p.revisitDate ?? ""}
- 다음 내원 예정: ${p.nextVisit ?? "-"}
- 이탈 위험(장기 미내원): ${p.atRisk ? "예" : "아니오"}

위 데이터로 보호자용 건강 요약 레포트를 JSON으로 작성하세요.`;

    const raw = await provider.generate(system, user);
    const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("파싱 실패");
    const parsed = JSON.parse(m[0]);
    const report: ReportData = {
      petName: p.petName,
      ownerName: p.ownerName,
      firstVisit: p.firstVisit,
      lastVisit: p.lastVisit,
      headline: parsed.headline ?? `${p.petName}의 건강 요약 레포트`,
      sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : buildFallbackReport(p).sections,
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      disclaimer: DISCLAIMER,
      fallback: false,
    };
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(buildFallbackReport(p));
  }
}
