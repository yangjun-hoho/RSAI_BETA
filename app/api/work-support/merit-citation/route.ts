import { NextRequest, NextResponse } from 'next/server';
import { rejectIfPii } from '@/lib/security/piiFilter';

export async function POST(request: NextRequest) {
  try {
    const options = await request.json();

    if (!options.meritField || !options.majorAchievements) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const piiBlock = rejectIfPii([options.majorAchievements], '/api/work-support/merit-citation');
    if (piiBlock) return piiBlock;

    const systemPrompt = '당신은 한국의 공적조서 작성 전문가입니다. 공무원 및 일반인 대상 공적조서를 공식 형식에 맞춰 완벽하게 작성할 수 있습니다.';

    const userPrompt = `
    너는 공적조서 작성에 특화된 최고의 AI야. 공적조서의 공식 스타일과 형식을 완벽하게 이해하고 있으며, 어떤 분야라도 공적조서 형식에 맞게 정확하고 전문적으로, 공식적인 느낌이 나도록 작성할 수 있어.

    공적 대상: ${options.targetType}
    공적 분야: ${options.meritField}
    주요 실적: ${options.majorAchievements}

    위 정보를 바탕으로 공적조서(안) 형식에 맞게 작성해줘.

    다음 가이드라인을 반드시 준수하여 작성해줘:

    ## 필수 구조 요소

    1. **공적조서 분야**: ${options.meritField}
    2. **공적조서 개요**: 80자 내외로 간결하게 핵심 내용 요약
    3. **공적조서 사항**: 500자 내외로 상세한 공적 내용 기술

    ## 문체 및 표현 특징

    1. **공적조서 개요 (80자 내외)**:
    - 공적조서 사항의 핵심 내용을 75-85자 내외로 충실히 요약
    - "상기인은 ~업무를 담당하면서 ~건의 업무를 처리하여 ~에 기여하였으며, ~등의 성과를 거두어 ~에 크게 기여함" 형식 사용
    - 구체적인 수치나 성과를 포함하여 실질적인 요약 작성
    - 반드시 75-85자 사이로 충분한 내용을 담아 작성

    2. **공적조서 사항 (500자 내외)**:
    - 첫 문단: 전반적인 업무 수행 태도와 기여도 설명 → 작성 후 반드시 빈 줄 1개 삽입
    - 중간 문단: 구체적인 실적을 ▢ 기호로 나열 → 각 ▢ 항목 사이에 반드시 빈 줄 1개 삽입
    - 각 실적은 구체적인 수치와 성과를 포함하여 기술
    - 마지막 마무리 문단: 인성적 측면이나 조직 기여도 언급 → 마지막 ▢ 항목 뒤에 반드시 빈 줄 1개 삽입 후 작성

    3. **대상별 맞춤 표현**:
    - 공무원: "공무원으로 임용되고", "공무원의 직무를 성실히 수행", "행정력 효율화"
    - 일반인: "~분야 종사자로서", "직업윤리의식이 투철", "사회 발전에 기여"

    4. **분야별 전문 용어 활용**:
    - 해당 분야의 전문 용어와 업무 특성을 정확히 반영
    - 구체적인 업무 내용과 성과 지표 포함
    - 사회적 기여도와 파급효과 명시

    ## 작성 형식 예시

    ■ 공적조서 분야 : ${options.meritField}

    ■ 공적조서 개요(80자 내외)
    [80자 내외의 충실한 요약]

    ■ 공적조서 사항(500자 내외)
    [첫 문단: 전반적 기여도 2~3문장]

    ▢ [첫 번째 구체적 실적 — 수치 포함]

    ▢ [두 번째 구체적 실적 — 수치 포함]

    ▢ [세 번째 구체적 실적 — 수치 포함]

    [마무리 멘트: 인성적 측면이나 추가 기여도 1~2문장]

    ## 주의사항
    - 과장되지 않은 사실에 기반한 서술
    - 구체적인 수치와 기간 포함
    - 해당 분야의 특성과 전문성 반영
    - 사회적 기여도와 모범성 강조
    - 객관적이고 공식적인 문체 유지
    - **공적조서 개요는 반드시 75-85자 사이로 충분한 분량으로 작성하되, 공적조서 사항의 핵심 내용을 충실히 요약할 것**
    - **공적조서 사항에서 첫 문단, 각 ▢ 항목, 마무리 문단 사이에는 반드시 빈 줄(빈 행)을 한 줄씩 넣어 단락을 명확히 구분할 것. 이어 붙여 쓰지 말 것**

    제공된 정보를 바탕으로 위 지침에 따라 ${options.targetType}을 대상으로 한 ${options.meritField} 분야 공적조서(안)를 작성해줘.
    특히 공적조서 개요는 공적조서 사항의 주요 내용을 80자 내외로 충실하게 요약하여 작성해줘.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API 요청 중 오류가 발생했습니다.');
    }

    const result = await response.json();
    const citation = result.choices[0]?.message?.content?.trim();

    if (!citation) {
      return NextResponse.json({ error: '공적조서 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      citation,
      title: `${options.targetType} 공적조서 - ${options.meritField} 분야`,
    });
  } catch (error) {
    console.error('[merit-citation API error]', error);
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
    if (message.includes('API key')) {
      return NextResponse.json({ error: 'API 키 인증에 실패했습니다. 관리자에게 문의해주세요.' }, { status: 500 });
    }
    if (message.includes('rate limit')) {
      return NextResponse.json({ error: '요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
