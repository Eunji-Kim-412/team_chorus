import type { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '@/lib/getApiKey'

type Message = { role: 'user' | 'assistant'; content: string }

async function getMockResponse(messages: Message[]): Promise<string> {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
  const isFirst = messages.filter(m => m.role === 'user').length === 1
  if (isFirst) {
    return `말씀하신 증상을 잘 들었어요. 좀 더 파악하기 위해 여쭤볼게요.\n\n구토나 설사 증상도 함께 있나요? 그리고 그 증상이 정확히 언제부터 시작됐는지 알 수 있을까요?`
  }
  return `감사합니다. 한 가지만 더 여쭤볼게요. 최근에 산책 중에 뭔가 주워 먹거나 낯선 것을 핥은 적이 있었나요?`
}

export async function POST(request: NextRequest) {
  // body를 먼저 파싱해두고 재사용
  const { messages, systemPrompt } = await request.json() as {
    messages: Message[]
    systemPrompt: string
  }

  try {
    const key = getApiKey('ANTHROPIC_API_KEY')
    if (!key) {
      const content = await getMockResponse(messages)
      return Response.json({ content })
    }

    // 클라이언트를 핸들러 안에서 초기화 (env var 로딩 타이밍 문제 방지)
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const block = response.content[0]
    const content = block.type === 'text' ? block.text : ''
    return Response.json({ content })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Claude API Error]', msg)
    // API 오류 시 mock으로 폴백
    const content = await getMockResponse(messages)
    return Response.json({ content })
  }
}
