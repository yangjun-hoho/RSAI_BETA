import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rejectIfPii } from '@/lib/work-support2/security/piiFilter';
import { logAudit } from '@/lib/work-support2/security/auditLog';
import { rejectIfTooLong } from '@/lib/work-support2/security/inputValidation';
import { getDefinition } from '@/lib/work-support2/report/templateRegistry';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/work-support2/press-release/promptBuilder';
import { validateNodes } from '@/lib/work-support2/press-release/nodesValidator';
import { DocumentNode } from '@/types/work-support2';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_RETRIES = 3;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { templateId, formData } = body;

  const title = String(formData?.title || '');
  const coreContent = String(formData?.core_content || '');

  const piiCheck = rejectIfPii(title + ' ' + coreContent);
  if (piiCheck) return NextResponse.json({ error: piiCheck }, { status: 400 });

  const lenCheck = rejectIfTooLong(title, 200) || rejectIfTooLong(coreContent, 2000);
  if (lenCheck) return NextResponse.json({ error: lenCheck }, { status: 400 });

  await logAudit({ action: 'work-support2/press-release/generate', templateId, title });

  const def = getDefinition(templateId);
  const systemPrompt = buildSystemPrompt(def);
  const userPrompt = buildUserPrompt(formData);

  let lastError = '';
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const retryNote = attempt > 0 ? `\n\n이전 시도 오류: ${lastError}\n위 오류를 수정하여 다시 생성하세요.` : '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        temperature: 0.7,
        max_completion_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + retryNote },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

      let parsed: { nodes: DocumentNode[] };
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        lastError = 'JSON 파싱 실패';
        continue;
      }

      const validation = validateNodes(parsed.nodes, def);
      if (!validation.valid) {
        lastError = validation.errors.join(', ');
        continue;
      }

      return NextResponse.json({ nodes: parsed.nodes });
    } catch (e) {
      lastError = String(e);
    }
  }

  return NextResponse.json({ error: `보도자료 생성 실패 (${MAX_RETRIES}회 시도): ${lastError}` }, { status: 500 });
}
