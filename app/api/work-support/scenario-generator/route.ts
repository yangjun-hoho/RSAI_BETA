import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rejectIfPii } from '@/lib/security/piiFilter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const templatePrompts: Record<string, string> = {
  presentation: '발표 대본 (프레젠테이션용): 청중의 이해를 돕는 논리적인 발표 구성으로 작성',
  speech:       '연설문: 청중에게 영감을 주는 공식 연설문 형식으로 작성',
  lecture:      '강의 대본: 교육적 효과를 극대화하는 강의 구성으로 작성',
  ceremony:     '행사 사회 대본: 행사 진행에 필요한 안내와 연결 멘트 포함',
  meeting:      '회의 진행 대본: 회의 시작·안건 소개·마무리를 매끄럽게 이어주는 진행 멘트 작성',
  mc:           '사회자 대본: 행사 전체를 진행하는 사회자의 오프닝·중간·마무리 멘트 작성',
  briefing:     '브리핑 대본: 핵심 내용을 간결하고 명확하게 전달하는 보고·브리핑 대본 작성',
  debate:       '토론 대본: 찬반 논점을 정리하고 토론 진행을 이끄는 구조화된 대본 작성',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, content, style, audience, duration } = body;

    if (!templateType || !content) {
      return NextResponse.json({ error: '대본 유형과 내용을 입력해주세요.' }, { status: 400 });
    }

    const piiBlock = rejectIfPii([content], '/api/work-support/scenario-generator');
    if (piiBlock) return piiBlock;

    const templateDesc = templatePrompts[templateType] || '발표 대본';
    const durationText = duration ? `발표 시간: 약 ${duration}분` : '';
    const audienceText = audience ? `대상 청중: ${audience}` : '';
    const styleText = style ? `발표 스타일: ${style}` : '';

    const systemPrompt = `당신은 전문 대본 작가입니다. 주어진 내용을 바탕으로 완성도 높은 대본을 작성합니다.
대본 유형: ${templateDesc}
${durationText}
${audienceText}
${styleText}

작성 원칙:
- 자연스럽고 실제 발화에 적합한 문장 구성
- 명확한 구조 (도입 → 본론 → 마무리)
- 청중과의 소통을 고려한 표현
- 실제로 읽기 좋은 리듬과 호흡 포함`;

    const userPrompt = `다음 내용을 바탕으로 ${templateDesc}을 작성해주세요:

${content}

대본 형식:
- [도입부] 시작 멘트
- [본론] 핵심 내용 전달
- [마무리] 마무리 멘트

각 섹션을 명확히 구분하여 작성해주세요.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const scenario = completion.choices[0]?.message?.content?.trim();
    if (!scenario) {
      return NextResponse.json({ error: '대본 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error('[scenario-generator API error]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
