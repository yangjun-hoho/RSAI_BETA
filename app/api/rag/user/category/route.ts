import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { ragDb } from '@/lib/rag/db';
import { invalidateCache } from '@/lib/rag/vectorCache';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

async function getSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? await verifySession(token) : null;
}

// GET - 내 챗봇 조회 (비로그인 시 null 반환)
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ category: null });
  const cat = ragDb.getUserCategory(session.userId);
  return NextResponse.json({ category: cat ?? null });
}

// POST - 내 챗봇 생성 (1개 제한)
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const existing = ragDb.getUserCategory(session.userId);
  if (existing) return NextResponse.json({ error: '이미 챗봇이 있습니다.' }, { status: 409 });

  try {
    const { name, icon, color, description } = await request.json() as {
      name: string; icon: string; color: string; description: string;
    };
    if (!name?.trim() || !icon?.trim() || !color?.trim()) {
      return NextResponse.json({ error: '이름, 아이콘, 색상은 필수입니다.' }, { status: 400 });
    }
    const category = ragDb.createCategory({
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      description: (description ?? '').trim(),
      created_by: session.userId,
      is_public: 0,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('[rag/user/category POST]', error);
    return NextResponse.json({ error: '생성 실패' }, { status: 500 });
  }
}

// PUT - 내 챗봇 수정
export async function PUT(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const cat = ragDb.getUserCategory(session.userId);
  if (!cat) return NextResponse.json({ error: '챗봇이 없습니다.' }, { status: 404 });

  try {
    const { name, icon, color, description } = await request.json() as {
      name: string; icon: string; color: string; description: string;
    };
    if (!name?.trim() || !icon?.trim() || !color?.trim()) {
      return NextResponse.json({ error: '이름, 아이콘, 색상은 필수입니다.' }, { status: 400 });
    }
    ragDb.updateCategory(cat.id, {
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      description: (description ?? '').trim(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[rag/user/category PUT]', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}

// DELETE - 내 챗봇 삭제 (문서 파일 포함 전체 삭제)
export async function DELETE(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const cat = ragDb.getUserCategory(session.userId);
  if (!cat) return NextResponse.json({ error: '챗봇이 없습니다.' }, { status: 404 });

  try {
    const docs = ragDb.getDocuments(cat.id);
    for (const doc of docs) {
      if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
      ragDb.deleteDocument(doc.id);
    }
    invalidateCache(cat.id);
    ragDb.forceDeleteCategory(cat.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[rag/user/category DELETE]', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
