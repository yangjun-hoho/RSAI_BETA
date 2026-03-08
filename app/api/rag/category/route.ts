import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/rag/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

// GET /api/rag/category?id=xxx
// 공용 카테고리: 누구나, 비공개 카테고리: 소유자만
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  const cat = ragDb.getCategoryById(id);
  if (!cat) return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });

  if (cat.is_public === 0) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session || session.userId !== cat.created_by) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
  }

  return NextResponse.json({ category: cat });
}
