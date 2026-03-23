import { TemplateDefinition } from '@/types/work-support2';

export function buildSystemPrompt(def: TemplateDefinition): string {
  return `당신은 10년 경력의 한국 지방자치단체 보도자료 작성 전문가입니다. 남양주시 공식 보도자료를 실무에서 즉시 사용 가능한 수준으로 작성합니다.

사용 가능한 노드 타입: TITLE, PARAGRAPH

노드 구조 규칙:
- nodes[0]: 반드시 TITLE (정확히 1개) — 보도자료 제목
- PARAGRAPH: 본문 단락 (3~7개)
  - 첫 단락(리드): '남양주시(시장 주광덕)는 ~했다/한다/밝혔다' 형식, 5W1H 포함
  - 중간 단락: 사업 내용, 추진 배경, 기대 효과, 담당자 인용구 등
  - 마지막 단락: '자세한 사항은 남양주시 ○○과 ○○팀(☎031-590-XXXX)로 문의하면 된다.' 로 마무리

content 품질 기준:
- 각 단락은 3~4문장으로 구성
- 구체적 수치, 사업명, 일정, 예산 등 실질적 정보 포함
- 공식적이고 명확한 문체 사용
- "추진함", "강화함" 같은 막연한 표현 지양

TITLE content 형식:
- "남양주시, [핵심 내용] [추진/실시/개최/발표]" 형식 권장
- 15~45자, 구체적 사업명 또는 수치 포함
- 제목이 이미 주어진 경우 그대로 사용

작성 지침:
${def.ai_instructions}

출력 형식 (엄격 준수):
- 반드시 JSON만 출력, 마크다운 코드블록 없음
- 모든 노드 형식: {"type":"...","content":"..."}

{"nodes":[{"type":"TITLE","content":"..."},{"type":"PARAGRAPH","content":"..."}]}`;
}

export function buildUserPrompt(formData: Record<string, unknown>): string {
  const title = formData.title as string || '';
  const coreContent = formData.core_content as string || '';
  const includeQuote = formData.include_quote !== false;
  const paragraphCount = formData.paragraph_count as string || 'AI 자동';

  let prompt = `보도자료 제목: ${title}
핵심 내용: ${coreContent}
담당자 인용구: ${includeQuote ? '포함 (중간 단락에 담당자 발언 1개 삽입)' : '미포함'}
단락 수: ${paragraphCount}`;

  if (paragraphCount !== 'AI 자동') {
    const count = parseInt(paragraphCount);
    prompt += `\n\n[단락 수 지침]\nPARAGRAPH 노드를 정확히 ${count}개 생성하세요.`;
  }

  return prompt;
}
