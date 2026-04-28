import type { NextRequest } from 'next/server'
import { getApiKey } from '@/lib/getApiKey'

export type DiagnosisSummary = {
  topCause: string | null          // 공통으로 가장 많이 지목된 원인
  agreement: 'all' | 'most' | 'split'   // AI들이 얼마나 동의하는지
  riskLevel: 'low' | 'medium' | 'high' | null
  perLlm: { llm: string; cause: string }[]  // 각 AI의 핵심 진단 1줄
}

function buildFallback(
  diagnoses: { llm: string; content: string }[]
): DiagnosisSummary {
  // AI 합성 실패 시: 각 진단의 첫 줄만 추출
  const perLlm = diagnoses.map(d => ({
    llm: d.llm,
    cause: d.content.split('\n').find(l => l.trim().length > 10)?.slice(0, 80) ?? '진단 내용 없음',
  }))
  return { topCause: null, agreement: 'split', riskLevel: null, perLlm }
}

export async function POST(request: NextRequest) {
  const { diagnoses } = await request.json() as {
    diagnoses: { llm: string; content: string }[]
  }

  if (diagnoses.every(d => !d.content)) return Response.json(buildFallback(diagnoses))

  const diagnosisText = diagnoses
    .filter(d => d.content)
    .map(d => `[${d.llm}]\n${d.content}`)
    .join('\n\n---\n\n')

  const prompt = `다음은 4명의 AI 수의 전문가가 동일한 반려동물 증상에 대해 내린 진단이에요.

${diagnosisText}

각 AI의 핵심 원인 진단을 1줄로 요약하고, 공통 원인과 위험도를 파악해주세요.

반드시 아래 JSON 형식으로만 답변하세요:
{
  "topCause": "공통으로 가장 많이 지목된 원인 (없으면 null)",
  "agreement": "all 또는 most 또는 split",
  "riskLevel": "low 또는 medium 또는 high (파악 불가면 null)",
  "perLlm": [
    { "llm": "AI이름", "cause": "핵심 원인 1줄 요약" }
  ]
}

규칙:
- agreement: all=모두 같은 원인, most=3개 이상 같은 원인, split=의견 분분
- topCause: agreement가 split이면 null
- perLlm의 cause는 최대 50자, 명사형으로
- 한국어로`

  try {
    const key = getApiKey('GROQ_API_KEY')
    if (!key) return Response.json(buildFallback(diagnoses))

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.3,
      }),
    })

    if (!res.ok) return Response.json(buildFallback(diagnoses))

    const data = await res.json()
    let text: string = data.choices?.[0]?.message?.content ?? ''
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(text) as DiagnosisSummary
    return Response.json(result)
  } catch (e) {
    console.error('[DiagnoseSummary Error]', e instanceof Error ? e.message : String(e))
    return Response.json(buildFallback(diagnoses))
  }
}
