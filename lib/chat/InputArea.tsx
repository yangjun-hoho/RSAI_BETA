'use client';

import { useState, useRef, useEffect } from 'react';
import type { ToolId } from './Sidebar';

// 채팅 전용 미니 폼 컴포넌트
import MeritChatForm from '@/lib/chat/forms/MeritChatForm';
import GreetingChatForm from '@/lib/chat/forms/GreetingChatForm';
import PressReleaseChatForm from '@/lib/chat/forms/PressReleaseChatForm';
import ScenarioChatForm from '@/lib/chat/forms/ScenarioChatForm';
import ReportChatForm from '@/lib/chat/forms/ReportChatForm';
import PPTChatForm from '@/lib/chat/forms/PPTChatForm';

interface Model {
  id: string;
  name: string;
}

interface InputAreaProps {
  activeMode: ToolId | null;
  selectedModel: string;
  models: Model[];
  isLoading: boolean;
  webSearch: boolean;
  onSend: (text: string) => void;
  onModelChange: (model: string) => void;
  onCloseMode: () => void;
  onToolSubmit: (toolId: ToolId, data: Record<string, unknown>) => void;
  onWebSearchChange: (enabled: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const TOOL_LABELS: Record<string, string> = {
  report: '보고서 생성',
  ppt: 'PPT 생성',
  scenario: '시나리오 생성',
  'merit-citation': '공적조서 생성',
  greetings: '인사말씀 생성',
  'press-release': '보도자료 생성',
};

// 폼 기반 도구 (별도 폼 컴포넌트를 렌더링)
const FORM_TOOLS: ToolId[] = ['report', 'ppt', 'scenario', 'merit-citation', 'greetings', 'press-release'];

export default function InputArea({
  activeMode,
  selectedModel,
  models,
  isLoading,
  webSearch,
  onSend,
  onModelChange,
  onCloseMode,
  onToolSubmit,
  onWebSearchChange,
  onLoadingChange,
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && !activeMode) {
      textareaRef.current.focus();
    }
  }, [activeMode]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  }

  // 폼 기반 도구가 활성화된 경우 → 해당 폼 렌더링
  if (activeMode && FORM_TOOLS.includes(activeMode)) {
    return (
      <div style={{ padding: '0.5rem 2rem', background: '#faf9f5', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {/* 도구별 폼 */}
          <div>
            {activeMode === 'report' && (
              <ReportChatForm
                onSubmit={(data) => onToolSubmit('report', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
              />
            )}
            {activeMode === 'ppt' && (
              <PPTChatForm
                onSubmit={(data) => onToolSubmit('ppt', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
              />
            )}
            {activeMode === 'scenario' && (
              <ScenarioChatForm
                onSubmit={(data) => onToolSubmit('scenario', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
              />
            )}
            {activeMode === 'merit-citation' && (
              <MeritChatForm
                onSubmit={(data) => onToolSubmit('merit-citation', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
              />
            )}
            {activeMode === 'greetings' && (
              <GreetingChatForm
                onSubmit={(data) => onToolSubmit('greetings', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
              />
            )}
            {activeMode === 'press-release' && (
              <PressReleaseChatForm
                onSubmit={(data) => onToolSubmit('press-release', data)}
                onCancel={onCloseMode}
                isLoading={isLoading}
                onLoadingChange={onLoadingChange}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 일반 텍스트 입력 (+ search/document 모드 배지 포함)
  return (
    <div style={{ padding: '0.5rem 2rem 1.25rem', background: '#faf9f5' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', border: '1px solid #e0e0e0', borderRadius: '12px', background: '#ffffff', boxShadow: '0 3px 4px rgba(0,0,0,0.12)', transition: 'all 0.2s ease' }}
        onFocus={e => {
          const el = e.currentTarget;
          el.style.borderColor = '#2383e2';
          el.style.boxShadow = '0 2px 8px rgba(35,131,226,0.15)';
        }}
        onBlur={e => {
          const el = e.currentTarget;
          el.style.borderColor = '#e0e0e0';
          el.style.boxShadow = '0 3px 4px rgba(0,0,0,0.12)';
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '1rem 4.5rem 2.5rem 1rem',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'inherit',
            fontSize: '0.9375rem',
            resize: 'none',
            background: 'transparent',
            color: '#37352f',
            lineHeight: 1.6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 웹검색 토글 + 활성 모드 배지 (좌측 하단) */}
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onWebSearchChange(!webSearch)}
            disabled={isLoading}
            title={webSearch ? '웹 검색 켜짐' : '웹 검색 꺼짐'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              border: `1px solid ${webSearch ? '#2383e2' : '#e0e0e0'}`,
              borderRadius: '10px',
              background: webSearch ? '#eef5fd' : 'transparent',
              color: webSearch ? '#2383e2' : '#9b9a97',
              fontSize: '0.72rem', fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            웹 검색
          </button>
        {activeMode && (
          <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.625rem',
              background: '#f9fcff', border: '1px solid #b3d9ff', borderRadius: '10px',
              fontSize: '0.72rem', color: '#7a7a7a', fontWeight: 500,
            }}>
              <span>{TOOL_LABELS[activeMode]}</span>
              <button
                onClick={onCloseMode}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', border: 'none', background: 'rgba(0,102,204,0.1)', color: '#cc0000', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}
        </div>

        {/* 모델 선택 + 전송 버튼 (우측 하단) */}
        <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            disabled={isLoading}
            style={{
              padding: '0.35rem 0.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              background: '#f7f6f3',
              fontSize: '0.72rem',
              cursor: 'pointer',
              color: '#37352f',
              fontWeight: 500,
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: '30px', height: '30px',
              background: '#2383e2', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: !input.trim() || isLoading ? 0.4 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { if (!(!input.trim() || isLoading)) e.currentTarget.style.background = '#1a6ec9'; }}
            onMouseLeave={e => (e.currentTarget.style.background = '#2383e2')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
