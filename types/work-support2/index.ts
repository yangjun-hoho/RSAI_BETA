export type NodeType = 'TITLE' | 'BACKGROUND' | 'SECTION' | 'SUBSECTION' | 'SUB_DETAIL' | 'BULLET' | 'TABLE' | 'PARAGRAPH' | 'FIELD' | 'SUMMARY' | 'DETAIL' | 'CONCLUSION';

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
  charPrIDRef: string;
  paraPrIDRef: string;
  styleIDRef: string;
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
