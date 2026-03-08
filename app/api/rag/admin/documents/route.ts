import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { ragDb } from '@/lib/rag/db';
import { invalidateCache } from '@/lib/rag/vectorCache';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

// GET /api/rag/admin/documents?categoryId=xxx
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  if (!categoryId) return NextResponse.json({ error: 'categoryId 필요' }, { status: 400 });

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const cat = ragDb.getCategoryById(categoryId);

  // 공용 카테고리는 비로그인 포함 누구나 문서 목록 조회 가능
  if (cat?.is_public === 1) {
    try {
      const documents = ragDb.getDocuments(categoryId);
      return NextResponse.json({ documents });
    } catch (error) {
      console.error('[rag/documents GET]', error);
      return NextResponse.json({ error: '문서 조회 실패' }, { status: 500 });
    }
  }

  // 비공개 카테고리: 로그인 필요
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  if (session.role !== 'admin') {
    if (!cat || cat.created_by !== session.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
  }

  try {
    const documents = ragDb.getDocuments(categoryId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('[rag/documents GET]', error);
    return NextResponse.json({ error: '문서 조회 실패' }, { status: 500 });
  }
}

// DELETE /api/rag/admin/documents?id=xxx
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

  try {
    const doc = ragDb.getDocument(id);
    if (!doc) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });

    // 관리자가 아닌 경우 해당 카테고리의 소유자인지 확인
    if (session.role !== 'admin') {
      const cat = ragDb.getCategoryById(doc.category_id);
      if (!cat || cat.created_by !== session.userId || cat.is_public !== 0) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 원본 파일 삭제
    if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);

    // DB 삭제 (chunks는 CASCADE 삭제)
    ragDb.deleteDocument(id);

    // 벡터 캐시 무효화
    invalidateCache(doc.category_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[rag/documents DELETE]', error);
    return NextResponse.json({ error: '문서 삭제 실패' }, { status: 500 });
  }
}
