import { getAppDb } from './db';

export interface UserSettings {
  user_id: number;
  preferred_model: string;
  theme: string;
  updated_at: string;
}

export function getSettings(userId: number): UserSettings | null {
  const db = getAppDb();
  // 유저가 실제로 존재하는지 확인 (삭제된 유저의 세션 쿠키 대비)
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  db.prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`).run(userId);
  return db.prepare(`SELECT * FROM user_settings WHERE user_id = ?`).get(userId) as UserSettings;
}

export function updateSettings(userId: number, data: Partial<Pick<UserSettings, 'preferred_model' | 'theme'>>): UserSettings {
  const db = getAppDb();
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  db.prepare(`UPDATE user_settings SET ${fields}, updated_at = datetime('now') WHERE user_id = ?`).run(...values, userId);
  return getSettings(userId);
}
