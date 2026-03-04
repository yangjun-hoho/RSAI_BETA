'use client';

import { useState, useRef } from 'react';
import { S } from './chatFormStyles';

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const templates = [
  { value: 'presentation', label: '발표(PT)', icon: '🎯' },
  { value: 'meeting',      label: '회의 진행', icon: '👥' },
  { value: 'mc',           label: '사회자',    icon: '🎤' },
  { value: 'briefing',     label: '브리핑',    icon: '📢' },
  { value: 'lecture',      label: '강의',      icon: '📚' },
  { value: 'debate',       label: '토론',      icon: '💬' },
];

export default function ScenarioChatForm({ onSubmit, onCancel, isLoading }: Props) {
  const [content, setContent]     = useState('');
  const [template, setTemplate]   = useState('presentation');
  const [style, setStyle]         = useState('formal');
  const [audience, setAudience]   = useState('general');
  const [duration, setDuration]   = useState('medium');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    const allowed = ['application/pdf', 'text/plain'];
    if (!allowed.includes(file.type)) { alert('PDF 또는 TXT 파일만 업로드 가능합니다.'); return; }
    setIsProcessing(true);
    setUploadedFile(file);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/work-support/scenario-generator/extract', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || '파일 처리 실패');
      setContent((await res.json()).text);
    } catch (err) {
      alert('파일 처리 중 오류: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setIsProcessing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ content, template, settings: { style, audience, duration } });
  }

  return (
    <form onSubmit={handleSubmit} style={S.card}>
      <div style={S.header}>
        <div>
          <h3 style={S.h3}>🎭 시나리오 생성</h3>
          <p style={S.desc}>발표 대본으로 변환할 정보를 입력하세요</p>
        </div>
        <button type="button" onClick={onCancel} style={S.closeBtn} title="닫기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div style={S.content}>
        {/* 상황 설정 */}
        <div>
          <label style={S.label}>상황 설정</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
            {templates.map(t => (
              <label
                key={t.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.25rem', padding: '0.3rem',
                  border: `1px solid ${template === t.value ? '#2383e2' : '#e0e0e0'}`,
                  borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem',
                  background: template === t.value ? '#e8f4ff' : '#f9fafb',
                  color: template === t.value ? '#2383e2' : '#6b6b6b',
                  fontWeight: template === t.value ? 600 : 400,
                }}
              >
                <input type="radio" value={t.value} checked={template === t.value} onChange={() => setTemplate(t.value)} style={{ display: 'none' }} />
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 기본 설정 */}
        <div>
          <label style={S.label}>기본 설정</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
            <select style={S.input} value={style} onChange={e => setStyle(e.target.value)} disabled={isLoading}>
              <option value="formal">격식</option>
              <option value="conversational">대화형</option>
              <option value="casual">편안함</option>
            </select>
            <select style={S.input} value={audience} onChange={e => setAudience(e.target.value)} disabled={isLoading}>
              <option value="general">일반</option>
              <option value="colleagues">동료</option>
              <option value="citizens">시민</option>
              <option value="students">학생</option>
            </select>
            <select style={S.input} value={duration} onChange={e => setDuration(e.target.value)} disabled={isLoading}>
              <option value="short">3-5분</option>
              <option value="medium">5-10분</option>
              <option value="long">10-15분</option>
            </select>
          </div>
        </div>

        {/* 파일 업로드 */}
        <div>
          <label style={S.label}>파일 업로드 (선택)</label>
          {uploadedFile ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem', background: '#f7f6f3', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
              <span style={{ fontSize: '0.78rem', color: '#37352f' }}>📄 {uploadedFile.name}</span>
              <button type="button" onClick={() => { setUploadedFile(null); setContent(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '0.9rem' }}>✕</button>
            </div>
          ) : (
            <div
              style={{ border: '1px dashed #d1d5db', borderRadius: '4px', background: '#fafafa', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.4rem', cursor: 'pointer', color: '#6b6b6b', fontSize: '0.78rem' }}>
                {isProcessing ? '⏳ 처리 중...' : '📎 PDF/TXT 업로드'}
              </label>
              <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} disabled={isProcessing} />
            </div>
          )}
        </div>

        {/* 원본 텍스트 */}
        <div>
          <label style={S.label}>원본 텍스트 *</label>
          <textarea
            style={{ ...S.input, resize: 'vertical', minHeight: '80px', lineHeight: 1.4 }}
            placeholder="대본으로 변환할 텍스트를 입력하세요..."
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.cancelBtn} onClick={onCancel} disabled={isLoading}>취소</button>
        <button type="submit" style={{ ...S.submitBtn, flex: 2, opacity: !content.trim() || isLoading ? 0.5 : 1 }} disabled={!content.trim() || isLoading}>
          {isLoading ? '생성 중...' : '대본 생성'}
        </button>
      </div>
    </form>
  );
}
