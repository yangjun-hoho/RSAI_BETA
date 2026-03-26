import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getDefinition, getTemplatePath } from '@/lib/work-support2/report/templateRegistry';
import { MeetingHWPXRenderer } from '@/lib/work-support2/meeting/hwpxRenderer';
import { DocumentNode } from '@/types/work-support2';

export async function POST(req: NextRequest) {
  try {
    const {
      templateId,
      nodes,
      formData,
    }: { templateId: string; nodes: DocumentNode[]; formData: Record<string, unknown> } = await req.json();

    const def = getDefinition(templateId);
    const templatePath = getTemplatePath(templateId);
    const templateBuffer = fs.readFileSync(templatePath);

    const renderer = new MeetingHWPXRenderer();
    const outputBuffer = await renderer.render(templateBuffer, nodes, def, formData);

    const templateName = def.name || '회의자료';
    const fileName = encodeURIComponent(`확대간부회의_${templateName}.hwpx`);

    return new NextResponse(outputBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/hwp+zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
