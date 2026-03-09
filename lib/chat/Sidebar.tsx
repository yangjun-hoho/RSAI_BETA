'use client';

import { useState, useEffect } from 'react';

export type ToolId = 'report' | 'ppt' | 'scenario' | 'merit-citation' | 'greetings' | 'press-release' | 'templates' | 'rag' | 'board' | 'text-transform';

export interface Tool {
  id: ToolId;
  label: string;
  tooltip: string;
}

export const TOOLS: Tool[] = [
  { id: 'report',        label: '보고서 생성',    tooltip: 'AI 자동 보고서 작성' },
  { id: 'greetings',     label: '인사말씀 생성',  tooltip: '상황별 맞춤 인사말 작성' },
  { id: 'press-release', label: '보도자료 생성',  tooltip: '효과적인 보도자료 작성' },
  { id: 'merit-citation', label: '공적조서 생성', tooltip: '공적조서 자동 작성' },
  { id: 'scenario',      label: '시나리오 생성',  tooltip: '발표 시나리오 자동 변환' },
  { id: 'ppt',           label: 'PPT 생성',       tooltip: 'AI 자동 프레젠테이션 작성' },
  { id: 'templates',     label: '업무 템플릿',     tooltip: '공무원 업무 특화 AI 템플릿' },
  { id: 'rag',           label: 'RAG (NotebookLM)', tooltip: '문서 기반 AI 지식 검색' },
  { id: 'text-transform', label: '텍스트 변환',     tooltip: '문체·맞춤법·표현 변환 도구' },
];

const ICON_MAP: Record<string, string> = {
  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  document: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  report: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  ppt: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  scenario: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  'merit-citation': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  greetings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
  'press-release': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/><rect x="7" y="7" width="8" height="5"/><line x1="8" y1="15" x2="12" y2="15"/><path d="M17 18v-1a2 2 0 0 1 2-2h2"/></svg>`,
  templates: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  rag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  'text-transform': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
};

export const SHORTCUTS = [
  { id: 'work-support',      label: '업무지원',       icon: '⚡', path: '/work-support' },
  { id: 'nano-banana',       label: 'Nano Banana 2',   icon: '🍌', path: '/work-support/nano-banana' },
  { id: 'shortform-editor',  label: '숏폼 에디터',    icon: '📱', path: '/shortform-editor' },
  { id: 'chart-editor',      label: '차트 에디터',    icon: '📊', path: '/work-support/chart-editor' },
  { id: 'screen-recorder',   label: '화면 녹화',      icon: '🎬', path: '/work-support/screen-recorder' },
  { id: 'latest-tools',      label: '최신 AI 도구',   icon: '🌐', path: '/work-support/latest-tools' },
  { id: 'cadastral-map',     label: '연속지적도',      icon: '🗺️', path: '/work-support/cadastral-map' },
  { id: 'fun',               label: 'FuN fUn',         icon: '🎮', path: '/fun' },
];

export const MEMBER_LINKS = [
  { id: 'board', label: 'AI 자유게시판', icon: '🤖', path: '/board' },
];

interface SidebarProps {
  activeMode: ToolId | null;
  onToolClick: (id: ToolId) => void;
}

type SidebarItemSetting = { hidden?: boolean; badge?: string };
type SidebarSettingsMap = Record<string, SidebarItemSetting>;

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  '공사중':    { background: '#fef3c7', color: '#92400e' },
  '개발중':    { background: '#dbeafe', color: '#1e40af' },
  '업데이트중': { background: '#dcfce7', color: '#15803d' },
  '신규':      { background: '#f3e8ff', color: '#7c3aed' },
};

function SidebarBadge({ badge }: { badge: string }) {
  if (!badge) return null;
  return (
    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', whiteSpace: 'nowrap', ...BADGE_STYLES[badge] }}>
      {badge}
    </span>
  );
}

export default function Sidebar({ activeMode, onToolClick }: SidebarProps) {
  const [open, setOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; y: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettingsMap>({});

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.role === 'admin') setIsAdmin(true);
    });
    fetch('/api/admin/sidebar-settings', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (d.settings) setSidebarSettings(d.settings);
    }).catch(() => {});
  }, []);

  return (
    <aside style={{
      width: open ? '260px' : '60px',
      background: '#f7f6f3',
      borderRight: '1px solid #e9e9e7',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.3s ease',
      overflow: 'visible',
      position: 'relative',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: open ? '0.5rem 0.5rem 0.5rem 1rem' : '0.5rem',
        borderBottom: '1px solid #e9e9e7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        height: '40px',
        gap: '0.5rem',
      }}>
        {open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/main-logo.png"
              alt="logo"
              style={{ height: '25px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#37352fda', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              AI Work Space
            </h2>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          title={open ? '사이드바 접기' : '사이드바 펼치기'}
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#7e7e7e', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 9l-3 3 3 3"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M13 9l3 3-3 3"/></svg>
          )}
        </button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
        {/* 도구 섹션 */}
        <div style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid #e9e9e7' }}>
          {open && (
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              도구
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', border: '1px solid #e3e2df', borderRadius: '8px', padding: '0.2rem', overflow: 'hidden' }}>
            {TOOLS.filter(tool => !sidebarSettings[tool.id]?.hidden).map((tool) => {
              const isActive = activeMode === tool.id;
              const badge = sidebarSettings[tool.id]?.badge || '';
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolClick(tool.id)}
                  title={!open ? tool.tooltip : undefined}
                  onMouseEnter={e => {
                    if (!open) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ text: tool.tooltip, y: rect.top + rect.height / 2 });
                    }
                    if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    setTooltip(null);
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: open ? '0.3rem 1rem' : '0.5rem',
                    background: isActive ? '#e8f4ff' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: isActive ? '#0066cc' : '#37352f',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: open ? 'flex-start' : 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: ICON_MAP[tool.id] }}
                  />
                  {open && <span style={{ whiteSpace: 'nowrap' }}>{tool.label}</span>}
                  {open && <SidebarBadge badge={badge} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 바로가기 섹션 */}
        {open && (
          <div style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid #e9e9e7' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              바로가기
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', border: '1px solid #e3e2df', borderRadius: '8px', padding: '0.2rem', overflow: 'hidden' }}>
              {SHORTCUTS.filter(sc => !sidebarSettings[sc.id]?.hidden).map((sc) => (
                <a
                  key={sc.id}
                  href={sc.path}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0.5rem', borderRadius: '6px', textDecoration: 'none', color: '#37352f', fontSize: '0.8rem', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>{sc.icon}</span>
                  <span>{sc.label}</span>
                  <SidebarBadge badge={sidebarSettings[sc.id]?.badge || ''} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 회원 공간 섹션 */}
        {open && (
          <div style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid #e9e9e7' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              회원 공간
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', border: '1px solid #e3e2df', borderRadius: '8px', padding: '0.2rem', overflow: 'hidden' }}>
              {MEMBER_LINKS.filter(sc => !sidebarSettings[sc.id]?.hidden).map((sc) => {
                const isActive = activeMode === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => onToolClick(sc.id as ToolId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0.5rem', borderRadius: '6px', textDecoration: 'none', color: isActive ? '#0066cc' : '#37352f', fontSize: '0.8rem', fontWeight: isActive ? 600 : 500, background: isActive ? '#e8f4ff' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#e8f4ff' : 'transparent'; }}
                  >
                    <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>{sc.icon}</span>
                    <span>{sc.label}</span>
                    <SidebarBadge badge={sidebarSettings[sc.id]?.badge || ''} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단 */}
      {open && isAdmin && (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e9e9e7' }}>
          <a
            href="/admin"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#37352f', fontSize: '0.875rem', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            <span>⚙️ 관리자</span>
          </a>
        </div>
      )}

      {/* 툴팁 (접힌 상태에서 hover 시) */}
      {tooltip && !open && (
        <div style={{
          position: 'fixed',
          left: '68px',
          top: tooltip.y,
          transform: 'translateY(-50%)',
          background: '#37352fdf',
          color: '#fff',
          padding: '0.3rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          {tooltip.text}
          <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid #37352f' }} />
        </div>
      )}
    </aside>
  );
}
