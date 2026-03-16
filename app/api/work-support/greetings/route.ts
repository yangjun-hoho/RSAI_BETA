import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { speechCategoryData, getSpeechLength } from '@/lib/work-support/greetings/templates';
import { rejectIfPii } from '@/lib/security/piiFilter';
import { logAudit } from '@/lib/security/auditLog';
import { rejectIfTooLong } from '@/lib/security/inputValidation';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      speechCategory,
      greetingType,
      specificSituation,
      speaker,
      audienceType,
      quoteType1,
      quoteType2,
      coreContent,
      season,
      speechLength,
    } = body;

    if (!speechCategory || !specificSituation) {
      return NextResponse.json({ error: '행사 유형과 구체적인 상황을 입력해주세요.' }, { status: 400 });
    }

    const lenBlock = rejectIfTooLong([
      { value: specificSituation, label: '구체적인 상황', max: 1000 },
      { value: coreContent, label: '핵심 내용', max: 1000 },
      { value: speaker, label: '발화자', max: 100 },
    ]);
    if (lenBlock) return lenBlock;

    const piiBlock = rejectIfPii([specificSituation, speaker, coreContent].filter(Boolean) as string[], '/api/work-support/greetings');
    if (piiBlock) return piiBlock;

    const lengthGuide = getSpeechLength(speechLength);
    const categoryData = speechCategoryData[speechCategory];
    const categoryGuidelines = categoryData?.guidelines || '';
    const categoryTemplate = categoryData?.template || '';

    const seasonText = season && season !== '없음' ? `계절/시기 요소: ${season}` : '';
    const quoteText = quoteType1 && quoteType1 !== '없음'
      ? quoteType2 && quoteType2 !== '없음'
        ? `${quoteType1} 유형의 인용구를 ${quoteType2} 분위기로 포함`
        : `${quoteType1} 유형의 인용구 포함`
      : '';

    const systemPrompt = `당신은 대한민국 지방자치단체 공무원의 공식 행사 말씀자료를 작성하는 전문가입니다.
남양주시의 공식 행사에 사용될 격식 있고 품위 있는 ${greetingType || '인사말씀'}을 작성합니다.

## 작성 원칙
- 분량: ${lengthGuide}
- 존댓말과 공식적인 어체 사용
- 시작은 청중에 대한 감사나 환영 인사로
- 마무리는 격려나 희망의 메시지로
${seasonText ? `- ${seasonText}을 자연스럽게 녹여낼 것` : ''}
${quoteText ? `- ${quoteText}` : ''}

## 행사 유형별 작성 지침
${categoryGuidelines}

## 말씀 구조 참고 템플릿
${categoryTemplate}`;

    const userPrompt = `다음 조건에 맞는 ${greetingType || '인사말씀'}을 작성해주세요:

행사 유형: ${speechCategory}
말씀 유형: ${greetingType || '인사말씀'}
구체적인 상황: ${specificSituation}
${speaker ? `발화자: ${speaker}` : ''}
${audienceType ? `청중: ${audienceType}` : ''}
${coreContent ? `핵심 내용: ${coreContent}` : ''}

말씀 본문만 작성하고, 별도 설명이나 제목은 포함하지 마세요.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const greeting = completion.choices[0]?.message?.content?.trim();
    if (!greeting) {
      return NextResponse.json({ error: '인사말씀 생성에 실패했습니다.' }, { status: 500 });
    }

    void logAudit(request, { statusCode: 200 });
    return NextResponse.json({ greeting });
  } catch (error) {
    console.error('[greetings API error]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
