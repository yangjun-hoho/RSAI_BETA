import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');

let _db: Database.Database | null = null;

export function getAppDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initTables(_db);
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname   TEXT    UNIQUE NOT NULL,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'user',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_model TEXT    NOT NULL DEFAULT 'gpt-4o-mini',
      theme           TEXT    NOT NULL DEFAULT 'light',
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      views      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author     TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      is_ai      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pii_patterns (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT    NOT NULL,
      regex      TEXT    NOT NULL,
      hint       TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pii_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT    NOT NULL,
      path         TEXT    NOT NULL,
      detected_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  // 기존 테이블에 컬럼 추가 (이미 있으면 무시)
  try { db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`); } catch { /* 이미 존재 */ }
  try { db.exec(`ALTER TABLE posts ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`); } catch { /* 이미 존재 */ }
  try { db.exec(`ALTER TABLE posts ADD COLUMN ai_commented INTEGER NOT NULL DEFAULT 0`); } catch { /* 이미 존재 */ }

  // admin 계정 자동 생성/갱신 (.env의 ADMIN_NICKNAME, ADMIN_PASSWORD)
  const adminNickname = process.env.ADMIN_NICKNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminNickname && adminPassword) {
    const existing = db.prepare(`SELECT id FROM users WHERE nickname = ?`).get(adminNickname) as { id: number } | undefined;
    const hashed = bcrypt.hashSync(adminPassword, 10);
    if (existing) {
      db.prepare(`UPDATE users SET password = ?, role = 'admin', is_active = 1 WHERE id = ?`).run(hashed, existing.id);
    } else {
      const newUser = db.prepare(`INSERT INTO users (nickname, password, role) VALUES (?, ?, 'admin') RETURNING id`).get(adminNickname, hashed) as { id: number };
      db.prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`).run(newUser.id);
    }
  }

  // 기본 PII 패턴 시드 (비어있을 때만)
  const count = (db.prepare(`SELECT COUNT(*) as c FROM pii_patterns`).get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(`INSERT INTO pii_patterns (type, regex, hint) VALUES (?, ?, ?)`);
    const seedMany = db.transaction(() => {
      insert.run('주민등록번호', '\\d{6}-[1-4]\\d{6}', '숫자 패턴이 주민번호와 유사합니다. 관리번호라면 앞에 문자를 붙여 구분해 주세요 (예: 관리번호: 880101-A)');
      insert.run('주민등록번호', '(?<!\\d)\\d{6}[1-4]\\d{6}(?!\\d)', '숫자 패턴이 주민번호와 유사합니다. 관리번호라면 앞에 문자를 붙여 구분해 주세요');
      insert.run('휴대전화번호', '01[016789]-?\\d{3,4}-?\\d{4}', '전화번호 형식이 감지됐습니다. 부서명과 함께 "스마트도시과 대표: 031-0000" 처럼 입력해 주세요');
      insert.run('일반전화번호', '0\\d{1,2}-\\d{3,4}-\\d{4}', '전화번호 형식이 감지됐습니다. 번호 앞에 용도를 표기해 주세요 (예: 대표전화: 02-...)');
      insert.run('계좌번호', '\\d{3,4}-\\d{2,6}-\\d{4,8}', '계좌번호 형식이 감지됐습니다. 예산코드라면 "예산코드 110-300" 형식으로 구분해 주세요');
      insert.run('이메일 주소', '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', '이메일 주소가 포함되어 있습니다. 이메일 대신 "담당자 홍길동 주무관"처럼 이름으로 표기해 주세요');
    });
    seedMany();
  }
}
