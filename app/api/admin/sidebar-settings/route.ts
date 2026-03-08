import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/app-db/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

// GET - 비로그인 포함 누구나 조회 가능 (사이드바 렌더링용)
export async function GET() {
  const row = getAppDb()
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .get('sidebar_settings') as { value: string } | undefined;
  const settings = row ? JSON.parse(row.value) : {};
  return NextResponse.json({ settings });
}

// PUT - 관리자 전용
export async function PUT(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  const { settings } = await request.json();
  getAppDb()
    .prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
    .run('sidebar_settings', JSON.stringify(settings));
  return NextResponse.json({ success: true });
}
