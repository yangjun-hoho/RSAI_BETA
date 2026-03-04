'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Me { id: number; nickname: string; role: string; }
interface Settings { preferred_model: string; theme: string; }

const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI)' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.0 Flash Lite (Google)' },
];

export default function MyPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings>({ preferred_model: 'gpt-4o-mini', theme: 'light' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '나의 메뉴 | 남양주 AI';
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/my/settings').then(r => r.json()),
    ]).then(([meData, settingsData]) => {
      if (!meData.user) { router.push('/login?from=/my'); return; }
      setMe(meData.user);
      if (!settingsData.error) setSettings(settingsData);
      setLoading(false);
    });
  }, [router]);

  async function handleSave() {
    const res = await fetch('/api/my/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf9f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#9b9a97' }}>불러오는 중...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f5' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e9e9e7', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.85rem', color: '#9b9a97', textDecoration: 'none' }}>← 메인</Link>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#37352f' }}>👤 나의 메뉴</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: '0.82rem', color: '#9b9a97', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* 프로필 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: '1px solid #e9e9e7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#37352f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0 }}>
            {me?.nickname[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#37352f', fontSize: '1rem' }}>{me?.nickname}</div>
            <div style={{ fontSize: '0.78rem', color: '#9b9a97', marginTop: '0.15rem' }}>{me?.role === 'admin' ? '관리자' : '일반 사용자'}</div>
          </div>
        </div>

        {/* 개인 설정 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: '1px solid #e9e9e7' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#37352f', margin: '0 0 1.25rem 0' }}>개인 설정</h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>기본 AI 모델</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MODELS.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `1px solid ${settings.preferred_model === m.id ? '#37352f' : '#e0e0e0'}`, background: settings.preferred_model === m.id ? '#f7f6f3' : 'white' }}>
                  <input type="radio" name="model" value={m.id} checked={settings.preferred_model === m.id} onChange={() => setSettings(s => ({ ...s, preferred_model: m.id }))} style={{ accentColor: '#37352f' }} />
                  <span style={{ fontSize: '0.875rem', color: '#37352f' }}>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleSave}
            style={{ width: '100%', padding: '0.65rem', background: saved ? '#16a34a' : '#37352f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '✓ 저장됨' : '설정 저장'}
          </button>
        </div>

        {/* 바로가기 */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <Link href="/board" style={{ flex: 1, padding: '0.75rem', background: 'white', border: '1px solid #e9e9e7', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem', color: '#37352f', fontWeight: 600 }}>
            📋 자유게시판
          </Link>
          <Link href="/" style={{ flex: 1, padding: '0.75rem', background: 'white', border: '1px solid #e9e9e7', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem', color: '#37352f', fontWeight: 600 }}>
            💬 메인 채팅
          </Link>
        </div>
      </div>
    </div>
  );
}
