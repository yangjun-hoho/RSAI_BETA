import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error('Gemini API 오류');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(request: NextRequest) {
  try {
    const { docType, recipient, subject, mainContent, department } = await request.json();

    if (!recipient?.trim() || !subject?.trim() || !mainContent?.trim()) {
      return NextResponse.json({ error: '수신기관, 제목, 주요 내용을 입력해주세요.' }, { status: 400 });
    }

    const prompt = `당신은 한국 지방자치단체 행정 공문서 작성 전문가입니다. 아래 내용으로 공식 행정 공문서(기안문)를 작성하세요.

공문 유형: ${docType || '협조요청'}
수신: ${recipient}
제목: ${subject}
주요 내용: ${mainContent}
기안부서: ${department || '담당부서'}

다음 JSON 형식으로만 반환하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "sections": [
    {
      "title": "문서 정보",
      "content": "수신: ${recipient}\\n참조: (해당 시 기재)\\n제목: ${subject}"
    },
    {
      "title": "목적 및 근거",
      "content": "공문 작성 목적과 관련 법령 또는 지침 근거 (2~3문장)"
    },
    {
      "title": "주요 내용",
      "content": "가., 나., 다. 번호 목록 형식으로 구체적인 내용 기술"
    },
    {
      "title": "붙임 및 마무리",
      "content": "붙임 서류 목록 또는 협조 요청 마무리 문구. 끝."
    }
  ]
}`;

    const raw = await callGemini(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('응답 파싱 실패');
    const result = JSON.parse(match[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[official-doc error]', error);
    return NextResponse.json({ error: '공문서 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
