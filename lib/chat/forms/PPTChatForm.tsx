'use client';

import { useState, useRef } from 'react';
import { S } from './chatFormStyles';

const MAX_CHARS = 8000;

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function PPTChatForm({ onSubmit, onCancel, isLoading }: Props) {
  const [title, setTitle]                 = useState('');
  const [content, setContent]             = useState('');
  const [slideCount, setSlideCount]       = useState(10);
  const [includeTitle, setIncludeTitle]   = useState(true);
  const [includeIndex, setIncludeIndex]   = useState(true);
  const [includeConclusion, setIncludeConclusion] = useState(true);
  const [uploadedFile, setUploadedFile]   = useState<File | null>(null);
  const [isUploading, setIsUploading]     = useState(false);
  const [activeTab, setActiveTab]         = useState<'text' | 'file'>('text');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/work-support/ppt-converter/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '파일 업로드 실패');
      }
      const result = await res.json();
      setContent((result.text as string).slice(0, MAX_CHARS));
      setUploadedFile(file);
      setActiveTab('text');
    } catch (err) {
      alert(err instanceof Error ? err.message : '파일 업로드 실패');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;
    onSubmit({ content, title, slideCount, includeTitle, includeIndex, includeConclusion });
  }

  const tabStyle = (active: boolean) => ({
    flex: 1, padding: '0.45rem 0.75rem', border: 'none',
    background: active ? '#2383e2' : '#f1f1f1',
    color: active ? '#ffffff' : '#9b9a97',
    fontSize: '0.9rem', cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'background 0.15s, color 0.15s',
  } as React.CSSProperties);

  const charRatio = content.length / MAX_CHARS;
  const charColor = charRatio > 0.9 ? '#EF4444' : charRatio > 0.7 ? '#F59E0B' : '#9b9a97';

  return (
    <form onSubmit={handleSubmit} style={S.card}>
      <div style={S.header}>
        <div>
          <h3 style={S.h3}>🖥️ PPT 생성</h3>
          <p style={S.desc}>내용을 입력하면 프레젠테이션으로 변환됩니다</p>
        </div>
        <button type="button" onClick={onCancel} style={S.closeBtn} title="닫기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div style={S.content}>
        {/* PPT 제목 */}
        <div>
          <label style={S.label}>PPT 제목 *</label>
          <input
            type="text"
            style={S.input}
            placeholder="프레젠테이션 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.1rem' }}>
          <button type="button" style={{ ...tabStyle(activeTab === 'text'), borderRadius: '6px 6px 0px 0px' }} onClick={() => setActiveTab('text')}>📝 텍스트 입력</button>
          <button type="button" style={{ ...tabStyle(activeTab === 'file'), borderRadius: '6px 6px 0px 0px' }} onClick={() => setActiveTab('file')}>📎 파일 업로드</button>
        </div>

        {activeTab === 'text' && (
          <div>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: '90px', lineHeight: 1.4 }}
              placeholder="PPT로 변환할 내용을 입력하세요..."
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
              disabled={isLoading}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.78rem', color: charColor }}>{content.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}자</span>
            </div>
          </div>
        )}

        {activeTab === 'file' && (
          <div
            style={{ border: '1px dashed #d1d5db', borderRadius: '4px', background: '#fafafa', cursor: 'pointer', padding: '1.5rem', textAlign: 'center' }}
            onClick={() => fileRef.current?.click()}
          >
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>{isUploading ? '⏳' : '📎'}</span>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#4e4e4eff' }}>
              {isUploading ? '파일 처리 중...' : 'PDF, TXT, DOCX 파일을 클릭하여 업로드'}
            </p>
            {uploadedFile && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#28a745' }}>✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}KB)</p>}
            <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={isUploading} />
          </div>
        )}

        {/* 슬라이드 수 */}
        <div>
          <label style={S.label}>슬라이드 수: <strong>{slideCount}개</strong></label>
          <input type="range" min={3} max={20} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9b9a97' }}>
            <span>3</span><span>20</span>
          </div>
        </div>

        {/* 포함 요소 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: '제목 슬라이드', state: includeTitle, set: setIncludeTitle },
            { label: '목차',          state: includeIndex, set: setIncludeIndex },
            { label: '결론',          state: includeConclusion, set: setIncludeConclusion },
          ].map(item => (
            <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.84rem', color: '#37352f', cursor: 'pointer' }}>
              <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.cancelBtn} onClick={onCancel} disabled={isLoading}>취소</button>
        <button type="submit" style={{ ...S.submitBtn, opacity: !content.trim() || !title.trim() || isLoading ? 0.5 : 1 }} disabled={!content.trim() || !title.trim() || isLoading}>
          {isLoading ? '생성 중...' : 'PPT 생성'}
        </button>
      </div>
    </form>
  );
}
