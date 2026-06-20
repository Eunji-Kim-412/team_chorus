import type { MessageLog } from "./store";

export type Direction = "out" | "in";
export type InboundUrgency = "emergency" | "caution" | "routine";

export interface ConversationTurn {
  id: string;
  direction: Direction;
  at: string; // ISO datetime
  text: string;
  messageType?: string;
  urgency?: InboundUrgency; // 수신(보호자 메시지)에만 부여
}

// 보호자가 보낼 법한 답장 — 발송 유형별로 합성. urgency는 '보호자 답장 대응' 분류와 연계.
const GUARDIAN_REPLIES: Record<string, { text: string; urgency: InboundUrgency }[]> = {
  vaccination: [
    { text: "접종하고 나서 좀 축 처져 있는데 괜찮을까요?", urgency: "caution" },
    { text: "다음 접종은 언제쯤 방문하면 되나요?", urgency: "routine" },
    { text: "네, 잊지 않고 그날 방문할게요. 감사합니다 🐾", urgency: "routine" },
  ],
  "pre-surgery": [
    { text: "금식은 몇 시간 전부터 시키면 되나요?", urgency: "routine" },
    { text: "복용 중인 심장약이 있는데 수술 전에 먹여도 되나요?", urgency: "caution" },
    { text: "당일 몇 시까지 도착하면 될까요?", urgency: "routine" },
  ],
  "post-surgery": [
    { text: "실밥은 언제 풀러 가면 되나요?", urgency: "routine" },
    { text: "수술한 다리 부위가 살짝 빨갛게 붓고 진물도 조금 나요.", urgency: "caution" },
    { text: "약 먹이고 나서 계속 토하고 축 늘어져 있어요. 숨도 가빠요 ㅠㅠ", urgency: "emergency" },
    { text: "잘 회복하고 있는 것 같아요. 신경 써주셔서 감사합니다!", urgency: "routine" },
  ],
  revisit: [
    { text: "이번 주 토요일 오전에 방문 가능할까요?", urgency: "routine" },
    { text: "예약을 다음 주로 변경하고 싶어요.", urgency: "routine" },
    { text: "재검사 꼭 받아야 하나요? 요즘은 멀쩡해 보여서요.", urgency: "routine" },
  ],
};

// 보호자 답장에 대한 병원(에이전트 초안) 후속 응답
const CLINIC_FOLLOWUPS: Record<InboundUrgency, string> = {
  routine:
    "{name} 보호자님, 확인했습니다. 안내드린 일정대로 진행하시면 되고, 추가로 궁금한 점 있으시면 언제든 연락 주세요 🐾",
  caution:
    "{name} 보호자님, 말씀하신 증상은 경과를 함께 지켜보면 좋겠어요. 더 심해지거나 24시간 이상 지속되면 바로 내원 부탁드려요.",
  emergency:
    "{name} 보호자님, 지금 증상은 빠른 확인이 필요해 보여요. 가능한 한 빨리 병원으로 연락 주시거나 내원해 주세요. 바로 살펴드리겠습니다.",
};

function seeded(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

const HOUR = 3600 * 1000;

/**
 * 발송 이력을 기반으로 보호자 수신 메시지 + 병원 후속 응답을 결정적으로 합성한다.
 * 같은 환자/발송이력이면 항상 동일한 대화가 생성된다(시드 기반).
 */
export function buildConversation(
  petId: string,
  petName: string,
  sent: MessageLog[]
): ConversationTurn[] {
  const rand = seeded((parseInt(petId, 10) || 1) * 7919);
  const turns: ConversationTurn[] = [];

  const sortedSent = [...sent].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );

  for (const m of sortedSent) {
    turns.push({
      id: `o-${m.id}`,
      direction: "out",
      at: m.sentAt,
      text: m.preview,
      messageType: m.messageType,
    });

    // 약 75% 확률로 보호자 답장 발생
    if (rand() < 0.75) {
      const pool = GUARDIAN_REPLIES[m.messageType] ?? GUARDIAN_REPLIES.revisit;
      const reply = pick(pool, rand);
      const replyAt = new Date(
        new Date(m.sentAt).getTime() + (2 + Math.floor(rand() * 30)) * HOUR
      ).toISOString();
      turns.push({
        id: `i-${m.id}`,
        direction: "in",
        at: replyAt,
        text: reply.text,
        urgency: reply.urgency,
      });

      // 주의/응급이면 항상, 일반이면 일부 확률로 병원 후속 응답
      if (reply.urgency !== "routine" || rand() < 0.4) {
        const fu = CLINIC_FOLLOWUPS[reply.urgency].replace(/\{name\}/g, petName);
        const fuAt = new Date(
          new Date(replyAt).getTime() + (1 + Math.floor(rand() * 5)) * HOUR
        ).toISOString();
        turns.push({ id: `f-${m.id}`, direction: "out", at: fuAt, text: fu });
      }
    }
  }

  return turns.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** 대화에서 보호자 수신 메시지만 추출(최신순) */
export function inboundFrom(turns: ConversationTurn[]): ConversationTurn[] {
  return turns
    .filter((t) => t.direction === "in")
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
