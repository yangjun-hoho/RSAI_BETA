import { NextRequest } from 'next/server';
import { getAppDb } from '@/lib/app-db/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

interface AuditOptions {
  statusCode: number;
}

export async function logAudit(req: NextRequest, opts: AuditOptions) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';

    const db = getAppDb();
    db.prepare(`
      INSERT INTO audit_logs (user_id, nickname, ip, method, path, status_code, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session?.userId ?? null,
      session?.nickname ?? null,
      ip,
      req.method,
      req.nextUrl.pathname,
      opts.statusCode,
      req.headers.get('user-agent') ?? null,
    );
  } catch {
    // 로그 기록 실패는 본 요청에 영향 없음
  }
}
