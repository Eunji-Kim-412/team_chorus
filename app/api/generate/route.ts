import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { getSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import type { PatientInfo, Language, Tone } from "@/lib/ai/types";

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
  const pet = body.patientName ?? "반려동물";
  const breed = body.breed ?? "";
  const age = body.age ?? "";
  const info = breed && age ? `(${breed}·${age}세)` : "";

  switch (body.messageType) {
    case "post-surgery":
      return `안녕하세요, 우리동물병원입니다. 🐾\n${pet}${info} 수술이 잘 끝났어요.\n\n수술 후 주의사항을 꼭 지켜주세요.\n· 봉합 부위 14일간 보호\n· 처방약 하루 2회 식후 급여\n· 다음 내원일에 꼭 방문해 주세요\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`;
    case "vaccination":
      return `안녕하세요, 우리동물병원입니다. 💉\n${pet}${info} 예방접종 안내드려요.\n\n· 접종 종류: ${body.vaccineType ?? "예방접종"}\n· 예정일: ${body.vaccineDate ?? "확인 요망"}\n\n당일 컨디션이 좋지 않으면 미리 연락 주세요.\n우리동물병원 드림`;
    case "pre-surgery":
      return `안녕하세요, 우리동물병원입니다. 🏥\n${pet}${info} 수술 전 안내드려요.\n\n· 수술: ${body.surgeryType ?? "예정 수술"}\n\n[주의사항]\n· 수술 12시간 전부터 금식\n· 물은 6시간 전까지 가능\n· 당일 목욕 금지\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`;
    case "revisit":
      return `안녕하세요, 우리동물병원입니다. 📅\n${pet}${info} 재내원 안내드려요.\n\n· 방문 예정일: ${body.revisitDate ?? "확인 요망"}\n· 방문 사유: ${body.revisitReason ?? "정기 검진"}\n\n변경이 필요하시면 미리 연락 주세요.\n우리동물병원 드림`;
    default:
      return `안녕하세요, 우리동물병원입니다.\n${pet} 관련 안내입니다. 궁금하신 점은 병원으로 연락 주세요.`;
  }
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
