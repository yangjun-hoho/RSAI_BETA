import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { rejectIfPii } from '@/lib/security/piiFilter';
import { logAudit } from '@/lib/security/auditLog';
import { rejectIfTooLong } from '@/lib/security/inputValidation';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `당신은 친절하고 전문적인 AI 어시스턴트입니다. 한국어로 답변해주세요.

사용자가 이 프로그램(서비스)에 대해 물어보면 아래 내용을 바탕으로 간략하게 안내하세요.

[프로그램 소개]
이 서비스는 공무원 업무를 돕는 AI 플랫폼입니다. 주요 기능은 다음과 같습니다.
- 보고서 생성: AI가 자동으로 업무 보고서를 작성합니다.
- 인사말씀 생성: 상황별 맞춤 인사말을 작성합니다.
- 보도자료 생성: 효과적인 보도자료를 작성합니다.
- 공적조서 생성: 공적조서를 자동으로 작성합니다.
- 시나리오 생성: 발표용 시나리오를 자동으로 변환합니다.
- PPT 생성: AI가 프레젠테이션 내용을 작성합니다.
- 업무 템플릿: 공무원 업무 특화 AI 템플릿을 제공합니다.
- RAG (NotebookLM): 문서를 업로드하면 문서 기반으로 AI가 답변합니다.
- 텍스트 변환: 문체·맞춤법·표현을 변환하는 도구입니다.
- 업무 지원 2: 새롭게 설계된 AI 업무 도구 모음입니다.
- 숏폼 에디터: 숏폼 콘텐츠 제작을 돕습니다.
- 차트 에디터: 데이터를 시각화하는 차트를 만듭니다.
- 화면 녹화: 화면 녹화 기능을 제공합니다.
- AI 자유게시판: AI와 함께하는 커뮤니티 게시판입니다.
- 웹 검색: 실시간 웹 검색을 통해 최신 정보를 제공합니다.

사용 방법이나 특정 기능에 대해 물어보면 위 설명을 참고하여 간략하게 안내해주세요.`;


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
        parts: [{ text: SYSTEM_PROMPT }],
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
      { role: 'system' as const, content: SYSTEM_PROMPT },
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
            { role: 'system', content: SYSTEM_PROMPT },
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
