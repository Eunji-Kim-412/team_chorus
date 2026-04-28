import type { NextRequest } from 'next/server'

type Message = { role: 'user' | 'assistant'; content: string }

async function getMockResponse(messages: Message[]): Promise<string> {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
  const last = messages.at(-1)?.content ?? ''
  const isSymptom = last.length > 10
  if (isSymptom) {
    return `증상을 말씀해 주셨군요. 더 정확한 파악을 위해 몇 가지 여쭤볼게요.\n\n해당 증상이 언제부터 시작됐나요? 그리고 평소와 비교해서 물은 잘 마시고 있나요?`
  }
  return `네, 알겠습니다. 추가로 대변이나 소변 상태에 변화가 있었나요?`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json() as {
      messages: Message[]
      systemPrompt: string
    }

    // TODO: OPENAI_API_KEY 발급 후 아래 mock을 실제 API 호출로 교체
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      const content = await getMockResponse(messages)
      return Response.json({ content })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 1024,
      }),
    })

    const data = await res.json() as {
      choices: { message: { content: string } }[]
      error?: { message: string }
    }
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
    return Response.json({ content: data.choices[0].message.content })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[ChatGPT API Error]', msg)
    return Response.json({ content: `⚠️ ChatGPT 오류: ${msg}` }, { status: 500 })
  }
}
