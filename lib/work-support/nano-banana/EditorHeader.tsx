'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EditorHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  dailyUsageCount: number;
  dailyUsageLimit: number;
}

export default function EditorHeader({ isDarkMode, onToggleDarkMode, dailyUsageCount, dailyUsageLimit }: EditorHeaderProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const isWarning = dailyUsageCount >= dailyUsageLimit * 0.8;

  const bg = isDarkMode ? '#0c0e14' : '#ffffff';
  const border = isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb';
  const titleColor = isDarkMode ? '#f3f4f6' : '#1f2937';
  const verBg = isDarkMode ? '#1f2937' : '#f3f4f6';
  const verColor = isDarkMode ? '#6b7280' : '#4b5563';
  const usageBg = isWarning ? (isDarkMode ? 'rgba(245,158,11,.1)' : 'rgba(217,119,6,.1)') : (isDarkMode ? 'rgba(16,185,129,.1)' : 'rgba(5,150,105,.1)');
  const usageColor = isWarning ? (isDarkMode ? '#f59e0b' : '#d97706') : (isDarkMode ? '#10b981' : '#059669');
  const btnColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const btnBorder = isDarkMode ? '1px solid #374151' : '1px solid #d1d5db';
  const modalBg = isDarkMode ? '#1f2937' : '#ffffff';
  const modalBorder = isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb';
  const modalText = isDarkMode ? '#d1d5db' : '#4b5563';
  const modalTitle = isDarkMode ? '#f3f4f6' : '#1f2937';
  const dividerColor = isDarkMode ? '#374151' : '#e5e7eb';

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', color: btnColor,
    cursor: 'pointer', padding: '0.4rem', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <>
      <header style={{
        height: '50px', background: bg, borderBottom: border,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', flexShrink: 0, zIndex: 10,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🍌</span>
          <h1 style={{ fontSize: '1rem', fontWeight: 600, color: titleColor, margin: 0, whiteSpace: 'nowrap' }}>
            Nano Banana 2 이미지 에디터
          </h1>
          <span style={{ fontSize: '0.7rem', background: verBg, color: verColor, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
            1.0
          </span>
          <span style={{
            fontSize: '0.7rem', background: usageBg, color: usageColor,
            padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.2rem',
          }}>
            <span style={{ opacity: 0.8 }}>일일 사용:</span>
            {dailyUsageCount}/{dailyUsageLimit}
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{ ...iconBtnStyle, border: btnBorder, padding: '0.3rem 0.85rem', fontSize: '0.82rem', fontWeight: 500, gap: '0.4rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            홈
          </button>
          <button onClick={onToggleDarkMode} style={iconBtnStyle} title={isDarkMode ? '라이트 모드' : '다크 모드'}>
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button onClick={() => setShowHelp(true)} style={iconBtnStyle} title="도움말">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
        >
          <div style={{ background: modalBg, border: modalBorder, borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: modalBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: modalTitle, margin: 0 }}>🍌 Nano Banana 2 Image Editor</h2>
              <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', color: btnColor, fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', color: modalText }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Professional AI image generation and editing platform powered by Google Gemini 2.0 Flash.
              </p>
              {[
                { title: '🎨 Features', items: ['Text-to-Image Generation', 'Conversational Image Editing', 'Region-Aware Mask Painting', 'Reference Image Support'] },
                { title: '⌨️ Keyboard Shortcuts', items: ['Ctrl+Enter — Generate/Edit', 'G — Generate Mode', 'E — Edit Mode', 'M — Mask Mode'] },
              ].map((section) => (
                <div key={section.title} style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: modalTitle, marginBottom: '0.5rem' }}>{section.title}</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {section.items.map((item) => (
                      <li key={item} style={{ fontSize: '0.875rem', padding: '0.4rem 0', borderBottom: `1px solid ${dividerColor}` }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
