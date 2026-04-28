import type { NextRequest } from 'next/server'

type Message = { role: 'user' | 'assistant'; content: string }

async function getMockResponse(messages: Message[]): Promise<string> {
  await new Promise(r => setTimeout(r, 750 + Math.random() * 500))
  const isFirst = messages.filter(m => m.role === 'user').length === 1
  if (isFirst) {
    return `증상을 알려주셔서 감사해요. 몇 가지 여쭤볼게요.\n\n평소와 비교해서 활동량이나 기운이 달라 보이나요? 또한 최근 환경 변화(이사, 새 가족, 낯선 방문객 등)가 있었나요?`
  }
  return `네, 잘 알겠습니다. 마지막으로 한 가지만요. 해당 증상이 지속적으로 있나요, 아니면 왔다 갔다 하나요?`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json() as {
      messages: Message[]
      systemPrompt: string
    }

    const key = process.env.GEMINI_API_KEY
    if (!key) {
      const content = await getMockResponse(messages)
      return Response.json({ content })
    }

    const model = 'gemini-2.0-flash-lite'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    })

    const data = await res.json() as {
      candidates: { content: { parts: { text: string }[] } }[]
      error?: { message: string }
    }

    if (!res.ok) {
      // quota 초과 등 오류 시 mock으로 폴백
      console.warn('[Gemini] API 오류, mock 사용:', data.error?.message)
      const content = await getMockResponse(messages)
      return Response.json({ content })
    }

    return Response.json({ content: data.candidates[0].content.parts[0].text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Gemini API Error]', msg)
    return Response.json({ content: `⚠️ Gemini 오류: ${msg}` }, { status: 500 })
  }
}
