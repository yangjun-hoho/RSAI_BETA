'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const services = [
  {
    id: 'report',
    title: '보고서 생성 v2',
    subtitle: '템플릿 기반 HWP 보고서 자동 작성',
    icon: '📄',
    path: '/work-support2/report',
    badge: '신규',
  },
];

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  '신규':  { background: '#f3e8ff', color: '#7c3aed' },
  '베타':  { background: '#dbeafe', color: '#1e40af' },
};

export default function WorkSupport2Page() {
  const router = useRouter();

  useEffect(() => {
    document.title = '업무 지원 2 | 남양주 AI';
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eef5 100%)', fontFamily: 'inherit', zIndex: 50 }}>
      {/* 헤더 */}
      <div style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>⚡ 업무 지원 2</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>새롭게 설계된 AI 업무 도구 모음</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem', fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          홈
        </button>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {services.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              style={{
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                height: '100px',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--focus-color)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {item.badge && (
                <span style={{
                  position: 'absolute', top: '0.5rem', right: '0.5rem',
                  fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem',
                  borderRadius: '4px', ...BADGE_STYLES[item.badge],
                }}>
                  {item.badge}
                </span>
              )}
              <span style={{ fontSize: '1.75rem', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
