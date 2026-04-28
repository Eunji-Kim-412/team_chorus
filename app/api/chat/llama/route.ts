import type { NextRequest } from 'next/server'

type Message = { role: 'user' | 'assistant'; content: string }

async function getMockResponse(messages: Message[]): Promise<string> {
  await new Promise(r => setTimeout(r, 700 + Math.random() * 500))
  const last = messages.at(-1)?.content ?? ''
  const isSymptom = last.length > 10
  if (isSymptom) {
    return `말씀하신 내용을 잘 들었어요. 좀 더 파악하기 위해 질문드릴게요.\n\n최근에 먹은 음식이나 간식 중에 평소와 다른 것이 있었나요? 또한 다른 동물이나 사람과 접촉한 적이 있나요?`
  }
  return `알겠습니다. 행동 변화도 있었나요? 예를 들어 평소보다 덜 활발하거나 특정 자세를 취하고 있나요?`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json() as {
      messages: Message[]
      systemPrompt: string
    }

    // TODO: GROQ_API_KEY 확인 후 실제 API 연결
    const key = process.env.GROQ_API_KEY
    if (!key) {
      const content = await getMockResponse(messages)
      return Response.json({ content })
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
    console.error('[Llama API Error]', msg)
    return Response.json({ content: `⚠️ Llama 오류: ${msg}` }, { status: 500 })
  }
}
