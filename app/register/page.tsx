'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = '회원가입 | 남양주 AI'; }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push('/');
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
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#37352f', margin: '0 0 0.25rem 0' }}>회원가입</h1>
          <p style={{ color: '#9b9a97', fontSize: '0.85rem', margin: 0 }}>별칭과 비밀번호만으로 간편하게</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#37352f', marginBottom: '0.4rem' }}>별칭 <span style={{ color: '#9b9a97', fontWeight: 400 }}>(2~20자)</span></label>
            <input
              type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="사용할 별칭을 입력하세요" required autoFocus maxLength={20}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#37352f', marginBottom: '0.4rem' }}>비밀번호 <span style={{ color: '#9b9a97', fontWeight: 400 }}>(4자 이상)</span></label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요" required
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#37352f', marginBottom: '0.4rem' }}>비밀번호 확인</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요" required
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
            {loading ? '가입 중...' : '가입하기'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.83rem', color: '#9b9a97' }}>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" style={{ color: '#2383e2', fontWeight: 600, textDecoration: 'none' }}>로그인</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
