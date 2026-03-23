import fs from 'fs';
import path from 'path';
import { TemplateDefinition, FormSchema, TemplateInfo } from '@/types/work-support2';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

export function getTemplateList(): TemplateInfo[] {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const dirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  return dirs.flatMap(id => {
    const defPath = path.join(TEMPLATES_DIR, id, 'definition.json');
    if (!fs.existsSync(defPath)) return [];
    const def = JSON.parse(fs.readFileSync(defPath, 'utf-8')) as TemplateDefinition;
    return [{ id: def.id, name: def.name, description: def.description }];
  });
}

export function getDefinition(templateId: string): TemplateDefinition {
  const defPath = path.join(TEMPLATES_DIR, templateId, 'definition.json');
  if (!fs.existsSync(defPath)) throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`);
  return JSON.parse(fs.readFileSync(defPath, 'utf-8'));
}

export function getFormSchema(templateId: string): FormSchema {
  const schemaPath = path.join(TEMPLATES_DIR, templateId, 'form_schema.json');
  if (!fs.existsSync(schemaPath)) throw new Error(`폼 스키마를 찾을 수 없습니다: ${templateId}`);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
}

export function getTemplatePath(templateId: string): string {
  const hwpxPath = path.join(TEMPLATES_DIR, templateId, 'template.hwpx');
  if (!fs.existsSync(hwpxPath)) throw new Error(`템플릿 파일을 찾을 수 없습니다: ${hwpxPath}`);
  return hwpxPath;
}
