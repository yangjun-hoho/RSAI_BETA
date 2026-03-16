import { SignJWT, jwtVerify } from 'jose';

if (!process.env.AUTH_SECRET) {
  throw new Error('[session.ts] AUTH_SECRET 환경변수가 설정되지 않았습니다. .env 파일에 AUTH_SECRET을 추가하세요.');
}

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

const COOKIE_NAME = 'ares-session';
const EXPIRY = '7d';

export interface SessionPayload {
  userId: number;
  nickname: string;
  role: 'user' | 'admin';
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
