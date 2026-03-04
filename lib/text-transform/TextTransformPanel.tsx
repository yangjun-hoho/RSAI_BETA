'use client';

import { useState } from 'react';

const OPTIONS1 = [
  { id: '공문체',     desc: '공식 공문서 형식' },
  { id: '구어체',     desc: '자연스러운 구어체' },
  { id: '맞춤법 교정', desc: '맞춤법·문법 교정' },
  { id: '쉬운 표현',  desc: '쉬운 표현으로 변환' },
];

const REDUCE_OPTIONS = ['10%', '20%', '30%', '50%'];
const BULLET_OPTIONS = ['2개', '3개', '4개'];

interface Props {
  onClose: () => void;
  isPopup?: boolean;
}

export default function TextTransformPanel({ onClose, isPopup }: Props) {
  const [inputText, setInputText]       = useState('');
  const [selectedOption1, setSelectedOption1] = useState('');
  const [selectedOption2, setSelectedOption2] = useState('');
  const [selectedOption3, setSelectedOption3] = useState('');
  const [result, setResult]             = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);

  async function handleTransform() {
    if (!inputText.trim()) { setError('변환할 텍스트를 입력해주세요.'); return; }
    if (!selectedOption1 && !selectedOption2 && !selectedOption3) { setError('변환 옵션을 하나 이상 선택해주세요.'); return; }
    setIsLoading(true);
    setError('');
    setResult('');
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
    ? { width: '100%', height: '100vh', background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }
    : { position: 'fixed', right: 0, top: 0, bottom: 0, width: '420px', background: 'white', borderLeft: '1px solid #e5e7eb', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', zIndex: 200, fontFamily: 'inherit' };

  const btnLabel = [selectedOption1, selectedOption2, selectedOption3 ? `개조식 ${selectedOption3}` : ''].filter(Boolean).join(' + ');

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>텍스트 변환</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>문체·맞춤법·표현</span>
        </div>
        <button
          onClick={onClose}
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', borderRadius: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* 원본 텍스트 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>원본 텍스트</div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="변환할 텍스트를 붙여넣으세요..."
            rows={5}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#374151' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
        </div>

        {/* 변환 텍스트 - 원본 텍스트 바로 하단 */}
        {result && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>변환 텍스트</div>
              <button
                onClick={handleCopy}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: '5px', background: copied ? '#f0fdf4' : 'white', cursor: 'pointer', fontSize: '11px', color: copied ? '#16a34a' : '#6b7280', fontWeight: 500 }}
              >
                {copied ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>복사됨</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>복사</>
                )}
              </button>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', lineHeight: 1.7, color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result}
            </div>
          </div>
        )}

        {/* 변환 옵션1 - 문체 변환 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            변환 옵션 1 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>문체 변환</span>
          </div>
          <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
            {OPTIONS1.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOption1(prev => prev === opt.id ? '' : opt.id)}
                style={{
                  flex: 1, padding: '9px 4px', border: 'none',
                  borderLeft: i > 0 ? '1px solid #e5e7eb' : 'none',
                  background: selectedOption1 === opt.id ? '#3b82f6' : 'white',
                  color: selectedOption1 === opt.id ? 'white' : '#374151',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (selectedOption1 !== opt.id) { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; } }}
                onMouseLeave={e => { if (selectedOption1 !== opt.id) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151'; } }}
              >
                {opt.id}
              </button>
            ))}
          </div>
        </div>

        {/* 변환 옵션2 - 줄이기 % */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            변환 옵션 2 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>줄이기</span>
          </div>
          <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
            {REDUCE_OPTIONS.map((pct, i) => (
              <button
                key={pct}
                onClick={() => setSelectedOption2(prev => prev === pct ? '' : pct)}
                style={{
                  flex: 1, padding: '9px 0', border: 'none',
                  borderLeft: i > 0 ? '1px solid #e5e7eb' : 'none',
                  background: selectedOption2 === pct ? '#3b82f6' : 'white',
                  color: selectedOption2 === pct ? 'white' : '#374151',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (selectedOption2 !== pct) { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; } }}
                onMouseLeave={e => { if (selectedOption2 !== pct) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151'; } }}
              >
                {pct}
              </button>
            ))}
          </div>
        </div>

        {/* 변환 옵션3 - 개조식 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            변환 옵션 3 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>개조식</span>
          </div>
          <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
            {BULLET_OPTIONS.map((cnt, i) => (
              <button
                key={cnt}
                onClick={() => setSelectedOption3(prev => prev === cnt ? '' : cnt)}
                style={{
                  flex: 1, padding: '9px 0', border: 'none',
                  borderLeft: i > 0 ? '1px solid #e5e7eb' : 'none',
                  background: selectedOption3 === cnt ? '#7c3aed' : 'white',
                  color: selectedOption3 === cnt ? 'white' : '#374151',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (selectedOption3 !== cnt) { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#7c3aed'; } }}
                onMouseLeave={e => { if (selectedOption3 !== cnt) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151'; } }}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* 오류 */}
        {error && (
          <div style={{ fontSize: '12px', color: '#ef4444', padding: '7px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* 변환 버튼 */}
        <button
          onClick={handleTransform}
          disabled={isLoading}
          style={{ width: '100%', padding: '9px', background: isLoading ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#2563eb'; }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = '#3b82f6'; }}
        >
          {isLoading ? '변환 중...' : `변환하기${btnLabel ? ` (${btnLabel})` : ''}`}
        </button>

      </div>
    </div>
  );
}
