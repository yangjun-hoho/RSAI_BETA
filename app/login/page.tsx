'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/';

  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = '로그인 | 남양주 AI'; }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(from);
      router.refresh();
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#37352f', margin: '0 0 0.25rem 0' }}>로그인</h1>
          <p style={{ color: '#9b9a97', fontSize: '0.85rem', margin: 0 }}>남양주 AI에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#37352f', marginBottom: '0.4rem' }}>별칭</label>
            <input
              type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="별칭을 입력하세요" required autoFocus
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#37352f', marginBottom: '0.4rem' }}>비밀번호</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요" required
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ padding: '0.6rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.83rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.7rem', background: '#37352f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.83rem', color: '#9b9a97' }}>
            계정이 없으신가요?{' '}
            <Link href="/register" style={{ color: '#2383e2', fontWeight: 600, textDecoration: 'none' }}>회원가입</Link>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.8rem', color: '#9b9a97', textDecoration: 'none' }}>← 메인으로</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
