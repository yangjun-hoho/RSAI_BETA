import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getDefinition, getTemplatePath } from '@/lib/work-support2/report/templateRegistry';
import { HWPXRenderer } from '@/lib/work-support2/report/hwpxRenderer';
import { DocumentNode } from '@/types/work-support2';

export async function POST(req: NextRequest) {
  try {
    const { templateId, nodes }: { templateId: string; nodes: DocumentNode[] } = await req.json();

    const def = getDefinition(templateId);
    const templatePath = getTemplatePath(templateId);
    const templateBuffer = fs.readFileSync(templatePath);

    const renderer = new HWPXRenderer();
    const outputBuffer = await renderer.render(templateBuffer, nodes, def);

    return new NextResponse(outputBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/hwp+zip',
        'Content-Disposition': 'attachment; filename="press-release.hwpx"',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
