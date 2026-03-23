import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchSimilar } from '@/lib/rag/vectorCache';
import { ragDb } from '@/lib/rag/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, question, history = [] } = await request.json() as {
      categoryId: string;
      question: string;
      history: HistoryMessage[];
    };

    if (!categoryId || !question) {
      return NextResponse.json({ error: 'categoryId, question 필요' }, { status: 400 });
    }

    const category = ragDb.getCategoryById(categoryId);
    if (!category) return NextResponse.json({ error: '유효하지 않은 카테고리' }, { status: 400 });

    // 비공개 카테고리: 소유자만 접근 가능
    if (category.is_public === 0) {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      const session = token ? await verifySession(token) : null;
      if (!session || session.userId !== category.created_by) {
        return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
      }
    }

    // 1. 질문 임베딩
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });
    const queryEmbedding = embRes.data[0].embedding;

    // 2. 유사 청크 검색 (top-5)
    const topChunks = searchSimilar(categoryId, queryEmbedding, 5);

    if (topChunks.length === 0) {
      // 문서 없음 → 안내 메시지 SSE
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const msg = '등록된 문서가 없습니다. 관리자 페이지에서 문서를 먼저 업로드해주세요.';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: msg })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        },
      });
      return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    // 3. 컨텍스트 구성
    const context = topChunks
      .map((c, i) => `[${i + 1}] (출처: ${c.documentName})\n${c.chunkText}`)
      .join('\n\n');

    const sources = topChunks.map((c, i) => ({ index: i + 1, docName: c.documentName, chunk: c.chunkText }));

    // 4. 시스템 프롬프트
    const systemPrompt = `당신은 ${category.name} 전문 AI 상담사입니다.
아래 [참고 문서]에 포함된 내용만을 근거로 질문에 답변합니다.

[참고 문서]
${context}

━━━ 답변 규칙 ━━━

【정확성】
- 반드시 [참고 문서]에 명시된 내용만 사용하십시오.
- 문서에 없는 내용은 추측하거나 보완하지 말고 "등록된 문서에서 해당 내용을 찾을 수 없습니다."라고만 답하십시오.
- 문서의 표현을 임의로 바꾸지 말고, 핵심 문구는 원문 그대로 인용하십시오.

【답변 구조】 (아래 순서를 반드시 지키십시오)
1. **결론** : 질문에 대한 핵심 답변을 1~2문장으로 먼저 제시
2. **근거** : 출처 문서명과 함께 관련 내용 인용 (예: "○○법 제○조에 따르면 ...")
3. **보충 설명** : 필요한 경우에만 추가 맥락 서술 (불필요하면 생략)

【형식】
- 한국어로 답변하십시오.
- 동일한 질문에는 항상 동일한 내용과 구조로 답변하십시오.
- 불필요한 서두(예: "네, 안녕하세요" 등)나 맺음말 없이 바로 결론부터 시작하십시오.
- 전문 용어는 문서 원문의 표현을 그대로 사용하십시오.`;

    // 5. SSE 스트리밍
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-5.4-mini',
            stream: true,
            temperature: 0,    // 일관된 답변을 위해 0 고정
            top_p: 1,
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.slice(-6), // 최근 6개 대화 이력
              { role: 'user', content: question },
            ],
          });

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`
              ));
            }
          }

          // 출처 전송
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'done' })}\n\n`
          ));
        } catch (err) {
          console.error('[rag/query stream]', err);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'AI 응답 오류' })}\n\n`
          ));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',  // Nginx 프록시 버퍼링 비활성화
      },
    });
  } catch (error) {
    console.error('[rag/query]', error);
    return NextResponse.json({ error: 'RAG 쿼리 실패' }, { status: 500 });
  }
}
