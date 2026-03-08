import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/rag/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

async function requireAdmin(request: NextRequest): Promise<true | NextResponse> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  return true;
}

export async function GET() {
  try {
    const categories = ragDb.getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[rag/categories GET]', error);
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;
  try {
    const { name, icon, color, description } = await request.json() as {
      name: string;
      icon: string;
      color: string;
      description: string;
    };

    if (!name?.trim() || !icon?.trim() || !color?.trim()) {
      return NextResponse.json({ error: '이름, 아이콘, 색상은 필수입니다.' }, { status: 400 });
    }

    const category = ragDb.createCategory({
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      description: (description ?? '').trim(),
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('[rag/categories POST]', error);
    return NextResponse.json({ error: '카테고리 생성 실패' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;
  try {
    const { id, name, icon, color, description } = await request.json() as {
      id: string;
      name: string;
      icon: string;
      color: string;
      description: string;
    };

    if (!id || !name?.trim() || !icon?.trim() || !color?.trim()) {
      return NextResponse.json({ error: '이름, 아이콘, 색상은 필수입니다.' }, { status: 400 });
    }

    ragDb.updateCategory(id, {
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      description: (description ?? '').trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[rag/categories PUT]', error);
    return NextResponse.json({ error: '카테고리 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id 파라미터 필요' }, { status: 400 });
    }

    ragDb.deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '카테고리 삭제 실패';
    const status = msg.includes('문서를 먼저') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
