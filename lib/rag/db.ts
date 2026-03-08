import path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH  = path.join(DATA_DIR, 'rag.db');

// data 디렉토리 보장
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// WAL 모드: 동시 읽기 성능 향상
db.pragma('journal_mode = WAL');

// ── 테이블 생성 ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL,
    description TEXT,
    color       TEXT,
    created_by  INTEGER,
    is_public   INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id            TEXT PRIMARY KEY,
    category_id   TEXT NOT NULL REFERENCES categories(id),
    original_name TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    file_size     INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'pending',
    error_message TEXT,
    chunk_count   INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id          TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    chunk_text  TEXT NOT NULL,
    embedding   TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rag_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_category   ON chunks(category_id);
  CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
`);

// 기본 설정값 초기화
db.prepare("INSERT OR IGNORE INTO rag_settings (key, value) VALUES ('user_chatbot_max_docs', '5')").run();
db.prepare("INSERT OR IGNORE INTO rag_settings (key, value) VALUES ('user_chatbot_max_file_mb', '10')").run();

// 기존 DB 마이그레이션: 개인 챗봇 컬럼 추가
try { db.exec('ALTER TABLE categories ADD COLUMN created_by INTEGER'); } catch {}
try { db.exec('ALTER TABLE categories ADD COLUMN is_public INTEGER DEFAULT 1'); } catch {}
db.exec("UPDATE categories SET is_public = 1 WHERE is_public IS NULL");

// ── 타입 ────────────────────────────────────────────────
export interface DbDocument {
  id: string;
  category_id: string;
  original_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

export interface DbChunk {
  id: string;
  document_id: string;
  category_id: string;
  chunk_text: string;
  embedding: string; // JSON
  chunk_index: number;
}

// ── CRUD 헬퍼 ───────────────────────────────────────────
export const ragDb = {
  // 카테고리
  getCategories(): { id: string; name: string; icon: string; color: string; description: string; document_count: number; chunk_count: number }[] {
    return db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id AND d.status = 'done') AS document_count,
        (SELECT COUNT(*) FROM chunks   ch WHERE ch.category_id = c.id)                       AS chunk_count
      FROM categories c
      WHERE c.is_public = 1
      ORDER BY c.created_at
    `).all();
  },

  getCategoryById(id: string): { id: string; name: string; icon: string; color: string; description: string; created_by: number | null; is_public: number; document_count: number; chunk_count: number } | null {
    return db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id AND d.status = 'done') AS document_count,
        (SELECT COUNT(*) FROM chunks   ch WHERE ch.category_id = c.id) AS chunk_count
      FROM categories c WHERE c.id = ?
    `).get(id) as { id: string; name: string; icon: string; color: string; description: string; created_by: number | null; is_public: number; document_count: number; chunk_count: number } | null;
  },

  getUserCategory(userId: number): { id: string; name: string; icon: string; color: string; description: string; created_by: number | null; is_public: number; document_count: number; chunk_count: number } | null {
    return db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id AND d.status = 'done') AS document_count,
        (SELECT COUNT(*) FROM chunks   ch WHERE ch.category_id = c.id) AS chunk_count
      FROM categories c
      WHERE c.created_by = ? AND c.is_public = 0
      LIMIT 1
    `).get(userId) as { id: string; name: string; icon: string; color: string; description: string; created_by: number | null; is_public: number; document_count: number; chunk_count: number } | null;
  },

  createCategory(cat: { name: string; icon: string; color: string; description: string; created_by?: number | null; is_public?: number }): { id: string; name: string; icon: string; color: string; description: string } {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO categories (id, name, icon, description, color, created_by, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, cat.name, cat.icon, cat.description, cat.color, cat.created_by ?? null, cat.is_public ?? 1);
    return { id, name: cat.name, icon: cat.icon, color: cat.color, description: cat.description };
  },

  updateCategory(id: string, cat: { name: string; icon: string; color: string; description: string }): void {
    db.prepare(`
      UPDATE categories SET name = ?, icon = ?, description = ?, color = ? WHERE id = ?
    `).run(cat.name, cat.icon, cat.description, cat.color, id);
  },

  deleteCategory(id: string): void {
    const docCount = (db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE category_id = ?').get(id) as { cnt: number }).cnt;
    if (docCount > 0) throw new Error('문서를 먼저 삭제해주세요.');
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  forceDeleteCategory(id: string): void {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  // 문서
  createDocument(doc: Omit<DbDocument, 'chunk_count' | 'created_at' | 'error_message'>): void {
    db.prepare(`
      INSERT INTO documents (id, category_id, original_name, file_path, file_size, status)
      VALUES (@id, @category_id, @original_name, @file_path, @file_size, @status)
    `).run(doc);
  },

  updateDocumentStatus(id: string, status: DbDocument['status'], chunkCount?: number, errorMessage?: string): void {
    db.prepare(`
      UPDATE documents SET status = ?, chunk_count = COALESCE(?, chunk_count), error_message = ? WHERE id = ?
    `).run(status, chunkCount ?? null, errorMessage ?? null, id);
  },

  getDocuments(categoryId: string): DbDocument[] {
    return db.prepare(`
      SELECT * FROM documents WHERE category_id = ? ORDER BY created_at DESC
    `).all(categoryId) as DbDocument[];
  },

  getDocument(id: string): DbDocument | undefined {
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DbDocument | undefined;
  },

  deleteDocument(id: string): void {
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  },

  // 청크
  insertChunks(chunks: Omit<DbChunk, never>[]): void {
    const stmt = db.prepare(`
      INSERT INTO chunks (id, document_id, category_id, chunk_text, embedding, chunk_index)
      VALUES (@id, @document_id, @category_id, @chunk_text, @embedding, @chunk_index)
    `);
    const tx = db.transaction((rows: typeof chunks) => { for (const r of rows) stmt.run(r); });
    tx(chunks);
  },

  getChunks(categoryId: string): { id: string; document_id: string; chunk_text: string; embedding: string; original_name: string }[] {
    return db.prepare(`
      SELECT ch.id, ch.document_id, ch.chunk_text, ch.embedding, d.original_name
      FROM chunks ch
      JOIN documents d ON d.id = ch.document_id
      WHERE ch.category_id = ?
    `).all(categoryId);
  },

  deleteChunksByDocument(documentId: string): void {
    db.prepare('DELETE FROM chunks WHERE document_id = ?').run(documentId);
  },

  // 설정
  getSetting(key: string): string | null {
    const row = db.prepare('SELECT value FROM rag_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  setSetting(key: string, value: string): void {
    db.prepare('INSERT OR REPLACE INTO rag_settings (key, value) VALUES (?, ?)').run(key, value);
  },

  getAllSettings(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM rag_settings').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },
};

export default db;
