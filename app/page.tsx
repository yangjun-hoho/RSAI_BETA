'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface ActiveNotice { id: number; title: string; content: string; }
import Sidebar, { type ToolId } from '@/lib/chat/Sidebar';
import ChatHeader from '@/lib/chat/ChatHeader';
import ChatArea from '@/lib/chat/ChatArea';
import InputArea from '@/lib/chat/InputArea';
import PreviewPanel from '@/lib/chat/PreviewPanel';
import TemplateView from '@/lib/work-templates/TemplateView';
import RagView from '@/lib/rag/RagView';
import BoardPanel from '@/lib/board/BoardPanel';
import WorkSupport2View from '@/lib/work-support2/WorkSupport2View';
import ReportPanel from '@/lib/work-support2/report/ReportPanel';
import PressReleasePanel from '@/lib/work-support2/press-release/PressReleasePanel';
import GreetingPanel from '@/lib/work-support2/greeting/GreetingPanel';
import MeritCitationPanel from '@/lib/work-support2/merit-citation/MeritCitationPanel';
import MeetingPanel from '@/lib/work-support2/meeting/MeetingPanel';
import type { Message } from '@/lib/chat/MessageBubble';

const LS_KEY = 'ares-ai-messages';

// 도구별 개별 localStorage 키
const PREVIEW_TOOL_IDS: ToolId[] = ['report', 'ppt', 'scenario', 'merit-citation', 'greetings', 'press-release'];
function previewKey(toolId: ToolId) { return `ares-ai-preview-${toolId}`; }

function newId() {
  return Math.random().toString(36).slice(2);
}

export default function Home() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [activeMode, setActiveMode]   = useState<ToolId | null>(null);
  const [ws2Service, setWs2Service]   = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt-5.4-mini');
  const selectedModelRef = useRef(selectedModel);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
  const [availableModels, setAvailableModels] = useState([
    { id: 'gpt-5.4-mini',          name: 'OpenAI',   size: 'API', badge: 'API' },
    { id: 'gemini-2.5-flash-lite', name: 'GoogleAI', size: 'API', badge: 'API' },
  ]);
  const [isLoading, setIsLoading]     = useState(false);
  const [webSearch, setWebSearch]     = useState(true);
  const webSearchRef = useRef(webSearch);
  useEffect(() => { webSearchRef.current = webSearch; }, [webSearch]);
  const [error, setError]             = useState('');
  const [nickname, setNickname]       = useState<string | undefined>(undefined);

  // 공지 배너 상태
  const [notice, setNotice] = useState<ActiveNotice | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  // 미리보기 패널 상태
  const [previewTool, setPreviewTool] = useState<ToolId | null>(null);
  // 도구별 독립 저장소 (SvelteKit 방식)
  const [previewStore, setPreviewStore] = useState<Partial<Record<ToolId, Record<string, unknown>>>>({});
  const [previewOpen, setPreviewOpen] = useState(true);
  // 도구 생성 전용 로딩 (채팅 로딩과 분리)
  const [toolLoading, setToolLoading] = useState(false);

  // 현재 표시할 미리보기 데이터 (store에서 파생)
  const previewData = previewTool ? (previewStore[previewTool] ?? null) : null;

  useEffect(() => {
    document.title = '남양주 AI';

    // 뒤로가기 등으로 패널 자동 열기 (?panel=work-support2)
    const params = new URLSearchParams(window.location.search);
    if (params.get('panel') === 'work-support2') {
      setActiveMode('work-support2');
      window.history.replaceState({}, '', '/');
    }

    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user?.nickname) setNickname(d.user.nickname); });
    fetch('/api/notices').then(r => r.json()).then(d => { if (d.notice) setNotice(d.notice); });
    fetch('/api/admin/ai-model-config').then(r => r.json()).then(d => {
      if (d.openai && d.google) {
        setAvailableModels([
          { id: d.openai, name: 'OpenAI', size: 'API', badge: 'API' },
          { id: d.google, name: 'GoogleAI', size: 'API', badge: 'API' },
        ]);
        setSelectedModel(d.openai);
      }
    }).catch(() => {});
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        // 빈 assistant 메시지(스트리밍 미완료 잔재) 제거
        const cleaned = parsed.filter((m, i) =>
          !(m.role === 'assistant' && !m.content && i === parsed.length - 1)
        );
        setMessages(cleaned);
      }

      // 도구별 저장된 미리보기 데이터 로드
      const store: Partial<Record<ToolId, Record<string, unknown>>> = {};
      for (const toolId of PREVIEW_TOOL_IDS) {
        const raw = localStorage.getItem(previewKey(toolId));
        if (raw) {
          try { store[toolId] = JSON.parse(raw); } catch { /* ignore */ }
        }
      }
      setPreviewStore(store);
    } catch { /* ignore */ }
  }, []);

  const MAX_MESSAGES = 20;

  function saveMessages(msgs: Message[]) {
    const trimmed = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs;
    try { localStorage.setItem(LS_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
  }

  // 도구별 미리보기 저장 (store + localStorage)
  function saveToolPreview(toolId: ToolId, data: Record<string, unknown>) {
    try { localStorage.setItem(previewKey(toolId), JSON.stringify(data)); } catch { /* ignore */ }
    setPreviewStore(prev => ({ ...prev, [toolId]: data }));
  }

  const updateLastAssistant = useCallback((content: string) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = { ...next[i], content };
          break;
        }
      }
      saveMessages(next);
      return next;
    });
  }, []);

  // 사이드바 도구 클릭: 폼 토글만 (미리보기 탭은 건드리지 않음)
  function handleToolClick(toolId: ToolId) {
    if (toolId === 'text-transform') {
      const w = 550, h = 720;
      const left = Math.max(0, window.screen.width - w - 20);
      const top = Math.max(0, Math.floor((window.screen.height - h) / 2));
      window.open('/popup-text-transform', 'text-transform-panel',
        `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`);
      return;
    }
    setActiveMode(prev => prev === toolId ? null : toolId);
    setWs2Service(null);
  }

  // 탭 × 닫기: 해당 도구의 저장 데이터 삭제, 남은 탭으로 전환
  function handleTabClose(toolId: ToolId) {
    try { localStorage.removeItem(previewKey(toolId)); } catch { /* ignore */ }
    setPreviewStore(prev => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
    if (previewTool === toolId) {
      const remaining = PREVIEW_TOOL_IDS.filter(id => id !== toolId && previewStore[id] !== undefined);
      setPreviewTool(remaining[0] ?? null);
    }
  }

  // 일반 채팅 전송 (SSE 스트리밍)
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError('');

    const userMsg: Message = { id: newId(), role: 'user', content: text };
    const assistantMsg: Message = { id: newId(), role: 'assistant', content: '' };

    let currentMessages: Message[] = [];
    setMessages(prev => {
      currentMessages = [...prev, userMsg, assistantMsg];
      saveMessages(currentMessages);
      return currentMessages;
    });
    setIsLoading(true);

    const historyForApi = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi, model: selectedModelRef.current, webSearch: webSearchRef.current }),
      });

      if (!response.ok) throw new Error('API 응답 오류');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter(l => l.trim())) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          let parsed: { error?: string; content?: string; status?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.status === 'searching') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') next[next.length - 1] = { ...last, isSearching: true };
              return next;
            });
          }
          if (parsed.content) {
            accumulated += parsed.content;
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: accumulated, isSearching: false };
              return next;
            });
          }
        }
      }
      // 스트리밍 완료 후 최종 내용을 localStorage에 저장
      setMessages(prev => {
        saveMessages(prev);
        return prev;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
      updateLastAssistant(`❌ ${msg}`);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, updateLastAssistant]);

  // 도구 폼 제출 핸들러
  const handleToolSubmit = useCallback(async (toolId: ToolId, data: Record<string, unknown>) => {
    setIsLoading(true);
    setToolLoading(true);
    setError('');

    // 보도자료: 폼이 자체적으로 API 호출을 처리함 - 완성된 데이터를 받아 미리보기에 표시
    if (toolId === 'press-release') {
      const pr = (data.pressRelease as Record<string, unknown>) || {};
      setPreviewTool('press-release');
      saveToolPreview('press-release', pr);
      setIsLoading(false);
      setToolLoading(false);
      return;
    }

    // 미리보기 패널: 해당 도구로 전환 (로딩 표시)
    setPreviewTool(toolId);

    try {
      let apiUrl = '';
      let body: Record<string, unknown> = data;

      if (toolId === 'report') {
        apiUrl = '/api/work-support/report';
        body = {
          title: String(data.reportTitle || ''),
          reportType: String(data.selectedReportType || ''),
          detailType: String(data.selectedDetailType || ''),
          reportLength: String(data.selectedLength || 'standard'),
          model: String(data.selectedModel || 'gemini-2.5-flash-lite'),
        };
      } else if (toolId === 'ppt') {
        apiUrl = '/api/work-support/ppt-converter/generate';
        body = {
          content: String(data.content || ''),
          title: String(data.title || ''),
          slideCount: Number(data.slideCount) || 10,
          includeTitle: Boolean(data.includeTitle),
          includeIndex: Boolean(data.includeIndex),
          includeConclusion: Boolean(data.includeConclusion),
          template: String(data.template || 'professional'),
        };
      } else if (toolId === 'scenario') {
        apiUrl = '/api/work-support/scenario-generator';
        const settings = (data.settings as Record<string, unknown>) || {};
        body = {
          templateType: String(data.template || 'presentation'),
          content: String(data.content || ''),
          style: String(settings.style || 'formal'),
          audience: String(settings.audience || 'general'),
        };
      } else if (toolId === 'merit-citation') {
        apiUrl = '/api/work-support/merit-citation';
      } else if (toolId === 'greetings') {
        apiUrl = '/api/work-support/greetings';
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || '생성에 실패했습니다.');
      }

      const result = await response.json();

      // 도구별 미리보기 데이터 매핑
      let previewPayload: Record<string, unknown> = {};

      if (toolId === 'greetings') {
        previewPayload = {
          greeting: result.greeting,
          title: String(data.specificSituation || '인사말씀'),
        };
      } else if (toolId === 'merit-citation') {
        previewPayload = { citation: result.citation, title: result.title };
      } else if (toolId === 'report') {
        // API가 { report: {...} } 형태로 반환 → 내부 객체를 unwrap
        const base = (result.report as Record<string, unknown>) || result;
        previewPayload = { ...base };
        if (data.managerInfo) previewPayload.managerInfo = data.managerInfo;
        if (data.teamLeaderInfo) previewPayload.teamLeaderInfo = data.teamLeaderInfo;
      } else if (toolId === 'scenario') {
        previewPayload = {
          content: result.scenario || result.content || '',
          metadata: { template: String(data.template || '') },
        };
      } else if (toolId === 'ppt') {
        previewPayload = { slides: result.slides || [] };
      }

      saveToolPreview(toolId, previewPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '생성 중 오류가 발생했습니다.';
      setError(msg);
      setPreviewTool(null);
    } finally {
      setIsLoading(false);
      setToolLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStore]);

  function handleClear() {
    if (window.confirm('모든 대화 내역을 삭제하시겠습니까?')) {
      setMessages([]);
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    }
  }

  function handleExport() {
    const text = messages
      .map(m => `[${m.role === 'user' ? '사용자' : 'AI'}]\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      background: '#faf9f5',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      overflow: 'hidden',
    }}>
      {/* 공지 팝업 */}
      {notice && !noticeDismissed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setNoticeDismissed(true)}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📢</span>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1f2937' }}>{notice.title}</h2>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{notice.content}</p>
            <button onClick={() => setNoticeDismissed(true)}
              style={{ width: '100%', padding: '0.65rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
              확인
            </button>
          </div>
        </div>
      )}

      <Sidebar activeMode={activeMode} onToolClick={handleToolClick} />

      {/* 메인 콘텐츠 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minWidth: 0 }}>

        {activeMode === 'rag' ? (
          <RagView onClose={() => setActiveMode(null)} />
        ) : activeMode === 'templates' ? (
          <TemplateView onClose={() => setActiveMode(null)} />
        ) : activeMode === 'work-support2' && ws2Service === 'report' ? (
          <ReportPanel onBack={() => setWs2Service(null)} />
        ) : activeMode === 'work-support2' && ws2Service === 'press-release' ? (
          <PressReleasePanel onBack={() => setWs2Service(null)} />
        ) : activeMode === 'work-support2' && ws2Service === 'greeting' ? (
          <GreetingPanel onBack={() => setWs2Service(null)} />
        ) : activeMode === 'work-support2' && ws2Service === 'merit-citation' ? (
          <MeritCitationPanel onBack={() => setWs2Service(null)} />
        ) : activeMode === 'work-support2' && ws2Service === 'meeting' ? (
          <MeetingPanel onBack={() => setWs2Service(null)} />
        ) : activeMode === 'work-support2' ? (
          <WorkSupport2View
            onClose={() => setActiveMode(null)}
            onOpenService={(id) => setWs2Service(id)}
          />
        ) : activeMode === 'board' ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
            <BoardPanel onBack={() => setActiveMode(null)} />
          </div>
        ) : (
          <>
            {/* 채팅 영역 */}
            <div style={{ flex: 4, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
              <ChatHeader
                models={availableModels}
                selectedModel={selectedModel}
                onClear={handleClear}
                onExport={handleExport}
                nickname={nickname}
              />

              <ChatArea messages={messages} isLoading={isLoading} onToolClick={handleToolClick} />

              {error && (
                <div style={{ padding: '0.5rem 2rem', background: '#fee', borderTop: '1px solid #fcc', color: '#e03e3e', fontSize: '0.875rem', flexShrink: 0 }}>
                  ⚠️ {error}
                </div>
              )}

              <InputArea
                activeMode={activeMode}
                selectedModel={selectedModel}
                models={availableModels}
                isLoading={isLoading}
                webSearch={webSearch}
                onSend={handleSend}
                onModelChange={setSelectedModel}
                onCloseMode={() => setActiveMode(null)}
                onToolSubmit={handleToolSubmit}
                onWebSearchChange={setWebSearch}
                onLoadingChange={(loading) => {
                  setIsLoading(loading);
                  setToolLoading(loading);
                  if (loading) setPreviewTool('press-release');
                }}
              />
              <div style={{ position: 'absolute', bottom: '0.1rem', right: '1rem', fontSize: '0.9rem', color: 'rgba(0, 0, 0, 0.39)', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
                © 2026 기획조정실 스마트도시과
              </div>
            </div>

            {/* 미리보기 패널 */}
            <PreviewPanel
              tool={previewTool}
              data={previewData}
              store={previewStore}
              isLoading={toolLoading}
              isOpen={previewOpen}
              onToggle={() => setPreviewOpen(p => !p)}
              onTabSwitch={setPreviewTool}
              onTabClose={handleTabClose}
            />
          </>
        )}
      </div>
    </div>
  );
}
