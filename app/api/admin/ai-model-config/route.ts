import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/app-db/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = { openai: 'gpt-5.4-mini', google: 'gemini-2.5-flash-lite' };

export async function GET() {
  const row = getAppDb()
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .get('ai_model_config') as { value: string } | undefined;
  const config = row ? JSON.parse(row.value) : DEFAULT_CONFIG;
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  const { openai, google } = await request.json();
  getAppDb()
    .prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
    .run('ai_model_config', JSON.stringify({ openai, google }));
  return NextResponse.json({ success: true });
}
