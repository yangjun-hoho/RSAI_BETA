import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error('Gemini API 오류');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(request: NextRequest) {
  try {
    const { category, complaintContent, responsePoints, department } = await request.json();

    if (!complaintContent?.trim() || !responsePoints?.trim()) {
      return NextResponse.json({ error: '민원 내용과 답변 핵심 내용을 입력해주세요.' }, { status: 400 });
    }

    const prompt = `당신은 지방자치단체 민원 담당 공무원입니다. 국민신문고 민원에 대한 공식 답변서를 작성하세요.

민원 분류: ${category || '일반민원'}
민원 내용: ${complaintContent}
답변 핵심 내용: ${responsePoints}
담당 부서: ${department || '민원 담당부서'}

다음 JSON 형식으로만 반환하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "sections": [
    {
      "title": "민원 내용 요약",
      "content": "민원인이 제기한 내용을 공식적으로 2~3문장 요약"
    },
    {
      "title": "검토 결과",
      "content": "관련 법령 및 규정에 따른 구체적인 검토 내용과 처리 결과 (3~5문장)"
    },
    {
      "title": "마무리 인사",
      "content": "귀하의 소중한 민원에 감사드리며... 로 시작하는 정중한 마무리 문구"
    }
  ]
}`;

    const raw = await callGemini(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('응답 파싱 실패');
    const result = JSON.parse(match[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[civil-complaint error]', error);
    return NextResponse.json({ error: '답변 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
