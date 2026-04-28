import type { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '@/lib/getApiKey'

export type SummaryResult = {
  symptoms: string[]    // 확인된 증상
  situation: string[]   // 파악된 상황 (타임라인, 환경 등)
}

function buildFallback(
  transcripts: { llm: string; messages: { role: string; content: string }[] }[]
): SummaryResult {
  const userMessages = transcripts
    .flatMap(t => t.messages)
    .filter(m => m.role === 'user')
    .map(m => m.content)

  return {
    symptoms: userMessages.length > 0 ? [userMessages[0].slice(0, 80)] : [],
    situation: ['AI 분석을 불러오지 못했어요. 다시 시도해주세요.'],
  }
}

export async function POST(request: NextRequest) {
  const { transcripts } = await request.json() as {
    transcripts: { llm: string; messages: { role: string; content: string }[] }[]
  }

  const fullText = transcripts
    .filter(t => t.messages.length > 0)
    .map(t => {
      const lines = t.messages
        .map(m => `${m.role === 'user' ? '보호자' : t.llm}: ${m.content}`)
        .join('\n')
      return `[${t.llm}와의 대화]\n${lines}`
    })
    .join('\n\n---\n\n')

  try {
    const key = getApiKey('ANTHROPIC_API_KEY')
    if (!key) return Response.json(buildFallback(transcripts))

    const client = new Anthropic({ apiKey: key })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      system: `당신은 수의 전문가입니다. 보호자와 AI의 대화를 읽고, 확인된 사실만 짧게 정리하세요.

반드시 아래 JSON 형식으로만 답변하세요:
{
  "symptoms": ["증상1", "증상2"],
  "situation": ["상황1", "상황2"]
}

규칙:
- symptoms: 보호자가 "있다", "했다", "안 먹는다"처럼 직접 확인해 준 신체 증상만. 예) "구토 1회", "식욕 저하", "음수 감소"
- situation: 언제부터 시작됐는지, 최근 먹은 것, 환경 변화 등 배경 사실만. 예) "어제부터 시작", "사료 바꾼 적 없음"
- 대화 내용을 그대로 복사하지 말고, 확인된 사실만 짧은 명사형으로 정리
- 아직 보호자가 답하지 않은 것은 포함하지 마세요
- 한국어로`,
      messages: [{
        role: 'user',
        content: fullText,
      }],
    })

    const block = response.content[0]
    let text = block.type === 'text' ? block.text.trim() : ''
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(text) as SummaryResult
    return Response.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Summarize Error]', msg)
    return Response.json(buildFallback(transcripts))
  }
}
