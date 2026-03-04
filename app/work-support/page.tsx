'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const services = [
  // 1행
  { id: 'report',             title: '보고서 생성',      subtitle: 'AI 보고서 자동 작성',          icon: '📊', path: '/work-support/report' },
  { id: 'greetings',          title: 'AI 인사말씀 생성기', subtitle: '공식 행사 인사말 자동 작성',  icon: '🎤', path: '/work-support/greetings' },
  { id: 'press-release',      title: '보도자료 생성기',   subtitle: '남양주시 공식 보도자료 작성',  icon: '📰', path: '/work-support/press-release' },
  { id: 'merit-citation',     title: '공적조서 생성기',   subtitle: '공무원/일반인 공적조서 작성',  icon: '🏆', path: '/work-support/merit-citation' },
  // 2행
  { id: 'ppt-converter',      title: 'PPT 변환기',        subtitle: '문서를 PPT로 자동 변환',       icon: '🖥️', path: '/work-support/ppt-converter' },
  { id: 'tts',                title: '텍스트 음성변환',   subtitle: 'TTS 음성 생성',               icon: '🔊', path: '/work-support/text-to-speech' },
  { id: 'scenario-generator', title: '발표 대본 생성기',  subtitle: '다양한 형식의 발표 대본 생성', icon: '📝', path: '/work-support/scenario-generator' },
  { id: 'chart-editor',       title: '차트 에디터',       subtitle: '데이터 시각화',               icon: '📈', path: '/work-support/chart-editor' },
  { id: 'nano-banana',        title: 'Nano Banana 2',     subtitle: 'AI 이미지 생성 · 편집',        icon: '🍌', path: '/work-support/nano-banana' },
];

export default function WorkSupportPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = '업무 지원 | 남양주 AI';
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eef5 100%)', fontFamily: 'inherit', zIndex: 50 }}>
      {/* 헤더 */}
      <div style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>⚡ 업무 지원</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>AI 기반 업무 자동화 도구 모음</p>
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

      <div style={{ overflow: 'auto' }}>
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
                <span style={{ fontSize: '1.75rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
