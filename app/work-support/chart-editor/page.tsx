'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChartEditor from '@/lib/work-support/chart-editor/ChartEditor';

export default function ChartEditorPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = '차트 에디터 | 남양주 AI';
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>

      {/* ── Header ── */}
      <header style={{
        height: '52px', background: '#ffffff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px',
        flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>차트 에디터</span>
          <span style={{ fontSize: '11px', padding: '2px 7px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '20px', color: '#6b7280', fontWeight: 500 }}>
            Chart.js
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => router.push('/')}
          aria-label="홈으로 이동"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '0.35rem 0.85rem', background: 'transparent',
            border: '1px solid #e5e7eb', borderRadius: '7px',
            cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem', fontWeight: 500,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          홈
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <ChartEditor />
      </div>
    </div>
  );
}
