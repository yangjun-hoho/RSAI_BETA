import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { getSettings, updateSettings } from '@/lib/app-db/settings';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  const settings = getSettings(session.userId);
  if (!settings) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const body = await req.json() as { preferred_model?: string; theme?: string };
  const updated = updateSettings(session.userId, body);
  return NextResponse.json(updated);
}
