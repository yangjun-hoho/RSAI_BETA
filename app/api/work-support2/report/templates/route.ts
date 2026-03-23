import { NextRequest, NextResponse } from 'next/server';
import { getTemplateList, getFormSchema, getDefinition } from '@/lib/work-support2/report/templateRegistry';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const form_schema = getFormSchema(id);
      const definition = getDefinition(id);
      return NextResponse.json({ form_schema, definition });
    }

    const templates = getTemplateList();
    return NextResponse.json(templates);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
