'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateConfig, OutputSection } from './types';

interface TemplateRunnerProps {
  template: TemplateConfig;
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.4rem 0.6rem',
  border: '1px solid #e0e0e0', borderRadius: '6px',
  fontSize: '0.82rem', background: 'white', color: '#1a1a1a',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: '600', color: '#555',
  marginBottom: '0.25rem', display: 'block',
};

export default function TemplateRunner({ template, onBack }: TemplateRunnerProps) {
  const router = useRouter();
  const [formData, setFormData]       = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);

  // JSON 섹션 모드
  const [sections, setSections]       = useState<OutputSection[]>([]);

  // 스트리밍 텍스트 모드
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);

  function handleChange(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  // ── 스트리밍 제출 ──────────────────────────────────────────────────────────
  async function handleStreamingSubmit() {
    setIsLoading(true);
    setIsStreaming(true);
    setError('');
    setStreamedText('');

    try {
      const res = await fetch(template.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '생성에 실패했습니다.');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) setStreamedText(prev => prev + parsed.text);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }

  // ── JSON 섹션 제출 ─────────────────────────────────────────────────────────
  async function handleJsonSubmit() {
    setIsLoading(true);
    setError('');
    setSections([]);

    try {
      const res = await fetch(template.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '생성에 실패했습니다.');
      }
      const data = await res.json();
      setSections(data.sections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (template.streaming) {
      handleStreamingSubmit();
    } else {
      handleJsonSubmit();
    }
  }

  function handleCopy() {
    const text = template.streaming
      ? streamedText
      : sections.map(s => `[${s.title}]\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hasOutput = template.streaming ? streamedText.length > 0 : sections.length > 0;

  return (
    <>
      {/* 커서 깜빡임 애니메이션 */}
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .stream-cursor { animation: blink 0.9s infinite; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9f9f7' }}>
        {/* 상단 헤더 */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e9e9e7', background: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#555' }}
          >
            ← 목록
          </button>
          <span style={{ fontSize: '1.05rem' }}>{template.icon}</span>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a1a' }}>{template.name}</span>
          <span style={{ padding: '0.15rem 0.5rem', background: '#f0f4ff', color: '#0066cc', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600' }}>
            {template.category}
          </span>
          {template.streaming && (
            <span style={{ padding: '0.15rem 0.5rem', background: '#f0fff4', color: '#059669', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600' }}>
              ⚡ 스트리밍
            </span>
          )}
          {hasOutput && (
            <button
              onClick={handleCopy}
              style={{ marginLeft: 'auto', padding: '0.3rem 0.65rem', background: copied ? '#059669' : 'var(--focus-color)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#555', marginLeft: hasOutput ? '0' : 'auto' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9f9f7'; e.currentTarget.style.borderColor = '#c0c0c0'; e.currentTarget.style.color = '#1a1a1a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#555'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            홈
          </button>
        </div>

        {/* 본문: 좌측 입력 + 우측 결과 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 좌측: 입력 폼 */}
          <div style={{ width: '360px', flexShrink: 0, borderRight: '1px solid #e9e9e7', background: 'white', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {template.fields.map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>
                    {field.label}{field.required && <span style={{ color: '#e53e3e' }}> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={field.rows ?? 4}
                      required={field.required}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      required={field.required}
                      style={inputStyle}
                    >
                      <option value="">선택하세요</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox-group' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.25rem 0' }}>
                      {field.options?.map(opt => {
                        const selected = (formData[field.key] || '').split(',').filter(Boolean);
                        const isChecked = selected.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              cursor: 'pointer', fontSize: '0.82rem',
                              color: '#333', userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...selected, opt.value]
                                  : selected.filter(v => v !== opt.value);
                                handleChange(field.key, next.join(','));
                              }}
                              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#0066cc' }}
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}

              {error && (
                <div style={{ padding: '0.5rem 0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.78rem', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{ width: '100%', padding: '0.6rem', background: isLoading ? '#aaa' : '#0066cc', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}
              >
                {isLoading ? '⏳ 생성 중...' : '✨ 답변 생성'}
              </button>
            </form>
          </div>

          {/* 우측: 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', background: '#f9f9f7' }}>

            {/* ── 스트리밍 텍스트 출력 ── */}
            {template.streaming ? (
              streamedText || isLoading ? (
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e9e9e7', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', minHeight: '200px' }}>
                  <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '0.84rem', color: '#37352f', lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {streamedText}
                    {isStreaming && <span className="stream-cursor" style={{ color: '#0066cc', fontWeight: 'bold' }}>▌</span>}
                  </pre>
                </div>
              ) : (
                <EmptyState icon={template.icon} name={template.name} />
              )

            /* ── JSON 섹션 출력 ── */
            ) : sections.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sections.map((section, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '8px', border: '1px solid #e9e9e7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '0.55rem 1rem', background: '#f0f4ff', borderBottom: '1px solid #dce6f9' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0066cc' }}>{section.title}</span>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', fontSize: '0.84rem', color: '#37352f', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: '#6b6b6b' }}>
                <div className="loading-spinner" />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>AI가 답변을 생성하고 있습니다...</p>
              </div>
            ) : (
              <EmptyState icon={template.icon} name={template.name} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ icon, name }: { icon: string; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9b9a97', textAlign: 'center' }}>
      <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', fontWeight: '600', color: '#555' }}>{name} 답변 생성</p>
      <p style={{ margin: 0, fontSize: '0.82rem' }}>좌측 폼을 작성하고 <strong>답변 생성</strong> 버튼을 누르세요</p>
    </div>
  );
}
