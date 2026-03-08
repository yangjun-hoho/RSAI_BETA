import { NextRequest } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_STREAM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:streamGenerateContent';

export async function POST(request: NextRequest) {
  try {
    const { category, complaintContent, responseKeywords, extraKeywords, department } = await request.json();

    // 체크박스 선택 키워드 + 기타 키워드 합산
    const keywordList = [
      ...(responseKeywords ? responseKeywords.split(',').filter((k: string) => k.trim()) : []),
      ...(extraKeywords?.trim() ? [extraKeywords.trim()] : []),
    ];
    const keywordsText = keywordList.join(', ');

    if (!complaintContent?.trim() || keywordList.length === 0) {
      return Response.json({ error: '민원 내용과 답변 핵심 키워드를 입력해주세요.' }, { status: 400 });
    }

    const prompt = `당신은 지방자치단체 민원 담당 공무원입니다. 국민신문고 민원에 대한 공식 답변서를 작성하세요.

민원 분류: ${category || '일반민원'}
민원 내용: ${complaintContent}
답변 핵심 키워드: ${keywordsText}
담당 부서: ${department || '민원 담당부서'}

반드시 아래 서식 형태를 그대로 유지하며 작성하세요. JSON이나 코드블록 없이 순수 텍스트로만 출력하세요:


【 민원 내용 요약 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━
(민원인이 제기한 내용을 공식적으로 2~3문장으로 요약)


【 검토 결과 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 안 1.
(첫 번째 검토 결과 작성. 민원 내용을 적극 수용하거나 긍정적으로 처리하는 방향의 답변. 관련 법령·규정 근거 포함, 3~4문장)

▶ 안 2.
(두 번째 검토 결과 작성. 안 1과 다른 관점 또는 조건부 수용·일부 불가 등 현실적 제약을 반영한 답변. 관련 법령·규정 근거 포함, 3~4문장)


【 마무리 인사 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━
(귀하의 소중한 민원에 감사드리며... 로 시작하는 정중하고 공식적인 마무리 문구)`;

    const geminiRes = await fetch(`${GEMINI_STREAM_URL}?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    });

    if (!geminiRes.ok) {
      return Response.json({ error: 'AI 서비스 오류가 발생했습니다.' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[national-complaint-beta error]', error);
    return Response.json({ error: '답변 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
