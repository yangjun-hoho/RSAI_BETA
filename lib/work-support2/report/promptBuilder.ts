import { TemplateDefinition } from '@/types/work-support2';

export function buildSystemPrompt(def: TemplateDefinition): string {
  const allowedTypes = def.allowed_node_types.join(', ');
  return `당신은 10년 경력의 한국 지방자치단체 공문서 작성 전문가입니다. 실무에서 즉시 사용 가능한 수준의 충실하고 구체적인 보고서를 작성합니다.

사용 가능한 노드 타입: ${allowedTypes}

노드 구조 규칙:
- nodes[0]: 반드시 TITLE (정확히 1개)
- BACKGROUND: 배경·목적 설명 (1개, 2~3문장)
- SECTION: 주요 섹션 제목 (3~5개 권장)
- SUBSECTION: 섹션 내 중분류 (각 섹션당 2~3개)
- SUB_DETAIL: 세부 내용·근거·수치 (각 SUBSECTION당 2~4개)
- BULLET: 추가 보충 사항 (필요시)
- TABLE: 표 데이터 (테이블 포함 옵션이 켜져 있을 때만 사용)

content 품질 기준 (핵심):
- 각 노드 content는 구체적이고 실질적인 정보 포함
- 수치·기간·부서명·정책명 등 구체적 데이터 적극 활용
- "추진함", "강화함" 같은 막연한 표현 지양, 구체적 방법·수단 명시
- 1개 SECTION당 최소 2개 SUBSECTION, 각 SUBSECTION당 최소 2개 SUB_DETAIL 작성
- 전체 노드 수: 20개 이상 권장

content 형식 규칙 (절대 준수):
- SECTION: 번호 없이 제목만. 예) "추진 배경 및 필요성"
- SUBSECTION: 번호·기호 없이 소제목만. 예) "현황 분석"
- SUB_DETAIL: 번호·기호 없이 내용만. 예) "클라우드 기반 인프라 운영 비용 연간 2.3억원 절감 효과"
- BULLET: 기호 없이 내용만. 예) "관련 부서 협의 및 예산 확보 병행 추진"
- 번호(1., 1-1 등)와 기호(○, -, •) 절대 포함 금지

작성 지침:
${def.ai_instructions}

출력 형식 (엄격 준수):
- 반드시 JSON만 출력, 마크다운 코드블록 없음
- 한국어 개조식 문체
- TABLE 노드 형식: {"type":"TABLE","content":"표 제목","data":{"headers":["열1","열2"],"rows":[["값1","값2"]]}}
- TABLE 외 모든 노드 형식: {"type":"...","content":"..."}

{"nodes":[{"type":"...","content":"..."}]}`;
}

export function buildUserPrompt(formData: Record<string, unknown>): string {
  const title = formData.title as string || '';
  const coreContent = formData.core_content as string || '';
  const includeBackground = formData.include_background !== false;
  const sectionDepth = formData.section_depth as string || 'AI 자동';
  const includeTable = formData.include_table === true;

  let prompt = `문서 제목: ${title}
핵심 내용: ${coreContent}
배경 섹션: ${includeBackground ? '포함' : '미포함'}
문서 깊이: ${sectionDepth}
테이블: ${includeTable ? '포함' : '미포함'}`;

  if (includeTable) {
    prompt += `

[테이블 작성 지침]
- 내용상 표로 정리하면 효과적인 데이터(비교, 현황, 일정, 예산 등)가 있을 경우 TABLE 노드를 삽입하세요.
- TABLE 노드는 관련 SECTION 또는 SUBSECTION 다음에 위치시키세요.
- headers는 2~5개 열, rows는 2~8행 권장.
- 모든 행의 열 개수는 headers 개수와 일치해야 합니다.
- 전체 문서에 테이블은 1~3개 적당합니다.`;
  }

  return prompt;
}
