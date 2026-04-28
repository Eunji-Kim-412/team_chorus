import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '@/lib/getApiKey'

export async function GET() {
  const results: Record<string, string> = {}

  // Anthropic
  try {
    const key = getApiKey('ANTHROPIC_API_KEY')
    if (!key) {
      results.anthropic = '❌ 키 없음'
    } else {
      const client = new Anthropic({ apiKey: key })
      await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      })
      results.anthropic = '✅ 정상'
    }
  } catch (e) {
    results.anthropic = `❌ ${e instanceof Error ? e.message : String(e)}`
  }

  // Groq
  try {
    const key = process.env.GROQ_API_KEY
    if (!key) {
      results.groq = '❌ 키 없음'
    } else {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
      })
      results.groq = res.ok ? '✅ 정상' : `❌ HTTP ${res.status}`
    }
  } catch (e) {
    results.groq = `❌ ${e instanceof Error ? e.message : String(e)}`
  }

  // Gemini
  try {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      results.gemini = '❌ 키 없음'
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }) }
      )
      results.gemini = res.ok ? '✅ 정상' : `❌ HTTP ${res.status}`
    }
  } catch (e) {
    results.gemini = `❌ ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json(results)
}
