'use client';
import { useState, useEffect, useCallback } from 'react';
import { DocumentNode, FormSchema } from '@/types/work-support2';
import DynamicForm from '@/lib/work-support2/report/components/DynamicForm';
import GreetingPreviewPanel from '@/lib/work-support2/greeting/GreetingPreviewPanel';
import DownloadButton from '@/lib/work-support2/report/components/DownloadButton';

const TEMPLATE_ID = 'greeting_v2';

interface HistoryItem {
  id: string;
  title: string;
  nodes: DocumentNode[];
  createdAt: string;
}


interface Props {
  onBack: () => void;
}

export default function GreetingPanel({ onBack }: Props) {
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/work-support2/report/templates?id=${TEMPLATE_ID}`)
      .then(r => r.json())
      .then(data => {
        if (data.form_schema) {
          setFormSchema(data.form_schema);
          const defaults: Record<string, unknown> = {};
          data.form_schema.fields.forEach((f: { id: string; default?: unknown }) => {
            if (f.default !== undefined) defaults[f.id] = f.default;
          });
          setFormValues(defaults);
        }
      });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/work-support2/greeting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: TEMPLATE_ID, formData: formValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 실패');

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: String(formValues.event_title || '제목 없음'),
        nodes: data.nodes,
        createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory(prev => [newItem, ...prev].slice(0, 5));
      setNodes(data.nodes);
      setActiveHistoryId(newItem.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [formValues]);

  const handleHistorySelect = (item: HistoryItem) => { setNodes(item.nodes); setActiveHistoryId(item.id); };

  const handleHistoryDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      if (activeHistoryId === id) { setNodes(updated[0]?.nodes || []); setActiveHistoryId(updated[0]?.id || null); }
      return updated;
    });
  };

  const handleCopyText = () => {
    const text = nodes.filter(n => n.type === 'PARAGRAPH').map(n => n.content).join('\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const paragraphCount = nodes.filter(n => n.type === 'PARAGRAPH').length;
  const estimatedPages = paragraphCount > 0 ? Math.max(1, Math.ceil(paragraphCount / 3)) : 0;

  const previewContent = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: isFullscreen ? 'fixed' : 'relative', inset: isFullscreen ? 0 : 'auto', zIndex: isFullscreen ? 100 : 'auto', background: '#fff' }}>
      <div style={{ height: '48px', padding: '0 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', background: '#f9fafb', flexShrink: 0, gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>미리보기</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsFullscreen(v => !v)}
            title={isFullscreen ? '전체보기 닫기 (ESC)' : '전체보기'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', background: isFullscreen ? '#f3f4f6' : '#fff', cursor: 'pointer', fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}
          >
            {isFullscreen
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            }
            {isFullscreen ? '닫기' : '전체보기'}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="thin-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1rem', height: '40px', borderBottom: '1px solid #e5e7eb', background: '#fff', overflowX: 'auto', flexShrink: 0 }}>
          {history.map((item) => (
            <div key={item.id} onClick={() => handleHistorySelect(item)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: `1px solid ${activeHistoryId === item.id ? '#a5b4fc' : '#e5e7eb'}`, background: activeHistoryId === item.id ? '#eef2ff' : '#f9fafb', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.78rem', color: activeHistoryId === item.id ? '#4338ca' : '#6b7280', fontWeight: activeHistoryId === item.id ? 600 : 400, transition: 'all 0.15s' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
              <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{item.createdAt}</span>
              <button onClick={(e) => handleHistoryDelete(item.id, e)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: 0, marginLeft: '2px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <GreetingPreviewPanel nodes={nodes} />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, height: '100%', fontFamily: '"Noto Sans KR", sans-serif', overflow: 'hidden' }}>

      {/* 좌측 패널 */}
      <div style={{ width: '360px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', height: '48px', padding: '0 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}
            title="뒤로가기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>인사말씀 생성</span>
          <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 600, marginLeft: 'auto' }}>v2</span>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          {formSchema && (
            <>
              <DynamicForm schema={formSchema} values={formValues} onChange={(id, val) => setFormValues(prev => ({ ...prev, [id]: val }))} disabled={isGenerating} />
              <button onClick={handleGenerate} disabled={isGenerating || !formValues.event_title} style={{ padding: '0.55rem', background: isGenerating ? '#9ca3af' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '0.82rem', cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
                {isGenerating ? '인사말씀 생성 중...' : '인사말씀 생성'}
              </button>
              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
            </>
          )}
        </div>
      </div>

      {/* 미리보기 패널 */}
      {previewContent}

      {/* 우측 옵션 패널 */}
      <div style={{ width: '260px', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>문서 옵션</span>
          </div>
          <div style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>문서 정보</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  { label: '전체 항목', value: `${nodes.length}개` },
                  { label: '단락 수', value: `${paragraphCount}개` },
                  { label: '예상 페이지', value: estimatedPages > 0 ? `${estimatedPages}p` : '-' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>내보내기</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {nodes.length > 0 && (
                  <DownloadButton
                    templateId={TEMPLATE_ID}
                    nodes={nodes}
                    fileName={String(formValues.event_title || 'greeting')}
                    apiPath="/api/work-support2/greeting/render"
                    buttonStyle={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  />
                )}
                <button onClick={handleCopyText} disabled={nodes.length === 0} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: nodes.length === 0 ? 0.5 : 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {copied ? '복사됨 ✓' : '텍스트 복사'}
                </button>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>작업</p>
              <button onClick={handleGenerate} disabled={isGenerating || !formValues.event_title} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #c7d2fe', borderRadius: '6px', background: '#eef2ff', cursor: (isGenerating || !formValues.event_title) ? 'not-allowed' : 'pointer', fontSize: '0.82rem', color: '#4338ca', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: !formValues.event_title ? 0.5 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {isGenerating ? '생성 중...' : '전체 다시 생성'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
