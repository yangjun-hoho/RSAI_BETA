import { TemplateDefinition } from '@/types/work-support2';

export function buildSystemPrompt(def: TemplateDefinition): string {
  const allowedTypes = def.allowed_node_types.join(', ');

  const exampleBlock = def.example_output
    ? `\n출력 예시 (이 구조·분량을 기준으로 작성):
${JSON.stringify({ nodes: def.example_output }, null, 2)}\n`
    : '';

  return `당신은 한국 지방자치단체 공문서 전문가입니다. 남양주시 확대간부회의 자료를 작성합니다.

【핵심 원칙】
- A4 가로 1장 분량: 위 예시의 노드 수와 분량을 기준으로 작성
- 개요·배경 섹션: BULLET 2~3개 (간략)
- 세부계획·운영·현황 섹션: BULLET 4~5개 (충실)
- content 형식: 공무원 개조식 (명사·명사구로 끝맺음, 예: ~추진, ~운영, ~예정)
- content 길이: 위 예시의 BULLET 길이를 기준으로 (수치·일정·주체 포함 20~35자)
- 막연한 표현·중복·부연 설명 금지

사용 가능한 노드 타입: ${allowedTypes}

노드 구조:
- nodes[0]: TITLE (1개, 입력 제목 그대로)
- SUBTITLE: 15자 이내 핵심 한 줄 (있을 경우 TITLE 직후 1개)
- SECTION: 섹션명만, 기호 없이
- BULLET: 핵심 항목, 기호 없이
- SUBBULLET: 기호 없이 (전체 3개 이하)
- NOTE: 기호 없이 (전체 2개 이하)
- COOPERATION: 협조 요청 내용만 (1개, COOPERATION 앞에 SECTION 생성 금지)

content 금지:
- ■ ○ - ※ ◇ ▶ 등 기호 (렌더링 시 자동 추가)
- 제목 반복, 중복 정보
${exampleBlock}
작성 지침:
${def.ai_instructions}

출력 형식 (엄격 준수):
- JSON만 출력, 마크다운 코드블록 없음
{"nodes":[{"type":"...","content":"..."}]}`;
}

export function buildUserPrompt(formData: Record<string, unknown>): string {
  const title = formData.title as string || '';
  const subtitle = formData.subtitle as string || '';
  const dept = formData.dept as string || '';
  const coreContent = formData.core_content as string || '';
  const hasCooperation = formData.has_cooperation === true;

  let prompt = `부서명: ${dept}
보고 제목: ${title}`;

  if (subtitle) {
    prompt += `\n핵심 요약: ${subtitle}`;
  }

  prompt += `\n핵심 내용: ${coreContent}`;

  if (hasCooperation) {
    prompt += `\n\n협조사항: 포함 (COOPERATION 노드를 마지막에 1개 추가)`;
  }

  return prompt;
}
