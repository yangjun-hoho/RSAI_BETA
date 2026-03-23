import { DocumentNode, TemplateDefinition } from '@/types/work-support2';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ALLOWED = ['FIELD', 'SUMMARY', 'DETAIL', 'BULLET', 'CONCLUSION'];
const REQUIRED_ORDER = ['FIELD', 'SUMMARY', 'DETAIL', 'BULLET', 'CONCLUSION'];

export function validateNodes(nodes: DocumentNode[], def: TemplateDefinition): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, errors: ['nodes 배열이 비어있습니다.'] };
  }

  nodes.forEach((node, i) => {
    if (!ALLOWED.includes(node.type)) {
      errors.push(`노드[${i}]: 허용되지 않는 타입 "${node.type}". 허용: ${ALLOWED.join(', ')}`);
    }
    if (!node.content || typeof node.content !== 'string' || !node.content.trim()) {
      errors.push(`노드[${i}]: content가 없거나 빈 문자열입니다.`);
    }
  });

  // FIELD must be first
  if (nodes[0]?.type !== 'FIELD') {
    errors.push('첫 번째 노드는 반드시 FIELD여야 합니다.');
  }

  // CONCLUSION must be last
  if (nodes[nodes.length - 1]?.type !== 'CONCLUSION') {
    errors.push('마지막 노드는 반드시 CONCLUSION이어야 합니다.');
  }

  // Count checks
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

  // FIELD content format check
  const fieldNode = nodes.find(n => n.type === 'FIELD');
  if (fieldNode && !fieldNode.content.startsWith('■')) {
    errors.push('FIELD content는 "■ 공적조서 분야 :" 로 시작해야 합니다.');
  }

  void REQUIRED_ORDER; // suppress unused warning
  return { valid: errors.length === 0, errors };
}
