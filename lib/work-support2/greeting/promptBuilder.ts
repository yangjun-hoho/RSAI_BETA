import { TemplateDefinition } from '@/types/work-support2';

const LENGTH_MAP: Record<string, string> = {
  '짧게 (1~2분)': '450~600자 (단락 2~3개)',
  '보통 (3~5분)': '900~1200자 (단락 4~5개)',
  '길게 (5~7분)': '1400~1800자 (단락 6~8개)',
};

export function buildSystemPrompt(def: TemplateDefinition): string {
  return `당신은 대한민국 지방자치단체 공무원의 공식 행사 말씀자료를 작성하는 전문가입니다.

사용 가능한 노드 타입: TITLE, PARAGRAPH

노드 구조 규칙:
- nodes[0]: 반드시 TITLE (정확히 1개) — 행사명 그대로 사용
- PARAGRAPH: 말씀 본문 단락
  - 첫 단락: '○ 안녕하십니까, 남양주시장 주광덕입니다.' 로 시작하고 청중 인사·감사 표현 포함
  - 중간 단락: 행사 의미, 추진 성과, 감사 인사, 기대 사항 등
  - 마지막 단락: 격려와 희망의 메시지로 마무리

content 품질 기준:
- 첫 단락: '○ '로 시작 (공백 포함)
- 이후 단락: '    '(공백 4개)로 시작하는 들여쓰기
- 존댓말과 공식적인 어체 사용
- 각 단락 3~4문장

TITLE content: 입력된 행사명을 그대로 사용

작성 지침:
${def.ai_instructions}

출력 형식 (엄격 준수):
- 반드시 JSON만 출력, 마크다운 코드블록 없음
- 모든 노드 형식: {"type":"...","content":"..."}

{"nodes":[{"type":"TITLE","content":"..."},{"type":"PARAGRAPH","content":"..."}]}`;
}

export function buildUserPrompt(formData: Record<string, unknown>): string {
  const eventTitle = formData.event_title as string || '';
  const speechType = formData.speech_type as string || '인사말';
  const audience = formData.audience as string || '';
  const coreContent = formData.core_content as string || '';
  const speechLength = formData.speech_length as string || '보통 (3~5분)';

  const lengthGuide = LENGTH_MAP[speechLength] || LENGTH_MAP['보통 (3~5분)'];

  return `행사명: ${eventTitle}
말씀 유형: ${speechType}
${audience ? `청중: ${audience}` : ''}
${coreContent ? `핵심 내용: ${coreContent}` : ''}
분량: ${lengthGuide}

위 조건에 맞는 ${speechType}을 작성해주세요. TITLE은 행사명(${eventTitle})을 그대로 사용하세요.`;
}
