import { TemplateDefinition } from '@/types/work-support2';

export function buildSystemPrompt(def: TemplateDefinition): string {
  return `당신은 남양주시 공식 공적조서 작성 전문가입니다. 입력된 정보를 바탕으로 공적조서를 정해진 JSON 구조로 출력합니다.

사용 가능한 노드 타입: FIELD, SUMMARY, DETAIL, BULLET, CONCLUSION

노드 구조 규칙 (순서 엄수):
1. FIELD (1개): "■ 공적조서 분야 : [분야명]" 형식
2. SUMMARY (1개): 개요 80자 내외. "상기인은 ~하여 ~에 기여하였음" 형식으로 마무리
3. DETAIL (1개): 사항 본문 200자 내외. 전반적인 공적 설명
4. BULLET (2~4개): "▢ " 로 시작하는 세부 성과 항목. 각 80자 내외
5. CONCLUSION (1개): 마무리 결론 문장. "상기인은 ~한 공적이 뚜렷함." 형식

작성 지침:
${def.ai_instructions}

출력 형식 (엄격 준수):
- 반드시 JSON만 출력, 마크다운 코드블록 없음
- 형식: {"nodes":[{"type":"FIELD","content":"..."},{"type":"SUMMARY","content":"..."},{"type":"DETAIL","content":"..."},{"type":"BULLET","content":"..."},{"type":"CONCLUSION","content":"..."}]}`;
}

export function buildUserPrompt(formData: Record<string, unknown>): string {
  const subjectType = formData.subject_type as string || '공무원';
  const field = formData.field as string || '';
  const coreContent = formData.core_content as string || '';
  const period = formData.period as string || '';

  const subjectGuide = subjectType === '공무원'
    ? '공무원 공적조서: "상기인은 공무원으로 임용되어 ~" 형식 사용, 직무 성실성·행정 기여 강조'
    : '일반인 공적조서: "상기인은 ~분야에서 ~하여" 형식 사용, 지역사회 기여·봉사 강조';

  return `구분: ${subjectType}
분야: ${field}
핵심 사항: ${coreContent}
${period ? `기간: ${period}` : ''}

[작성 지침]
${subjectGuide}
FIELD의 분야명은 입력된 분야(${field})를 그대로 사용하세요.`;
}
