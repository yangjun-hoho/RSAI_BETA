import { NextRequest, NextResponse } from 'next/server';
import { rejectIfPii } from '@/lib/security/piiFilter';
import { logAudit } from '@/lib/security/auditLog';
import { rejectIfTooLong } from '@/lib/security/inputValidation';

// ─── 타입 매핑 (영문 ID → 한글 레이블) ───────────────────────────────────────
const reportTypeMap: Record<string, string> = {
  plan: '계획 보고서',
  measure: '대책 보고서',
  status: '상황 보고서',
  analysis: '분석 보고서',
  other: '기타 보고서',
};

const detailTypeMap: Record<string, string> = {
  basic: '기본 계획', detailed: '세부 계획', business: '사업계획',
  problem: '문제해결', risk: '위기관리', improvement: '개선안',
  current: '현황', progress: '진행상황', incident: '사건보고',
  data: '데이터분석', performance: '성과분석', trend: '동향분석',
  memo: '간략메모', meeting: '회의결과', work: '업무메모',
};

const lengthMap: Record<string, string> = {
  brief: '간략', standard: '표준', detailed: '상세',
};

// ─── 프롬프트 데이터 ────────────────────────────────────────────────────────
const reportTypeGuidelines: Record<string, string> = {
  '계획 보고서': `
 - 미래지향적 관점에서 구체적 추진 방안 제시
 - 정량적 목표와 성과지표 반드시 포함
 - 단계별 추진 일정과 예산배분 계획 상세 기술
 - SWOT 분석을 통한 전략적 접근법 제시
 - 각 단계별 성공기준 명확히 설정
 - 사업의 지속가능성 및 확장성 강조`,
  '대책 보고서': `
 - 문제 상황의 심각성과 긴급성 강조
 - 정확한 현황 분석과 데이터 기반 문제 진단
 - 근본 원인과 파생 문제 체계적 분석
 - 단기/중기/장기 대책 구분하여 제시
 - 예상 장애요소와 극복방안 함께 제시
 - 조치 우선순위와 이행 로드맵 구체화`,
  '상황 보고서': `
 - 사실에 기반한 객관적 정보 전달
 - 시간 순서에 따른 체계적 상황 전개 기술
 - 주요 이해관계자와 영향 범위 명확히 설명
 - 데이터와 통계를 활용한 상황 심각성 전달
 - 기존 조치사항과 효과성 평가 포함
 - 후속 상황 예측 및 시나리오별 대응방안 제시`,
  '분석 보고서': `
 - 명확한 분석 목적과 범위 설정
 - 데이터 수집 방법론과 표본 특성 상세 기술
 - 다양한 분석 기법 활용 (정량/정성 분석 병행)
 - 인과관계와 상관관계 구분하여 해석
 - 시계열 추이 분석 및 미래 예측 포함
 - 실행 가능한 권고사항 도출`,
  '기타 보고서': `
 - 명확한 목적성과 핵심 메시지 강조
 - 간결하면서도 필수 정보 누락 없이 작성
 - 객관적 사실과 주관적 의견 명확히 구분
 - 시간, 장소, 관계자 등 5W1H 원칙 준수
 - 우선순위에 따른 내용 배치
 - 후속조치 사항 구체적 명시`,
};

const sectionStructures: Record<string, Record<string, string[]>> = {
  '계획 보고서': {
    '기본 계획': ['배경', '목적', '추진계획', '주요내용', '기대효과'],
    '세부 계획': ['배경', '현황', '추진목표', '추진전략', '세부추진계획', '소요예산', '향후일정'],
    '사업계획': ['사업개요', '추진배경', '사업내용', '추진일정', '소요예산', '기대효과'],
  },
  '대책 보고서': {
    '문제해결': ['목적', '현황', '문제점', '대책', '효과'],
    '위기관리': ['상황개요', '현안문제', '위험요소', '대응방안', '이행계획', '기대효과'],
    '개선안': ['현상진단', '문제분석', '개선목표', '개선방안', '실행계획', '기대효과'],
  },
  '상황 보고서': {
    '현황': ['보고일시', '상황개요', '현재상태', '조치사항', '향후계획'],
    '진행상황': ['사업개요', '추진경과', '진행현황', '주요성과', '문제점', '향후계획'],
    '사건보고': ['발생일시', '발생장소', '사건개요', '피해상황', '조치사항', '후속대책'],
  },
  '분석 보고서': {
    '데이터분석': ['분석목적', '분석방법', '데이터개요', '분석결과', '시사점', '결론'],
    '성과분석': ['사업개요', '분석목적', '성과지표', '분석결과', '개선사항', '결론'],
    '동향분석': ['분석배경', '주요동향', '영향분석', '대응방안', '결론'],
  },
  '기타 보고서': {
    '간략메모': ['날짜', '주요내용', '특이사항', '후속조치'],
    '회의결과': ['회의일시', '참석자', '회의안건', '주요논의사항', '결정사항', '향후일정'],
    '업무메모': ['작성일', '업무개요', '처리내용', '참고사항', '후속조치'],
  },
};

const lengthGuidelines: Record<string, string> = {
  '간략': `
- 각 섹션의 content 배열: 정확히 지킬 것
- 주요 항목 2개: "**(키워드)** 설명"
- SUB 항목 2개: "SUB:내용"
- 전체적으로 압축적이고 요약적인 형태
- 필수 정보만 선별하여 포함
- 차트는 핵심 데이터만 1개 포함`,
  '표준': `
- 각 섹션의 content 배열: 정확히 지킬 것
- 주요 항목 2-3개: "**(키워드)** 설명"
- SUB 항목 2개: "SUB:내용"
- 핵심 내용을 중심으로 논리적 전개
- 균형 잡힌 내용과 적절한 상세 수준 유지
- 차트는 주요 섹션에 2개 포함`,
  '상세': `
- 각 섹션의 content 배열: 정확히 지킬 것
- 주요 항목 3-4개: "**(키워드)** 설명"
- SUB 항목 3-5개: "SUB:내용"
- 배경 정보, 통계, 구체적 데이터 등 심층적 내용 포함
- 다양한 관점과 가능성 검토
- 차트는 데이터가 있는 모든 섹션에 포함 (3-5개)`,
};

const administrativeTerms = `
## 행정 전문용어 및 표현 사전
- 시행: '실시'보다 '시행' 용어 사용 (예: 시범사업 시행)
- 추진: 계획적 진행 강조 시 사용 (예: 단계적 추진)
- 운영: 지속적 관리 표현 시 사용 (예: 프로그램 운영)
- 수립: 계획 작성 시 사용 (예: 종합계획 수립)
- 검토: 분석적 사고 표현 시 사용 (예: 타당성 검토)
- 강화: 기존 역량 향상 시 사용 (예: 협력체계 강화)
- 개선: 문제해결 표현 시 사용 (예: 제도 개선)
- 확충: 양적 증가 표현 시 사용 (예: 인프라 확충)`;

const chartGuidelines = `
## 차트 생성 규칙 (중요!)
- 수치 데이터나 통계가 있는 섹션에 차트 포함
- bar: 항목별 수치 비교, line: 시간 추이, pie: 구성비, doughnut: 복잡한 구성비
- 최소 3개 이상의 데이터 포인트
- 시각화할 수치 데이터가 없으면 빈 배열 []로 설정`;

const chartExamplesText = `### 예산_배분_파이:
{"type":"pie","title":"사업별 예산 배분","data":{"labels":["인프라","교육","복지","환경","기타"],"datasets":[{"label":"예산비율(%)","data":[35,25,20,15,5]}]},"description":"인프라 구축에 가장 많은 예산 배정"}

### 연도별_추이_라인:
{"type":"line","title":"연도별 추이","data":{"labels":["2021년","2022년","2023년","2024년","2025년"],"datasets":[{"label":"실적(%)","data":[65,68,72,75,78]}]},"description":"지속적 상승 추세"}

### 항목별_비교_바:
{"type":"bar","title":"부서별 성과 비교","data":{"labels":["부서A","부서B","부서C","부서D"],"datasets":[{"label":"성과점수","data":[85,72,91,68]}]},"description":"부서별 성과 현황"}`;

// ─── 프롬프트 생성 ────────────────────────────────────────────────────────────
function createPrompt(options: { report_type: string; template_name: string; length: string }, title: string, keyContent?: string) {
  const selectedTypeGuideline = reportTypeGuidelines[options.report_type] || reportTypeGuidelines['기타 보고서'];
  const selectedLengthGuideline = lengthGuidelines[options.length] || lengthGuidelines['상세'];

  let sectionStructureArray: string[] = [];
  try {
    sectionStructureArray = sectionStructures[options.report_type][options.template_name] || [];
  } catch {
    sectionStructureArray = ['제목', '개요', '내용', '결론'];
  }
  const sectionStructureText = sectionStructureArray.join(', ');

  const systemPrompt = `당신은 정부 및 지방자치단체의 공문서 작성에 특화된 전문 AI 비서입니다.
공적 문서에 적합한, 정확하고 간결하며 객관적인 보고서를 JSON 형식으로 생성합니다.

## 보고서 작성 원칙
1. 반드시 개조식 문체만 사용할 것 (예: ~함, ~임, ~요함, ~필요함)
2. 서술형 문장(~합니다, ~됩니다, ~입니다) 절대 사용 금지
3. 문장은 간결하고 명확하게 핵심만 전달할 것
4. 객관적 사실과 데이터 중심으로 작성할 것
5. 논리적 구조와 일관성을 유지할 것
6. 행정용어와 전문용어를 적절히 활용할 것

## 2차 불릿(하위 항목) 작성 규칙 (필수!)
- 각 주요 항목마다 반드시 3-5개의 하위 항목을 포함할 것
- 하위 항목은 반드시 "SUB:" 접두사로 시작할 것
- 주요 항목 형식: "**(키워드)** 내용 설명"
- 하위 항목 형식: "SUB:구체적 세부사항"

## 테이블 작성 규칙
- 데이터 비교, 일정, 예산, 성과 등은 반드시 테이블로 표현할 것
- 각 섹션마다 최소 1개의 테이블을 포함할 것

${chartGuidelines}

${administrativeTerms}`;

  const userPrompt = `## 보고서 작성 요청
정부/지자체 공식 '${options.report_type}'의 '${options.template_name}' 형식으로 작성 요청

## 입력된 내용
- 제목: ${title}
${keyContent ? `- 핵심 내용 (반드시 보고서에 반영할 것): ${keyContent}` : ''}

## 보고서 유형별 특화 지침
${selectedTypeGuideline}

## 보고서 섹션 구조
보고서는 반드시 다음 섹션 순서로 구성할 것: ${sectionStructureText}

## 보고서 길이 요구사항
${selectedLengthGuideline}

## 차트 데이터 예시 참고
${chartExamplesText}

## 중요: 응답 형식
- 반드시 유효한 JSON 형식으로만 응답할 것
- 마크다운 코드 블록 사용 금지
- 추가 설명이나 텍스트 없이 순수 JSON만 반환

## JSON 구조 예시:
{
  "title": "${title}",
  "type": "${options.report_type}",
  "detailType": "${options.template_name}",
  "summary": "보고서 전체 내용을 2-3줄로 요약한 핵심 내용",
  "sections": [
    {
      "title": "배경",
      "order": 1,
      "content": [
        "**(사회적 요구)** 급변하는 사회적 요구에 대한 체계적 대응 필요",
        "SUB:디지털 전환 가속화에 따른 업무 방식 변화",
        "SUB:시민 서비스 품질 향상에 대한 기대 증대"
      ],
      "tables": [
        {
          "title": "정책 환경 변화",
          "headers": ["구분", "기존", "변화", "대응방안"],
          "rows": [["사회적 요구", "단순 민원", "복합 서비스", "통합 대응"]]
        }
      ],
      "charts": [
        {
          "type": "bar",
          "title": "환경 변화 현황",
          "data": {"labels": ["A","B","C"], "datasets": [{"label": "변화 정도(%)", "data": [85,90,75]}]},
          "description": "환경 변화 추이"
        }
      ]
    }
  ],
  "metadata": {
    "generatedAt": "${new Date().toISOString()}",
    "totalSections": ${sectionStructureArray.length},
    "estimatedReadTime": "약 5분",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  }
}

## 작성 요구사항 (반드시 준수)
1. 위 JSON 형식으로만 출력 (코드 블록 없이)
2. 모든 내용은 개조식(~함, ~임, ~필요함 등)으로만 작성
3. 각 섹션의 content는 배열로 구성하고, 주요 항목 뒤에는 반드시 "SUB:" 하위 항목 포함
4. 각 섹션마다 반드시 tables 배열에 최소 1개의 테이블 포함
5. 각 섹션마다 의미있는 차트 데이터가 있을 때만 charts 배열에 차트 포함
6. 현실적이고 구체적인 데이터 및 수치 포함
7. 섹션 순서는 위에 제시된 구조를 따를 것
8. 절대로 코드 블록이나 추가 설명 포함하지 말 것`;

  return { systemPrompt, userPrompt };
}

// ─── API 핸들러 ───────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      detailType,
      title,
      reportLength,
      keyContent,
      model = 'gemini-2.5-flash-lite',
    } = body;

    if (!reportType || !title) {
      return NextResponse.json({ error: '보고서 유형과 제목을 입력해주세요.' }, { status: 400 });
    }

    const lenBlock = rejectIfTooLong([
      { value: title, label: '제목', max: 200 },
      { value: keyContent, label: '핵심내용', max: 2000 },
    ]);
    if (lenBlock) return lenBlock;

    const piiBlock = rejectIfPii([title], '/api/work-support/report');
    if (piiBlock) return piiBlock;

    const koreanType = reportTypeMap[reportType] || reportType;
    const koreanDetail = detailTypeMap[detailType] || detailType;
    const koreanLength = lengthMap[reportLength] || '상세';

    const options = { report_type: koreanType, template_name: koreanDetail, length: koreanLength };
    const { systemPrompt, userPrompt } = createPrompt(options, title, keyContent);

    const isOpenAI = model.startsWith('gpt-');
    let reportData: object;

    if (isOpenAI) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'OpenAI API 키가 설정되지 않았습니다.' }, { status: 500 });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'developer', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_completion_tokens: 16000,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[OpenAI error]', err);
        return NextResponse.json({ error: 'OpenAI API 호출 실패' }, { status: 502 });
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      reportData = parseJsonResponse(text, title, koreanType, koreanDetail, model);
    } else {
      // Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });

      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: combinedPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.95, topK: 40 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error('[Gemini error]', err);
        return NextResponse.json({ error: 'Gemini API 호출 실패' }, { status: 502 });
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      reportData = parseJsonResponse(text, title, koreanType, koreanDetail, model);
    }

    void logAudit(request, { statusCode: 200 });
    return NextResponse.json({ report: reportData });
  } catch (error) {
    console.error('[report API error]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

function parseJsonResponse(
  text: string,
  title: string,
  type: string,
  detailType: string,
  model: string
): object {
  // JSON 코드블록 제거 후 파싱 시도
  let cleaned = text.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) cleaned = match[1].trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.metadata) {
      parsed.metadata = { generatedAt: new Date().toISOString() };
    } else {
      parsed.metadata.generatedAt = parsed.metadata.generatedAt || new Date().toISOString();
    }
    return parsed;
  } catch {
    console.error('[report] JSON parse failed, raw length:', text.length);
    return {
      title,
      type,
      detailType,
      summary: '보고서 생성 중 파싱 오류가 발생했습니다.',
      sections: [],
      metadata: { generatedAt: new Date().toISOString(), model, status: 'fallback' },
    };
  }
}
