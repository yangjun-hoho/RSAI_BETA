export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox-group';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  rows?: number;
}

export interface TemplateConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  apiPath: string;
  fields: TemplateField[];
  streaming?: boolean;   // true이면 SSE 스트리밍 + 텍스트 출력 모드
}

export interface OutputSection {
  title: string;
  content: string;
}

export interface TemplateResult {
  sections: OutputSection[];
}
