import { DocumentNode, NodeType, TemplateDefinition } from '@/types/work-support2';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MEETING_TYPES: NodeType[] = ['TITLE', 'SUBTITLE', 'SECTION', 'BULLET', 'SUBBULLET', 'NOTE', 'COOPERATION'];

export function validateNodes(nodes: DocumentNode[], def: TemplateDefinition): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, errors: ['nodes 배열이 비어있습니다.'] };
  }

  if (nodes.length < 3 || nodes.length > 100) {
    errors.push(`노드 수(${nodes.length})가 허용 범위(3~100)를 벗어납니다.`);
  }

  if (nodes[0].type !== 'TITLE') {
    errors.push('첫 번째 노드는 반드시 TITLE이어야 합니다.');
  }

  nodes.forEach((node, i) => {
    if (!MEETING_TYPES.includes(node.type)) {
      errors.push(`노드[${i}]: 알 수 없는 타입 "${node.type}"`);
    }
    if (!node.content || typeof node.content !== 'string' || !node.content.trim()) {
      errors.push(`노드[${i}]: content가 없거나 빈 문자열입니다.`);
    }
  });

  // BULLET must have preceding SECTION
  let hasSection = false;
  nodes.forEach((node, i) => {
    if (node.type === 'SECTION') { hasSection = true; }
    if ((node.type === 'BULLET' || node.type === 'SUBBULLET') && !hasSection) {
      errors.push(`노드[${i}]: ${node.type} 앞에 SECTION이 없습니다.`);
    }
  });

  // Count checks using def.node_rules
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
