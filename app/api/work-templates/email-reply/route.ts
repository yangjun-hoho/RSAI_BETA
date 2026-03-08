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
    const { originalMail, replyDirection, tone, senderInfo } = await request.json();

    if (!originalMail?.trim() || !replyDirection?.trim()) {
      return NextResponse.json({ error: '원본 메일 내용과 회신 방향을 입력해주세요.' }, { status: 400 });
    }

    const toneGuide = tone === 'formal'
      ? '공식적이고 격식체, 대외 기관 수준의 정중한 표현'
      : tone === 'semi-formal'
      ? '준공식적, 협력기관과 주고받는 수준의 친절하고 명확한 표현'
      : '내부 업무용, 간결하고 명확한 표현';

    const prompt = `당신은 공무원 업무 이메일 작성 전문가입니다. 아래 원본 메일에 대한 공식 회신을 작성하세요.

원본 메일: ${originalMail}
회신 방향: ${replyDirection}
어조: ${toneGuide}
발신자: ${senderInfo || '담당자'}

다음 JSON 형식으로만 반환하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "sections": [
    {
      "title": "메일 제목",
      "content": "Re: [원본 내용에 맞는 회신 제목]"
    },
    {
      "title": "인사 및 맥락 확인",
      "content": "수신자에 대한 정중한 인사와 원본 메일 수신 확인 (2~3문장)"
    },
    {
      "title": "본문 내용",
      "content": "회신 방향에 따른 구체적인 답변 내용 (3~5문장)"
    },
    {
      "title": "마무리 및 서명",
      "content": "정중한 마무리 인사와 발신자 정보"
    }
  ]
}`;

    const raw = await callGemini(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('응답 파싱 실패');
    const result = JSON.parse(match[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[email-reply error]', error);
    return NextResponse.json({ error: '메일 회신 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
