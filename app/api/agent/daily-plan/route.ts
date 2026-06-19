import { NextResponse } from "next/server";
import { getPatients } from "@/lib/store";
import { getAIProvider } from "@/lib/ai";
import type { MockPatient } from "@/lib/mockData";

export const dynamic = "force-dynamic";

type Priority = "emergency" | "high" | "normal";

interface PlanItem {
  priority: Priority;
  reason: string;
  patient: MockPatient;
}

const TYPE_LABEL: Record<string, string> = {
  vaccination: "예방접종",
  "pre-surgery": "수술 전",
  "post-surgery": "수술 후",
  revisit: "재내원",
};

// ── 에이전트 판단(decide): 환자 상태를 인지해 오늘 보낼지/우선순위를 결정 ──
function decide(p: MockPatient): { priority: Priority; reason: string } | null {
  // 발송 대기 중인 환자만 행동 대상
  if (p.status !== "pending") return null;
  const label = TYPE_LABEL[p.messageType] ?? "안내";

  // 이탈 위험 단골 → 재연결 최우선
  if (p.atRisk) {
    return {
      priority: "high",
      reason: `마지막 내원 후 ${Math.abs(p.dDay)}일 경과 · 이탈 위험 단골 — 재연결 케어 메시지 권장`,
    };
  }
  // 수술 전 당일/임박 → 금식·준비 안내가 지연되면 안 됨
  if (p.messageType === "pre-surgery" && p.dDay <= 1) {
    return {
      priority: "emergency",
      reason: `수술 ${p.dDay <= 0 ? "당일" : "D-" + p.dDay} — 금식·준비 안내가 늦으면 안 됨`,
    };
  }
  // 수술 직후 케어 시점 → 보호자 불안 최소화
  if (p.messageType === "post-surgery" && p.dDay >= -2 && p.dDay <= 0) {
    return {
      priority: "emergency",
      reason: "수술 직후 케어 시점 — 보호자 불안 최소화를 위해 빠른 안내 필요",
    };
  }
  // 임박 일정(오늘/내일)
  if (p.dDay >= 0 && p.dDay <= 1) {
    return {
      priority: "high",
      reason: `${label} ${p.dDay === 0 ? "오늘" : "내일"} 예정 — 리마인드 발송 적기`,
    };
  }
  // 다가오는 일정(D-2~7)
  if (p.dDay >= 2 && p.dDay <= 7) {
    return { priority: "normal", reason: `${label} D-${p.dDay} — 사전 리마인드 대상` };
  }
  return null;
}

const RANK: Record<Priority, number> = { emergency: 0, high: 1, normal: 2 };

export async function POST() {
  const patients = getPatients();

  // 1) 인지(perceive) + 2) 판단(decide)
  const items: PlanItem[] = [];
  for (const p of patients) {
    const d = decide(p);
    if (d) items.push({ priority: d.priority, reason: d.reason, patient: p });
  }
  items.sort(
    (a, b) => RANK[a.priority] - RANK[b.priority] || a.patient.dDay - b.patient.dDay
  );
  const plan = items.slice(0, 12);

  const stats = {
    total: plan.length,
    emergency: plan.filter((i) => i.priority === "emergency").length,
    high: plan.filter((i) => i.priority === "high").length,
    atRisk: patients.filter((p) => p.atRisk && p.status === "pending").length,
  };

  // 3) 브리핑 생성(narrate) — AI 호출, 실패 시 규칙 기반 폴백
  const fallbackBriefing =
    `오늘 발송 후보 ${stats.total}건을 편성했어요. 긴급 ${stats.emergency}건, 우선 ${stats.high}건이 포함됩니다. ` +
    `이탈 위험 단골 ${stats.atRisk}명도 재연결 대상으로 올렸어요. 검토 후 발송해 주세요.`;
  let briefing = fallbackBriefing;
  let fallback = true;

  try {
    const provider = getAIProvider();
    const system =
      `당신은 한국 동물병원의 케어 코디네이터 AI 에이전트입니다. ` +
      `오늘 보낼 보호자 케어 메시지 후보 데이터를 받아, 수의사에게 보고하는 아침 브리핑을 작성합니다. ` +
      `2~3문장, 친근하고 간결한 한국어. 의료 진단은 하지 말고 우선순위와 이유만 요약하세요.`;
    const summary = plan
      .slice(0, 8)
      .map(
        (i) =>
          `- ${i.patient.petName}(${TYPE_LABEL[i.patient.messageType]}, ${i.priority}): ${i.reason}`
      )
      .join("\n");
    const user =
      `오늘 발송 후보입니다. 긴급 ${stats.emergency}건, 우선 ${stats.high}건, 총 ${stats.total}건, 이탈 위험 ${stats.atRisk}명.\n` +
      `${summary}\n\n수의사에게 보고할 아침 브리핑을 작성하세요.`;
    const text = await provider.generate(system, user);
    if (text && text.trim()) {
      briefing = text.trim();
      fallback = false;
    }
  } catch {
    // API 키 없음/할당량 초과 등 → 규칙 기반 브리핑 유지
  }

  return NextResponse.json({
    date: new Date().toISOString().split("T")[0],
    stats,
    briefing,
    plan,
    fallback,
  });
}
