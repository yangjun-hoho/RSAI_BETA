export type NodeType = 'TITLE' | 'BACKGROUND' | 'SECTION' | 'SUBSECTION' | 'SUB_DETAIL' | 'BULLET' | 'TABLE' | 'PARAGRAPH' | 'FIELD' | 'SUMMARY' | 'DETAIL' | 'CONCLUSION' | 'SUBTITLE' | 'SUBBULLET' | 'NOTE' | 'COOPERATION' | 'IMAGE_SLOT';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface DocumentNode {
  type: NodeType;
  content: string;
  data?: TableData;
}

export interface NodeRule {
  required: boolean;
  min: number;
  max: number;
}

export interface StyleDef {
  paraPrIDRef: string;
  charPrIDRef: string;   // ■ 기호 또는 단일 run용
  charPrIDRef2?: string; // 섹션 텍스트 / 협조사항 레이블용
  charPrIDRef3?: string; // 협조사항 내용 텍스트용
  styleIDRef?: string;
  horzsize?: string;
  vertsize?: string;
  spacing?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  allowed_node_types: NodeType[];
  node_rules: Record<string, NodeRule>;
  style_map: Record<string, StyleDef | string>;
  anchor_id: string;
  anchor_strategy?: string;
  ai_instructions: string;
  // meeting 템플릿 전용
  header_dept_charPr?: string;
  header_docnum_charPr?: string;
  header_title_paraPr?: string;
  header_title_charPr?: string;
  header_subtitle_present?: boolean;
  header_subtitle_charPr?: string;
  header_section1_charPr?: string;  // 헤더 안에 내장된 첫 번째 SECTION 텍스트 run (행사1형 등)
  example_output?: { type: string; content: string }[];  // few-shot 예시 노드
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'toggle' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: boolean | string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

export interface GenerateRequest {
  templateId: string;
  formData: Record<string, unknown>;
}

export interface GenerateResponse {
  nodes: DocumentNode[];
}

export interface RenderRequest {
  templateId: string;
  nodes: DocumentNode[];
}
