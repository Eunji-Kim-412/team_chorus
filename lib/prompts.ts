import type { PatientInfo, Language, Tone } from "./ai/types";

const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  ko: "You MUST write the entire SMS message in Korean (한국어) only.",
  en: `CRITICAL LANGUAGE RULE — ENGLISH ONLY:
- Write 100% in English. Not a single Korean character (한글) is allowed.
- Pet names and owner names are proper nouns — keep their spelling but write ALL surrounding text in English.
- Do NOT use Korean greetings like '안녕하세요', '보호자님', '감사합니다'.
- Correct English greeting example: "Hello, [PetName]'s owner!"
- Wrong: "보리 보호자님, 안녕하세요" ← this is forbidden.`,
  zh: `CRITICAL LANGUAGE RULE — SIMPLIFIED CHINESE (简体中文) ONLY:
- Write 100% in Simplified Chinese. Not a single Korean character (한글) is allowed.
- Pet names and owner names are proper nouns — keep their spelling but write ALL surrounding text in Chinese.
- Do NOT use Korean greetings like '안녕하세요', '보호자님', '감사합니다'.
- Correct Chinese greeting example: "[PetName] 的主人您好！"
- Wrong: "보리 보호자님, 안녕하세요" ← this is strictly forbidden.`,
  fr: `CRITICAL LANGUAGE RULE — FRENCH (français) ONLY:
- Write 100% in French. Not a single Korean character (한글) is allowed.
- Pet names and owner names are proper nouns — keep their spelling but write ALL surrounding text in French.
- Do NOT use Korean greetings like '안녕하세요', '보호자님', '감사합니다'.
- Correct French greeting example: "Bonjour, propriétaire de [PetName] !"
- Wrong: "보리 보호자님, 안녕하세요" ← this is strictly forbidden.`,
};

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  friendly: "친절하고 따뜻한 어조로, 이모지를 적절히 사용해서 작성하세요. (예: '안녕하세요 보호자님 🐶 ~해드릴게요~')",
  simple: "이모지 없이 핵심 정보만 간결하게 작성하세요. (예: '[병원명] 가나디 예방접종 예약일: 11/20')",
  custom: "",
};

export function getSystemPrompt(language: Language = "ko", tone: Tone = "friendly", customTone?: string): string {
  const toneInstruction = tone === "custom" && customTone
    ? `다음 말투/스타일로 작성하세요: "${customTone}"`
    : TONE_INSTRUCTIONS[tone];

  return `You are an AI assistant helping veterinarians at a Korean animal hospital.
Write an SMS text message to send to the pet owner.

LANGUAGE RULE (HIGHEST PRIORITY — OVERRIDE EVERYTHING ELSE):
${LANGUAGE_INSTRUCTIONS[language]}

Rules:
- Use simple, easy-to-understand language (minimize medical jargon)
- Format for SMS line breaks
- Keep it under 500 characters
- No unnecessary repeated greetings — focus on key information
- ${toneInstruction}`;
}

const LANG_PREFIX: Record<Language, string> = {
  ko: "⚠️ 전체 SMS를 한국어로만 작성하세요.",
  en: "⚠️ ENGLISH ONLY — No Korean characters at all. Greetings must also be in English (e.g. 'Hello, Bori's owner!').",
  zh: "⚠️ 仅限简体中文 — 不允许任何韩文字符。问候语也必须用中文（例如：'보리 的主人您好！'）。",
  fr: "⚠️ FRANÇAIS UNIQUEMENT — Aucun caractère coréen autorisé. Les salutations doivent aussi être en français (ex. : 'Bonjour, propriétaire de Bori !').",
};

const LANG_SUFFIX: Record<Language, string> = {
  ko: "반드시 한국어로만 작성하세요.",
  en: "FINAL CHECK: Is every single word in English? If not, rewrite. Zero Korean characters allowed.",
  zh: "最终检查：每个字都是中文吗？如果不是，请重写。不允许任何韩文字符。",
  fr: "VÉRIFICATION FINALE : chaque mot est-il en français ? Sinon, réécrivez. Aucun caractère coréen autorisé.",
};

export function buildUserPrompt(info: PatientInfo): string {
  const lang = info.language ?? "ko";
  const prefix = LANG_PREFIX[lang];
  const suffix = LANG_SUFFIX[lang];

  switch (info.messageType) {
    case "post-surgery":
      return `${prefix}

Patient info:
- Pet name: ${info.patientName}
- Breed/Age: ${info.breed}, ${info.age} years old
- Surgery type: ${info.surgeryType}
- Prescribed medications: ${info.medications}
- Next visit date: ${info.nextVisit}

Write a discharge/post-surgery SMS notification for the pet owner.
Must include: medication instructions / precautions / red flags (when to visit immediately) / next visit date.

${suffix}`;

    case "pre-surgery":
      return `${prefix}

Patient info:
- Pet name: ${info.patientName}
- Breed/Age: ${info.breed}, ${info.age} years old
- Surgery type: ${info.surgeryType}
- Surgery date: ${info.nextVisit}

Write a pre-surgery SMS notification for the pet owner.
Must include: fasting duration / items to bring / pre-surgery precautions / how to contact the clinic.

${suffix}`;

    case "vaccination":
      return `${prefix}

Patient info:
- Pet name: ${info.patientName}
- Breed/Age: ${info.breed}, ${info.age} years old
- Vaccine type: ${info.vaccineType}
- Scheduled date: ${info.vaccineDate}
- Reminder timing: D-${info.reminderDays} before appointment

Write a vaccination reminder SMS message for the pet owner.
Must include: appointment date reminder / day-of precautions / contact clinic instruction (do NOT include real phone numbers).

${suffix}`;

    case "revisit":
      return `${prefix}

Patient info:
- Pet name: ${info.patientName}
- Breed/Age: ${info.breed}, ${info.age} years old
- Revisit date: ${info.revisitDate}
- Reason: ${info.revisitReason}

Write a revisit reminder SMS message for the pet owner.
Must include: visit date and reason / preparation if any / contact clinic instruction.

${suffix}`;

    default:
      throw new Error("Unknown message type");
  }
}
