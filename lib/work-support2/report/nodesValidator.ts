import { DocumentNode, NodeType, TemplateDefinition } from '@/types/work-support2';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNodes(nodes: DocumentNode[], def: TemplateDefinition): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, errors: ['nodes 배열이 비어있습니다.'] };
  }

  if (nodes.length < 3 || nodes.length > 100) {
    errors.push(`노드 수(${nodes.length})가 허용 범위(3~100)를 벗어납니다.`);
  }

  // First node must be TITLE
  if (nodes[0].type !== 'TITLE') {
    errors.push('첫 번째 노드는 반드시 TITLE이어야 합니다.');
  }

  // Unknown types
  const knownTypes: NodeType[] = ['TITLE', 'BACKGROUND', 'SECTION', 'SUBSECTION', 'SUB_DETAIL', 'BULLET', 'TABLE'];
  nodes.forEach((node, i) => {
    if (!knownTypes.includes(node.type)) {
      errors.push(`노드[${i}]: 알 수 없는 타입 "${node.type}"`);
    }
    if (node.type !== 'TABLE' && (!node.content || typeof node.content !== 'string')) {
      errors.push(`노드[${i}]: content가 없거나 문자열이 아닙니다.`);
    }
    if (node.type === 'TABLE') {
      const d = node.data;
      if (!d || !Array.isArray(d.headers) || d.headers.length === 0) {
        errors.push(`노드[${i}]: TABLE 노드에 유효한 headers가 필요합니다.`);
      }
      if (!d || !Array.isArray(d.rows) || d.rows.length === 0) {
        errors.push(`노드[${i}]: TABLE 노드에 유효한 rows가 필요합니다.`);
      }
    }
  });

  // SUBSECTION must have a preceding SECTION
  // SUB_DETAIL must have a preceding SUBSECTION
  let hasSection = false;
  let hasSubsection = false;
  nodes.forEach((node, i) => {
    if (node.type === 'SECTION') { hasSection = true; hasSubsection = false; }
    if (node.type === 'SUBSECTION') {
      if (!hasSection) errors.push(`노드[${i}]: SUBSECTION 앞에 SECTION이 없습니다.`);
      hasSubsection = true;
    }
    if (node.type === 'SUB_DETAIL') {
      if (!hasSubsection) errors.push(`노드[${i}]: SUB_DETAIL 앞에 SUBSECTION이 없습니다.`);
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
