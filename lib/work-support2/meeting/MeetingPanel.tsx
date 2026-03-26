'use client';
import { useState, useEffect, useCallback } from 'react';
import { DocumentNode, FormSchema, TemplateInfo } from '@/types/work-support2';
import DynamicForm from '@/lib/work-support2/report/components/DynamicForm';
import MeetingPreviewPanel from './MeetingPreviewPanel';

const MEETING_TEMPLATE_IDS = ['meeting_basic', 'meeting_education', 'meeting_project', 'meeting_event1', 'meeting_event2'];

interface HistoryItem {
  id: string;
  title: string;
  nodes: DocumentNode[];
  formData: Record<string, unknown>;
  templateId: string;
  createdAt: string;
}

interface Props {
  onBack: () => void;
}

export default function MeetingPanel({ onBack }: Props) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('meeting_basic');
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // 템플릿 목록 로드
  useEffect(() => {
    Promise.all(
      MEETING_TEMPLATE_IDS.map(id =>
        fetch(`/api/work-support2/report/templates?id=${id}`)
          .then(r => r.json())
          .then(data => data.definition ? { id, name: data.definition.name, description: data.definition.description } : null)
          .catch(() => null)
      )
    ).then(results => {
      setTemplates(results.filter(Boolean) as TemplateInfo[]);
    });
  }, []);

  // 선택된 템플릿의 폼 스키마 로드
  useEffect(() => {
    if (!selectedTemplateId) return;
    fetch(`/api/work-support2/report/templates?id=${selectedTemplateId}`)
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
  }, [selectedTemplateId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/work-support2/meeting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, formData: formValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 실패');

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: String(formValues.title || '제목 없음'),
        nodes: data.nodes,
        formData: { ...formValues },
        templateId: selectedTemplateId,
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
  }, [selectedTemplateId, formValues]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/work-support2/meeting/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, nodes, formData: formValues }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'HWPX 생성 실패');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `확대간부회의_${String(formValues.title || '회의자료')}.hwpx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(String(e));
    } finally {
      setIsDownloading(false);
    }
  }, [selectedTemplateId, nodes, formValues]);

  const handleHistorySelect = (item: HistoryItem) => {
    setNodes(item.nodes);
    setActiveHistoryId(item.id);
    setSelectedTemplateId(item.templateId);
    setFormValues(item.formData);
  };

  const handleHistoryDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      if (activeHistoryId === id) {
        setNodes(updated[0]?.nodes || []);
        setActiveHistoryId(updated[0]?.id || null);
      }
      return updated;
    });
  };

  const sectionCount = nodes.filter(n => n.type === 'SECTION').length;
  const bulletCount = nodes.filter(n => n.type === 'BULLET').length;
  const canGenerate = !isGenerating && !!formValues.title;

  // 현재 히스토리 항목의 formData (미리보기용)
  const activeItem = history.find(h => h.id === activeHistoryId);
  const previewFormData = activeItem ? activeItem.formData : formValues;

  const previewContent = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
      ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 100, background: '#fff' } : {}),
    }}>
      {/* 미리보기 헤더 */}
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

      {/* 히스토리 탭 */}
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
        <MeetingPreviewPanel nodes={nodes} formData={previewFormData} />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, height: '100%', fontFamily: '"Noto Sans KR", sans-serif', overflow: 'hidden' }}>

      {/* 좌측 패널 */}
      <div style={{ width: '380px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', height: '48px', padding: '0 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}
            title="뒤로가기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>확대간부회의 자료 생성</span>
          <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 600, marginLeft: 'auto' }}>v2</span>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
          {/* 템플릿 선택 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>템플릿 선택</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: `1.5px solid ${selectedTemplateId === t.id ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: '7px',
                    background: selectedTemplateId === t.id ? '#eef2ff' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedTemplateId === t.id ? '#4338ca' : '#111827' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 동적 폼 */}
          {formSchema && (
            <>
              <DynamicForm
                schema={formSchema}
                values={formValues}
                onChange={(id, val) => setFormValues(prev => ({ ...prev, [id]: val }))}
                disabled={isGenerating}
              />
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{
                  padding: '0.6rem',
                  background: canGenerate ? '#4f46e5' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: canGenerate ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {isGenerating ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    AI 생성 중...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    AI 생성
                  </>
                )}
              </button>
              {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
            </>
          )}
        </div>
      </div>

      {/* 미리보기 패널 */}
      {previewContent}

      {/* 우측 옵션 패널 */}
      <div style={{ width: '240px', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>문서 옵션</span>
        </div>
        <div style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

          {/* 문서 정보 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>문서 정보</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: '전체 노드', value: `${nodes.length}개` },
                { label: '섹션 수', value: `${sectionCount}개` },
                { label: '항목 수', value: `${bulletCount}개` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 다운로드 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>내보내기</p>
            <button
              onClick={handleDownload}
              disabled={nodes.length === 0 || isDownloading}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: nodes.length === 0 ? '#f3f4f6' : (isDownloading ? '#9ca3af' : '#4f46e5'),
                color: nodes.length === 0 ? '#9ca3af' : '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: nodes.length === 0 || isDownloading ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {isDownloading ? '생성 중...' : 'HWP 다운로드'}
            </button>
            {downloadError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', margin: '6px 0 0' }}>{downloadError}</p>}
          </div>

          {/* 다시 생성 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>작업</p>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #c7d2fe', borderRadius: '6px',
                background: canGenerate ? '#eef2ff' : '#f9fafb',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                fontSize: '0.82rem', color: '#4338ca', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                opacity: !canGenerate ? 0.5 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {isGenerating ? '생성 중...' : '전체 다시 생성'}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
