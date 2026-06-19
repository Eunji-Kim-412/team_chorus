import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

type Severity = "error" | "warning";
interface Check { key: string; label: string; ok: boolean; severity: Severity }
interface Issue { severity: Severity; label: string; detail: string }

// 메시지 유형별 필수 안내 항목 (동의어 그룹 중 하나라도 포함하면 통과)
const REQUIRED: Record<string, { key: string; label: string; severity: Severity; any: string[] }[]> = {
  "post-surgery": [
    { key: "med", label: "투약/복용 안내", severity: "error", any: ["약", "투약", "복용", "급여", "처방"] },
    { key: "caution", label: "주의사항", severity: "error", any: ["주의", "관리", "보호"] },
    { key: "redflag", label: "이상 시 내원(red flag)", severity: "error", any: ["즉시", "응급", "이상", "바로"] },
    { key: "nextvisit", label: "다음 내원 안내", severity: "warning", any: ["내원", "방문", "재진", "다음", "재방문"] },
  ],
  "pre-surgery": [
    { key: "fasting", label: "금식 안내", severity: "error", any: ["금식", "공복", "굶"] },
    { key: "prep", label: "준비/지참 안내", severity: "warning", any: ["준비", "지참", "주의"] },
    { key: "contact", label: "병원 연락 안내", severity: "warning", any: ["연락", "문의", "병원"] },
  ],
  vaccination: [
    { key: "date", label: "예정일/일정 안내", severity: "error", any: ["예정", "일정", "날짜", "예약", "접종일"] },
    { key: "contact", label: "연락/문의 안내", severity: "warning", any: ["연락", "문의", "병원"] },
  ],
  revisit: [
    { key: "date", label: "방문일 안내", severity: "error", any: ["방문", "내원", "예정", "일정"] },
    { key: "reason", label: "방문 사유", severity: "warning", any: ["검진", "사유", "위해", "관련", "재진", "실밥", "검사", "접종"] },
  ],
};

const PHONE_RE = /0\d{1,2}-?\d{3,4}-?\d{4}/;
const HANGUL_RE = /[가-힣]/;
const OVERSTATE = ["100%", "완치 보장", "무조건", "절대 안전", "부작용 없"];

function ruleCheck(message: string, messageType: string, language: string): { checks: Check[]; issues: Issue[] } {
  const checks: Check[] = [];
  const issues: Issue[] = [];

  // 필수 항목 검사
  const req = REQUIRED[messageType] ?? [];
  for (const r of req) {
    const ok = r.any.some((kw) => message.includes(kw));
    checks.push({ key: r.key, label: r.label, ok, severity: r.severity });
    if (!ok) issues.push({ severity: r.severity, label: `${r.label} 누락`, detail: `${r.label} 관련 문구가 안내문에 보이지 않습니다.` });
  }

  // 위험 표현/형식 검사
  if (PHONE_RE.test(message)) {
    issues.push({ severity: "warning", label: "실제 전화번호 포함 의심", detail: "안내문에 전화번호 형식이 포함되어 있습니다. 정확한 번호인지 확인하세요." });
  }
  if ((language === "en" || language === "zh") && HANGUL_RE.test(message)) {
    issues.push({ severity: "error", label: "언어 혼입", detail: `${language.toUpperCase()} 안내문에 한글이 섞여 있습니다.` });
  }
  for (const w of OVERSTATE) {
    if (message.includes(w)) {
      issues.push({ severity: "warning", label: "단정적/과장 표현", detail: `'${w}' 같은 단정적 표현은 의료 안내에 부적절할 수 있습니다.` });
      break;
    }
  }
  if (message.length > 500) {
    issues.push({ severity: "warning", label: "길이 초과", detail: `${message.length}자 — SMS 권장 500자를 초과합니다.` });
  }
  return { checks, issues };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message: string = body.message ?? "";
  const messageType: string = body.messageType ?? "";
  const language: string = body.language ?? "ko";

  if (!message.trim()) {
    return NextResponse.json({ error: "검수할 안내문이 없습니다." }, { status: 400 });
  }

  const { checks, issues } = ruleCheck(message, messageType, language);

  // AI 의료 검수(할루시네이션·위험 표현). 키 없거나 실패 시 규칙 기반만 사용.
  let aiUsed = false;
  try {
    const provider = getAIProvider();
    const system = `당신은 동물병원 안내문을 검수하는 의료 검증 AI입니다.
생성된 보호자용 SMS 안내문에서 다음을 점검해 JSON으로만 응답하세요:
1) 사실 오류/근거 없는 내용(할루시네이션) 의심
2) 위험하거나 단정적인 의료 표현(진단 단정, 용량 임의 제시 등)
3) 환자 안전상 반드시 있어야 할 안내의 누락
진단을 새로 내리지 말고, 문제점만 지적하세요. 문제가 없으면 issues를 빈 배열로 두세요.
형식: {"issues":[{"severity":"error|warning","label":"짧은 제목","detail":"한 문장 설명"}]}`;
    const user = `안내 유형: ${messageType}\n언어: ${language}\n안내문:\n"""${message}"""`;
    const raw = await provider.generate(system, user);
    const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed.issues)) {
        for (const it of parsed.issues) {
          const severity: Severity = it.severity === "error" ? "error" : "warning";
          issues.push({ severity, label: `AI: ${it.label ?? "검수 의견"}`, detail: it.detail ?? "" });
        }
        aiUsed = true;
      }
    }
  } catch {
    // 규칙 기반 결과만 반환
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const passedChecks = checks.filter((c) => c.ok).length;
  const score = checks.length ? Math.round((passedChecks / checks.length) * 100) : 100;

  return NextResponse.json({
    passed: errorCount === 0,
    score,
    errorCount,
    warningCount: issues.length - errorCount,
    checks,
    issues,
    aiUsed,
  });
}
