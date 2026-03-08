import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/rag/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/rag/admin/settings
export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });

  const settings = ragDb.getAllSettings();
  return NextResponse.json({ settings });
}

// PUT /api/rag/admin/settings
export async function PUT(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });

  try {
    const body = await request.json();
    const { user_chatbot_max_docs, user_chatbot_max_file_mb } = body;

    if (user_chatbot_max_docs !== undefined) {
      const v = parseInt(user_chatbot_max_docs, 10);
      if (isNaN(v) || v < 1 || v > 100) {
        return NextResponse.json({ error: '문서 수 제한은 1~100 사이여야 합니다.' }, { status: 400 });
      }
      ragDb.setSetting('user_chatbot_max_docs', String(v));
    }

    if (user_chatbot_max_file_mb !== undefined) {
      const v = parseFloat(user_chatbot_max_file_mb);
      if (isNaN(v) || v < 1 || v > 500) {
        return NextResponse.json({ error: '파일 크기 제한은 1~500MB 사이여야 합니다.' }, { status: 400 });
      }
      ragDb.setSetting('user_chatbot_max_file_mb', String(v));
    }

    return NextResponse.json({ success: true, settings: ragDb.getAllSettings() });
  } catch {
    return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 });
  }
}
