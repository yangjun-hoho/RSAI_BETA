import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminAuth';
import { getAppDb } from '@/lib/app-db/db';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit    = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));
  const offset   = (page - 1) * limit;
  const path     = searchParams.get('path')     ?? '';
  const nickname = searchParams.get('nickname') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo   = searchParams.get('dateTo')   ?? '';

  const db = getAppDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (path)     { conditions.push(`path LIKE ?`);          params.push(`%${path}%`); }
  if (nickname) { conditions.push(`nickname LIKE ?`);       params.push(`%${nickname}%`); }
  if (dateFrom) { conditions.push(`created_at >= ?`);       params.push(dateFrom); }
  if (dateTo)   { conditions.push(`created_at <= ?`);       params.push(`${dateTo} 23:59:59`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${where}`).get(...params) as { c: number }).c;
  const rows  = db.prepare(`
    SELECT id, user_id, nickname, ip, method, path, status_code, user_agent, created_at
    FROM audit_logs ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // 경로별 집계 (상위 5개)
  const topPaths = db.prepare(`
    SELECT path, COUNT(*) as cnt FROM audit_logs ${where}
    GROUP BY path ORDER BY cnt DESC LIMIT 5
  `).all(...params) as { path: string; cnt: number }[];

  return NextResponse.json({ logs: rows, total, page, limit, topPaths });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const before = searchParams.get('before'); // 특정 날짜 이전 삭제

  const db = getAppDb();
  if (before) {
    const result = db.prepare(`DELETE FROM audit_logs WHERE created_at < ?`).run(before);
    return NextResponse.json({ deleted: result.changes });
  }

  // 전체 삭제
  const result = db.prepare(`DELETE FROM audit_logs`).run();
  return NextResponse.json({ deleted: result.changes });
}
