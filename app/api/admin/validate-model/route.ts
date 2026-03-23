import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function POST(req: NextRequest) {
  const { provider, model } = await req.json() as { provider: 'openai' | 'google'; model: string };

  if (!model?.trim()) {
    return NextResponse.json({ valid: false, error: '모델명을 입력해주세요.' });
  }

  if (provider === 'openai') {
    // Responses API로 먼저 시도 (gpt-5.x 등 신규 모델)
    try {
      await openai.responses.create({
        model,
        input: [{ role: 'user', content: 'hi' }],
        max_output_tokens: 16,
      });
      return NextResponse.json({ valid: true });
    } catch (responsesErr) {
      const msg1 = responsesErr instanceof Error ? responsesErr.message : String(responsesErr);
      // Responses API에서 모델 자체를 못 찾은 게 아니면 Chat Completions로 재시도
      if (!msg1.includes('404') && !msg1.includes('does not exist') && !msg1.includes('model')) {
        try {
          await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'hi' }],
            max_completion_tokens: 1,
          });
          return NextResponse.json({ valid: true });
        } catch (chatErr) {
          const msg2 = chatErr instanceof Error ? chatErr.message : String(chatErr);
          return NextResponse.json({ valid: false, error: msg2 });
        }
      }
      return NextResponse.json({ valid: false, error: `모델을 찾을 수 없습니다: ${model}` });
    }
  }

  if (provider === 'google') {
    try {
      const res = await fetch(
        `${GEMINI_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
        }
      );
      if (res.ok) return NextResponse.json({ valid: true });
      const err = await res.json();
      const msg = err?.error?.message || `HTTP ${res.status}`;
      return NextResponse.json({ valid: false, error: msg });
    } catch (e) {
      return NextResponse.json({ valid: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ valid: false, error: '알 수 없는 provider입니다.' });
}
