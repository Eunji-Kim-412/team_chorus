import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { getSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { translateTerm, translatePetName } from "@/lib/i18n";
import type { PatientInfo, Language, Tone, MessageType } from "@/lib/ai/types";

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests") || msg.includes("RESOURCE_EXHAUSTED");
}

// API 키 미설정 등 provider 사용 불가 상황 → 로컬 데모용 폴백으로 처리
function isProviderUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return isQuotaError(err) || msg.includes("is not set") || msg.includes("API_KEY") || msg.includes("API key");
}

function buildFallbackMessage(body: PatientInfo): string {
  const lang: Language = body.language ?? "ko";
  const pet = body.patientName
    ? translatePetName(body.patientName, lang)
    : lang === "ko" ? "반려동물" : lang === "zh" ? "宠物" : lang === "fr" ? "votre animal" : "your pet";
  const breed = translateTerm(body.breed, lang) || "";
  const age = body.age ?? "";
  const ageUnit = lang === "ko" ? "세" : lang === "zh" ? "岁" : lang === "fr" ? " ans" : " yrs";
  const sep = lang === "ko" || lang === "zh" ? "·" : " · ";
  const info = breed && age ? `(${breed}${sep}${age}${ageUnit})` : "";

  const vaccine = translateTerm(body.vaccineType, lang) || "";
  const vDate = body.vaccineDate ?? "";
  const surgery = translateTerm(body.surgeryType, lang) || "";
  const rDate = body.revisitDate ?? "";
  const rReason = translateTerm(body.revisitReason, lang) || "";

  const TPL: Record<Language, Record<MessageType, string>> = {
    ko: {
      "post-surgery": `안녕하세요, 우리동물병원입니다. 🐾\n${pet}${info} 수술이 잘 끝났어요.\n\n수술 후 주의사항을 꼭 지켜주세요.\n· 봉합 부위 14일간 보호\n· 처방약 하루 2회 식후 급여\n· 다음 내원일에 꼭 방문해 주세요\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`,
      vaccination: `안녕하세요, 우리동물병원입니다. 💉\n${pet}${info} 예방접종 안내드려요.\n\n· 접종 종류: ${vaccine || "예방접종"}\n· 예정일: ${vDate || "확인 요망"}\n\n당일 컨디션이 좋지 않으면 미리 연락 주세요.\n우리동물병원 드림`,
      "pre-surgery": `안녕하세요, 우리동물병원입니다. 🏥\n${pet}${info} 수술 전 안내드려요.\n\n· 수술: ${surgery || "예정 수술"}\n\n[주의사항]\n· 수술 12시간 전부터 금식\n· 물은 6시간 전까지 가능\n· 당일 목욕 금지\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`,
      revisit: `안녕하세요, 우리동물병원입니다. 📅\n${pet}${info} 재내원 안내드려요.\n\n· 방문 예정일: ${rDate || "확인 요망"}\n· 방문 사유: ${rReason || "정기 검진"}\n\n변경이 필요하시면 미리 연락 주세요.\n우리동물병원 드림`,
    },
    en: {
      "post-surgery": `Hello, this is Woori Animal Hospital. 🐾\n${pet}${info} came through surgery well.\n\nPlease follow these post-op instructions:\n· Protect the incision for 14 days\n· Give medication twice daily, after meals\n· Be sure to come in on the next visit date\n\nContact us with any questions.\n— Woori Animal Hospital`,
      vaccination: `Hello, this is Woori Animal Hospital. 💉\nA vaccination reminder for ${pet}${info}.\n\n· Vaccine: ${vaccine || "vaccination"}\n· Scheduled: ${vDate || "to be confirmed"}\n\nIf your pet isn't feeling well that day, please let us know in advance.\n— Woori Animal Hospital`,
      "pre-surgery": `Hello, this is Woori Animal Hospital. 🏥\nPre-op guidance for ${pet}${info}.\n\n· Surgery: ${surgery || "scheduled procedure"}\n\n[Precautions]\n· No food from 12 hours before surgery\n· Water is OK up to 6 hours before\n· No bathing on the day\n\nContact us with any questions.\n— Woori Animal Hospital`,
      revisit: `Hello, this is Woori Animal Hospital. 📅\nA revisit reminder for ${pet}${info}.\n\n· Scheduled: ${rDate || "to be confirmed"}\n· Reason: ${rReason || "routine checkup"}\n\nLet us know in advance if you need to reschedule.\n— Woori Animal Hospital`,
    },
    zh: {
      "post-surgery": `您好，这里是Woori动物医院。🐾\n${pet}${info} 的手术已顺利完成。\n\n请务必遵守术后注意事项：\n· 缝合处保护14天\n· 处方药每日2次，餐后服用\n· 请按下次就诊日前来\n\n如有疑问，请联系医院。\nWoori动物医院 敬上`,
      vaccination: `您好，这里是Woori动物医院。💉\n为${pet}${info} 提供疫苗接种提醒。\n\n· 接种种类：${vaccine || "疫苗接种"}\n· 预定日期：${vDate || "待确认"}\n\n当天若状态不佳，请提前联系我们。\nWoori动物医院 敬上`,
      "pre-surgery": `您好，这里是Woori动物医院。🏥\n为${pet}${info} 提供术前须知。\n\n· 手术：${surgery || "预定手术"}\n\n【注意事项】\n· 手术前12小时开始禁食\n· 饮水可至术前6小时\n· 当天请勿洗澡\n\n如有疑问，请联系医院。\nWoori动物医院 敬上`,
      revisit: `您好，这里是Woori动物医院。📅\n为${pet}${info} 提供复诊提醒。\n\n· 预定日期：${rDate || "待确认"}\n· 就诊原因：${rReason || "定期检查"}\n\n如需更改，请提前联系我们。\nWoori动物医院 敬上`,
    },
    fr: {
      "post-surgery": `Bonjour, ici la Clinique Vétérinaire Woori. 🐾\n${pet}${info} s'est bien remis(e) de l'opération.\n\nMerci de respecter ces consignes post-opératoires :\n· Protéger la suture pendant 14 jours\n· Donner les médicaments 2 fois par jour, après les repas\n· Venir impérativement à la prochaine visite\n\nContactez-nous pour toute question.\n— Clinique Vétérinaire Woori`,
      vaccination: `Bonjour, ici la Clinique Vétérinaire Woori. 💉\nRappel de vaccination pour ${pet}${info}.\n\n· Vaccin : ${vaccine || "vaccination"}\n· Date prévue : ${vDate || "à confirmer"}\n\nSi votre animal ne se sent pas bien ce jour-là, prévenez-nous à l'avance.\n— Clinique Vétérinaire Woori`,
      "pre-surgery": `Bonjour, ici la Clinique Vétérinaire Woori. 🏥\nConsignes pré-opératoires pour ${pet}${info}.\n\n· Chirurgie : ${surgery || "intervention prévue"}\n\n[Précautions]\n· À jeun 12 h avant la chirurgie\n· Eau autorisée jusqu'à 6 h avant\n· Pas de bain le jour même\n\nContactez-nous pour toute question.\n— Clinique Vétérinaire Woori`,
      revisit: `Bonjour, ici la Clinique Vétérinaire Woori. 📅\nRappel de visite pour ${pet}${info}.\n\n· Date prévue : ${rDate || "à confirmer"}\n· Motif : ${rReason || "contrôle de routine"}\n\nPrévenez-nous à l'avance en cas de changement.\n— Clinique Vétérinaire Woori`,
    },
  };

  return TPL[lang]?.[body.messageType] ?? TPL[lang]?.["revisit"] ?? TPL.ko[body.messageType];
}

export async function POST(req: NextRequest) {
  try {
    const body: PatientInfo = await req.json();

    if (!body.patientName || !body.breed || !body.age || !body.messageType) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const language: Language = body.language ?? "ko";
    const tone: Tone = body.tone ?? "friendly";
    const systemPrompt = getSystemPrompt(language, tone, body.customTone);

    // provider 생성 실패(키 미설정 등) → 데모용 템플릿 폴백
    let provider;
    try {
      provider = getAIProvider();
    } catch (err) {
      if (isProviderUnavailable(err)) {
        if (body.messageType === "vaccination" && body.reminderDaysList && body.reminderDaysList.length > 1) {
          const messages = body.reminderDaysList.map((days) => ({
            days,
            message: buildFallbackMessage({ ...body, reminderDays: days }),
          }));
          return NextResponse.json({ messages, fallback: true });
        }
        return NextResponse.json({ message: buildFallbackMessage(body), fallback: true });
      }
      throw err;
    }

    if (body.messageType === "vaccination" && body.reminderDaysList && body.reminderDaysList.length > 1) {
      try {
        const results = await Promise.all(
          body.reminderDaysList.map(async (days) => {
            const prompt = buildUserPrompt({ ...body, reminderDays: days });
            const message = await provider.generate(systemPrompt, prompt);
            return { days, message };
          })
        );
        return NextResponse.json({ messages: results });
      } catch (err) {
        if (isProviderUnavailable(err)) {
          const messages = body.reminderDaysList.map((days) => ({
            days,
            message: buildFallbackMessage({ ...body, reminderDays: days }),
          }));
          return NextResponse.json({ messages, fallback: true });
        }
        throw err;
      }
    }

    const reminderDays = body.reminderDaysList?.[0] ?? body.reminderDays;
    const userPrompt = buildUserPrompt({ ...body, reminderDays });

    try {
      const result = await provider.generate(systemPrompt, userPrompt);
      return NextResponse.json({ message: result });
    } catch (err) {
      if (isProviderUnavailable(err)) {
        const message = buildFallbackMessage(body);
        return NextResponse.json({ message, fallback: true });
      }
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", msg);
    return NextResponse.json({ error: "안내문 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
