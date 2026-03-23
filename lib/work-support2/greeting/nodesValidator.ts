import { DocumentNode, TemplateDefinition } from '@/types/work-support2';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNodes(nodes: DocumentNode[], def: TemplateDefinition): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, errors: ['nodes 배열이 비어있습니다.'] };
  }

  if (nodes[0].type !== 'TITLE') {
    errors.push('첫 번째 노드는 반드시 TITLE이어야 합니다.');
  }

  nodes.forEach((node, i) => {
    if (node.type !== 'TITLE' && node.type !== 'PARAGRAPH') {
      errors.push(`노드[${i}]: 인사말씀은 TITLE과 PARAGRAPH만 허용됩니다. (받은 타입: "${node.type}")`);
    }
    if (!node.content || typeof node.content !== 'string' || !node.content.trim()) {
      errors.push(`노드[${i}]: content가 없거나 빈 문자열입니다.`);
    }
  });

  const counts: Record<string, number> = {};
  nodes.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
  Object.entries(def.node_rules).forEach(([type, rule]) => {
    const count = counts[type] || 0;
    if (rule.required && count < rule.min) {
      errors.push(`${type} 노드가 필수입니다 (최소 ${rule.min}개).`);
    }
    if (count > rule.max) {
      errors.push(`${type} 노드가 허용 최대(${rule.max})를 초과합니다 (현재 ${count}개).`);
    }
  });

  return { valid: errors.length === 0, errors };
}
