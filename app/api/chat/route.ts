import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { rejectIfPii } from '@/lib/security/piiFilter';
import { logAudit } from '@/lib/security/auditLog';
import { rejectIfTooLong } from '@/lib/security/inputValidation';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { messages, model = 'gpt-5.4-mini', webSearch = false } = await req.json() as {
    messages: ChatMessage[];
    model: string;
    webSearch?: boolean;
  };

  // 마지막 user 메시지 검사
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const lenBlock = rejectIfTooLong([{ value: lastUserMsg.content, label: '메시지', max: 3000 }]);
    if (lenBlock) return lenBlock;
    const piiBlock = rejectIfPii([lastUserMsg.content], '/api/chat');
    if (piiBlock) return piiBlock;
  }

  void logAudit(req, { statusCode: 200 });
  const encoder = new TextEncoder();

  if (model === 'gemini-2.5-flash-lite' || model.startsWith('gemini')) {
    // Gemini streaming via REST
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      systemInstruction: {
        parts: [{ text: '당신은 친절하고 전문적인 AI 어시스턴트입니다. 한국어로 답변해주세요.' }],
      },
    };

    if (webSearch) {
      geminiBody.tools = [{ googleSearch: {} }];
    }

    const geminiRes = await fetch(`${GEMINI_BASE_URL}/${model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[Gemini Error]', geminiRes.status, err);
      return new Response(JSON.stringify({ error: `Gemini ${geminiRes.status}: ${err}` }), { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Gemini는 검색 중 이벤트가 없으므로 웹검색 시 미리 알림
        if (webSearch) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'searching' })}\n\n`));
        }

        const reader = geminiRes.body!.getReader();
        const dec = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
            } catch {
              // skip
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  // OpenAI Responses API (web search) — OpenAI 모델일 때만 동작
  if (webSearch && !model.startsWith('gemini')) {
    const inputMessages = [
      { role: 'system' as const, content: '당신은 친절하고 전문적인 AI 어시스턴트입니다. 한국어로 답변해주세요.' },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await openai.responses.create({
            model,
            input: inputMessages,
            tools: [{ type: 'web_search_preview' as const }],
            stream: true,
          });
          for await (const event of response) {
            if (event.type === 'response.web_search_call.in_progress') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'searching' })}\n\n`));
            } else if (event.type === 'response.output_text.delta') {
              const text = (event as { type: string; delta: string }).delta;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'API error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  // OpenAI Chat Completions (기본)
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: '당신은 친절하고 전문적인 AI 어시스턴트입니다. 한국어로 답변해주세요.' },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          max_completion_tokens: 2048,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'API error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
