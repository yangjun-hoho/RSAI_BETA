'use client';

import { useState } from 'react';

const OPTIONS1 = [
  { id: '공문체',      desc: '공식 공문서 형식' },
  { id: '구어체',      desc: '자연스러운 구어체' },
  { id: '맞춤법 교정', desc: '맞춤법·문법 교정' },
  { id: '쉬운 표현',   desc: '쉬운 표현으로 변환' },
];

const REDUCE_OPTIONS = ['10%', '20%', '30%', '50%'];
const BULLET_OPTIONS = ['2개', '3개', '4개'];

interface Props {
  onClose: () => void;
  isPopup?: boolean;
}

export default function TextTransformPanel({ onClose, isPopup }: Props) {
  const [inputText, setInputText]             = useState('');
  const [selectedOption1, setSelectedOption1] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');
  const [result, setResult]                   = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState('');
  const [copied, setCopied]                   = useState(false);

  async function handleTransform() {
    if (!inputText.trim()) { setError('변환할 텍스트를 입력해주세요.'); return; }
    if (!selectedOption1 && !selectedOption2 && !selectedOption3) { setError('변환 옵션을 하나 이상 선택해주세요.'); return; }
    setIsLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/work-support/text-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          option1: selectedOption1 || undefined,
          option2: selectedOption2 || undefined,
          option3: selectedOption3 || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '변환 실패'); return; }
      setResult(data.result ?? '');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const containerStyle: React.CSSProperties = isPopup
    ? { width: '100%', height: '100vh', background: '#f8f8f4ff', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }
    : { position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#f5f6fa', borderLeft: '1px solid rgba(99,102,241,0.1)', boxShadow: '-8px 0 40px rgba(99,102,241,0.12)', display: 'flex', flexDirection: 'column', zIndex: 200, fontFamily: 'inherit' };

  const activeCount = [selectedOption1, selectedOption2, selectedOption3].filter(Boolean).length;

  return (
    <>
      <style>{`
        @keyframes tt-spin { to { transform: rotate(360deg); } }
        @keyframes tt-slide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .tt-chip { transition: all 0.15s cubic-bezier(0.4,0,0.2,1); }
        .tt-chip:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.08); }
        .tt-textarea { outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .tt-textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        .tt-submit { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .tt-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(99,102,241,0.45) !important; }
        .tt-submit:active:not(:disabled) { transform: translateY(0); }
        .tt-copy:hover { border-color: #6366f1 !important; color: #6366f1 !important; }
      `}</style>

      <div style={containerStyle}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '5px 18px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px',
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>텍스트 변환</div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.65)', marginTop: '1px', letterSpacing: '0.01em' }}>문체 · 맞춤법 · 표현</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
              color: 'white', borderRadius: '8px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── 본문 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* 원본 텍스트 카드 */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid rgba(99,102,241,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#6366f1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>원본 텍스트</span>
              {inputText && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>{inputText.length}자</span>
              )}
            </div>
            <textarea
              className="tt-textarea"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="변환할 텍스트를 붙여넣으세요..."
              rows={5}
              style={{
                width: '100%', padding: '10px 12px', height: '70px',
                border: '1.5px solid #e9ecf0', borderRadius: '9px',
                fontSize: '13px', lineHeight: 1.7, resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit', color: '#1f2937',
                background: '#f9fafb',
              }}
            />
          </div>

          {/* 변환 결과 카드 */}
          {result && (
            <div style={{
              background: 'white', borderRadius: '14px', padding: '14px',
              boxShadow: '0 1px 6px rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              animation: 'tt-slide 0.25s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>변환 완료</span>
                </div>
                <button
                  className="tt-copy"
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 11px', border: '1.5px solid',
                    borderColor: copied ? '#10b981' : '#e5e7eb',
                    borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    color: copied ? '#10b981' : '#6b7280',
                    background: copied ? '#f0fdf4' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? (
                    <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>복사됨</>
                  ) : (
                    <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>복사</>
                  )}
                </button>
              </div>
              <div style={{
                padding: '12px 14px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                border: '1px solid #bbf7d0', borderRadius: '9px',
                fontSize: '13px', lineHeight: 1.75, color: '#1f2937',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {result}
              </div>
            </div>
          )}

          {/* 옵션 카드 */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid rgba(99,102,241,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase' }}>변환 옵션</span>
              {activeCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: 'white', borderRadius: '10px', padding: '2px 8px',
                  fontSize: '10px', fontWeight: 700,
                }}>
                  {activeCount}개 선택
                </span>
              )}
            </div>

            {/* 문체 변환 */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>문체 변환</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {OPTIONS1.map(opt => {
                  const active = selectedOption1 === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className="tt-chip"
                      onClick={() => setSelectedOption1(prev => prev === opt.id ? '' : opt.id)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
                        borderColor: active ? '#6366f1' : '#e9ecf0',
                        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white',
                        color: active ? 'white' : '#4b5563',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      }}
                    >
                      {opt.id}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 -14px 14px' }} />

            {/* 줄이기 */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>텍스트 줄이기</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {REDUCE_OPTIONS.map(pct => {
                  const active = selectedOption2 === pct;
                  return (
                    <button
                      key={pct}
                      className="tt-chip"
                      onClick={() => setSelectedOption2(prev => prev === pct ? '' : pct)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: '9px', border: '1.5px solid',
                        borderColor: active ? '#6366f1' : '#e9ecf0',
                        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white',
                        color: active ? 'white' : '#4b5563',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      }}
                    >
                      {pct}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 -14px 14px' }} />

            {/* 개조식 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>개조식 항목 수</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {BULLET_OPTIONS.map(cnt => {
                  const active = selectedOption3 === cnt;
                  return (
                    <button
                      key={cnt}
                      className="tt-chip"
                      onClick={() => setSelectedOption3(prev => prev === cnt ? '' : cnt)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: '9px', border: '1.5px solid',
                        borderColor: active ? '#8b5cf6' : '#e9ecf0',
                        background: active ? 'linear-gradient(135deg,#8b5cf6,#a78bfa)' : 'white',
                        color: active ? 'white' : '#4b5563',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                        boxShadow: active ? '0 2px 8px rgba(139,92,246,0.3)' : 'none',
                      }}
                    >
                      {cnt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', color: '#ef4444', padding: '10px 13px',
              background: '#fef2f2', borderRadius: '9px', border: '1px solid #fecaca', fontWeight: 500,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* 변환 버튼 */}
          <button
            className="tt-submit"
            onClick={handleTransform}
            disabled={isLoading}
            style={{
              width: '100%', padding: '13px',
              background: isLoading
                ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)'
                : 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
              color: 'white', border: 'none', borderRadius: '11px',
              fontSize: '13.5px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: isLoading ? 'none' : '0 4px 18px rgba(99,102,241,0.4)',
              letterSpacing: '-0.01em',
            }}
          >
            {isLoading ? (
              <>
                <svg style={{ animation: 'tt-spin 0.75s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                변환 중...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                변환하기
                {activeCount > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: '10px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 }}>
                    {activeCount}개 옵션
                  </span>
                )}
              </>
            )}
          </button>

        </div>
      </div>
    </>
  );
}
