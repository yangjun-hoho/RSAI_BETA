import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

const PROTECTED = ['/board', '/my', '/api/board', '/api/my'];
const ADMIN_ONLY = ['/admin', '/api/admin'];

// Rate Limiting — IP당 1분에 최대 30회 (AI API 경로 대상)
const RATE_LIMIT_PATHS = ['/api/chat', '/api/work-support/', '/api/rag/query'];
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// 5분마다 만료된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { limited: entry.count > MAX_REQUESTS, remaining, resetAt: entry.resetAt };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate Limiting — AI API 경로에만 적용
  const isRateLimited = RATE_LIMIT_PATHS.some(p => pathname.startsWith(p));
  if (isRateLimited) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const { limited, remaining, resetAt } = checkRateLimit(ip);

    if (limited) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        }
      );
    }

    // 정상 요청에도 Rate Limit 헤더 포함
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
    // Rate Limit 통과 후 인증 검사는 아래 로직에서 계속 진행
  }

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
  matcher: [
    '/board/:path*', '/my/:path*',
    '/api/board/:path*', '/api/my/:path*',
    '/admin/:path*', '/api/admin/:path*',
    '/api/chat/:path*', '/api/work-support/:path*', '/api/rag/query/:path*',
  ],
};
