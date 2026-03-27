'use client';

interface Model {
  id: string;
  name: string;
  size: string;
  badge?: string;
}

interface ChatHeaderProps {
  models: Model[];
  selectedModel: string;
  onClear: () => void;
  onExport: () => void;
  nickname?: string;
}

export default function ChatHeader({ models, selectedModel, onClear, onExport, nickname }: ChatHeaderProps) {
  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 1.5rem',
      borderBottom: '1px solid #f0f0f0',
      background: '#faf9f5',
      height: '40px',
      flexShrink: 0,
    }}>
      {/* 좌측: 타이틀 + 모델 뱃지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '0.9rem', fontWeight: 400, color: '#494846bf', margin: 0 }}>
          AI-Agent
        </h1>
        {currentModel && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.1rem 0.4rem',
            background: '#faf9f8',
            border: '1px solid #e9e9e7',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: '#37352f',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#2383e2" strokeWidth="1.5" fill="none"/>
              <circle cx="8" cy="8" r="2" fill="#2383e2"/>
            </svg>
            <span style={{ fontWeight: 400 }}>{currentModel.name}</span>
            <span style={{ color: '#dc4747', fontWeight: 500, fontSize: '0.72rem' }}>{currentModel.size}</span>
            {currentModel.badge && (
              <span style={{
                padding: '0.1rem 0.35rem',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '3px',
                fontSize: '0.62rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {currentModel.badge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 우측: 버튼들 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {nickname && (
          <span style={{ fontSize: '0.78rem', color: '#9b9a97', fontWeight: 500, marginRight: '0.1rem' }}>
            {nickname}
          </span>
        )}
        {/* 메신저 모드 버튼 */}
        <style>{`
          @keyframes messenger-glow {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .messenger-btn {
            background: linear-gradient(270deg, #a8d8ea, #a8e6cf, #a8d8ea);
            background-size: 300% 300%;
            animation: messenger-glow 3s ease infinite;
            border: 1px solid rgba(100,200,180,0.4) !important;
            color: #1a6b5a !important;
            transition: opacity 0.15s, box-shadow 0.15s !important;
          }
          .messenger-btn:hover {
            opacity: 0.88;
            box-shadow: 0 2px 10px rgba(100,200,160,0.4);
          }
        `}</style>
        <button
          className="messenger-btn"
          onClick={() => {
            const w = 400, h = 720;
            const left = Math.max(0, window.screen.width - w - 20);
            const top = Math.max(0, Math.floor((window.screen.height - h) / 2));
            window.open('/popup-messenger', 'rsai-messenger',
              `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`);
          }}
          title="메신저 모드로 열기"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          메신저 모드
        </button>
        <a
          href="/my"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', border: '1px solid #e9e9e7', background: 'rgba(71,71,71,0.03)', color: '#6b6b6b', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#d0d0ce'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(71,71,71,0.03)'; e.currentTarget.style.borderColor = '#e9e9e7'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          나의 메뉴
        </a>
        <IconBtn onClick={onExport} title="대화 내보내기">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </IconBtn>
        <button
          onClick={onClear}
          title="대화 초기화"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', border: '1px solid #e9e9e7', background: 'rgba(71,71,71,0.03)', color: '#6b6b6b', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#d0d0ce'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(71,71,71,0.03)'; e.currentTarget.style.borderColor = '#e9e9e7'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><g transform="scale(-1,1) translate(-24,0)"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></g></svg>
          대화 초기화
        </button>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(71,71,71,0.03)', color: '#6b6b6b', borderRadius: '6px', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(71,71,71,0.03)')}
    >
      {children}
    </button>
  );
}
