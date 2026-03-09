import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

const PROTECTED = ['/board', '/my', '/api/board', '/api/my'];
const ADMIN_ONLY = ['/admin', '/api/admin'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAdmin = ADMIN_ONLY.some(p => pathname.startsWith(p));

  if (!isProtected && !isAdmin) return NextResponse.next();

  // /api/board GET 요청(목록·상세 읽기)은 비로그인도 허용
  if (isProtected && pathname.startsWith('/api/board') && req.method === 'GET') {
    return NextResponse.next();
  }

  // /api/admin/sidebar-settings GET은 누구나 허용 (사이드바 렌더링용)
  if (isAdmin && pathname === '/api/admin/sidebar-settings' && req.method === 'GET') {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && session.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/board/:path*', '/my/:path*', '/api/board/:path*', '/api/my/:path*', '/admin/:path*', '/api/admin/:path*'],
};
