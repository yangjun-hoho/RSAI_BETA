'use client';

import { useState } from 'react';

const STYLE_OPTIONS  = ['공문체', '구어체', '맞춤법 교정', '쉬운 표현'];
const PCT_OPTIONS    = ['10%', '20%', '30%', '50%'];
const BULLET_OPTIONS = ['2개', '3개', '4개'];
const KW_COUNT_OPTIONS = [3, 5, 7];
const TABS = ['문체 변환', '길이 조절', '키워드'];

/* ── color tokens ──────────────────────────────── */
const C = {
  ink:        '#111827',   // 헤더·활성버튼 배경, 기본 텍스트
  dark:       '#374151',   // 레이블, 아이콘
  mid:        '#6b7280',   // 보조 텍스트
  muted:      '#9ca3af',   // 비활성 탭 텍스트
  border:     '#e5e7eb',   // 기본 테두리
  borderDark: '#d1d5db',   // 조금 진한 테두리
  panel:      '#f4f4f4',   // 우측 패널 배경
  chip:       '#f3f4f6',   // 비활성 칩 배경
  inputBg:    '#f9fafb',   // textarea 배경
};

interface Props { onClose: () => void; isPopup?: boolean; }

export default function TextTransformPanel({ onClose, isPopup }: Props) {
  const [inputText, setInputText]   = useState('');
  const [result, setResult]         = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [copied, setCopied]         = useState(false);

  const [activeTab, setActiveTab]           = useState(0);
  const [selectedStyle, setSelectedStyle]   = useState('');
  const [lengthMode, setLengthMode]         = useState<'reduce' | 'expand'>('reduce');
  const [selectedPct, setSelectedPct]       = useState('');
  const [selectedBullet, setSelectedBullet] = useState('');
  const [kwCount, setKwCount]               = useState(5);
  const [keywords, setKeywords]             = useState<string[]>([]);
  const [synonymsMap, setSynonymsMap]       = useState<Record<string, string[]>>({});
  const [openKw, setOpenKw]                 = useState<string | null>(null);
  const [loadingKw, setLoadingKw]           = useState<string | null>(null);
  const [replacedText, setReplacedText]     = useState('');

  const displayResult = activeTab === 2 ? replacedText : result;

  function getButtonLabel() {
    if (activeTab === 0) return '변환하기';
    if (activeTab === 1) {
      if (selectedBullet) return '변환하기';
      return lengthMode === 'expand' ? '늘리기' : '줄이기';
    }
    return '키워드 추출';
  }

  async function handleSubmit() {
    if (!inputText.trim()) { setError('변환할 텍스트를 입력해주세요.'); return; }
    setError('');
    if (activeTab === 0) {
      if (!selectedStyle) { setError('문체 옵션을 선택해주세요.'); return; }
      await callTransform({ option1: selectedStyle });
    } else if (activeTab === 1) {
      if (selectedBullet) {
        await callTransform({ option3: selectedBullet });
      } else if (selectedPct) {
        if (lengthMode === 'reduce') await callTransform({ option2: selectedPct });
        else await callTransform({ mode: 'expand', expandPercent: selectedPct });
      } else {
        setError('옵션을 선택해주세요.');
      }
    } else {
      await callKeywords();
    }
  }

  async function callTransform(body: Record<string, unknown>) {
    setIsLoading(true); setResult(''); setKeywords([]); setReplacedText('');
    try {
      const res = await fetch('/api/work-support/text-transform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, ...body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '변환 실패'); return; }
      setResult(data.result ?? '');
    } catch { setError('네트워크 오류가 발생했습니다.'); }
    finally { setIsLoading(false); }
  }

  async function callKeywords() {
    setIsLoading(true); setResult(''); setKeywords([]); setReplacedText(''); setSynonymsMap({});
    try {
      const res = await fetch('/api/work-support/text-transform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mode: 'keywords', keywordCount: kwCount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '추출 실패'); return; }
      setKeywords(data.keywords ?? []);
    } catch { setError('네트워크 오류가 발생했습니다.'); }
    finally { setIsLoading(false); }
  }

  async function handleKeywordClick(kw: string) {
    if (openKw === kw) { setOpenKw(null); return; }
    setOpenKw(kw);
    if (synonymsMap[kw]) return;
    setLoadingKw(kw);
    try {
      const res = await fetch('/api/work-support/text-transform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mode: 'synonyms', keyword: kw }),
      });
      const data = await res.json();
      if (res.ok && data.synonyms) setSynonymsMap(prev => ({ ...prev, [kw]: data.synonyms }));
    } catch {}
    finally { setLoadingKw(null); }
  }

  function handleSynonymSelect(original: string, replacement: string) {
    const base = replacedText || inputText;
    setReplacedText(base.split(original).join(replacement));
    setKeywords(prev => prev.map(k => k === original ? replacement : k));
    setSynonymsMap(prev => {
      const next = { ...prev };
      if (next[original]) { next[replacement] = next[original].filter(s => s !== replacement); delete next[original]; }
      return next;
    });
    setOpenKw(null);
  }

  function handleCopy() {
    if (!displayResult) return;
    navigator.clipboard.writeText(displayResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── chip button style helper ── */
  function chipStyle(active: boolean): React.CSSProperties {
    return {
      borderRadius: '6px', border: `1.5px solid ${active ? C.ink : C.border}`,
      background: active ? C.ink : 'white',
      color: active ? 'white' : C.dark,
      cursor: 'pointer', fontSize: '12px', fontWeight: 400,
      boxShadow: active ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
      transition: 'all 0.13s',
    };
  }

  /* ── section label style ── */
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 800, color: C.dark,
    marginBottom: '8px', letterSpacing: '0.02em',
  };

  /* ── tab content ── */
  function renderTabContent() {
    /* Tab 0: 문체 변환 */
    if (activeTab === 0) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
          {STYLE_OPTIONS.map(opt => {
            const active = selectedStyle === opt;
            return (
              <button key={opt} className="tt-chip"
                onClick={() => setSelectedStyle(p => p === opt ? '' : opt)}
                style={{ ...chipStyle(active), padding: '8px 6px', textAlign: 'center' }}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    /* Tab 1: 길이 조절 */
    if (activeTab === 1) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={labelStyle}>방향</div>
            <div style={{ display: 'flex', gap: '7px' }}>
              {(['reduce', 'expand'] as const).map(mode => {
                const active = lengthMode === mode;
                return (
                  <button key={mode} className="tt-chip"
                    onClick={() => { setLengthMode(mode); setSelectedPct(''); }}
                    style={{ ...chipStyle(active), flex: 1, padding: '8px 0' }}>
                    {mode === 'reduce' ? '줄이기 ↓' : '늘리기 ↑'}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={labelStyle}>비율</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PCT_OPTIONS.map(pct => {
                const active = selectedPct === pct;
                return (
                  <button key={pct} className="tt-chip"
                    onClick={() => { setSelectedPct(p => p === pct ? '' : pct); setSelectedBullet(''); }}
                    style={{ ...chipStyle(active), flex: 1, padding: '8px 0' }}>
                    {pct}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ height: '1px', background: C.border }} />
          <div>
            <div style={labelStyle}>개조식 변환</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {BULLET_OPTIONS.map(cnt => {
                const active = selectedBullet === cnt;
                return (
                  <button key={cnt} className="tt-chip"
                    onClick={() => { setSelectedBullet(p => p === cnt ? '' : cnt); setSelectedPct(''); }}
                    style={{ ...chipStyle(active), flex: 1, padding: '8px 0' }}>
                    {cnt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    /* Tab 2: 키워드 */
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={labelStyle}>추출 개수</div>
          <div style={{ display: 'flex', gap: '7px' }}>
            {KW_COUNT_OPTIONS.map(n => {
              const active = kwCount === n;
              return (
                <button key={n} className="tt-chip"
                  onClick={() => setKwCount(n)}
                  style={{ ...chipStyle(active), flex: 1, padding: '8px 0' }}>
                  {n}개
                </button>
              );
            })}
          </div>
        </div>

        {keywords.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
            <div style={{ ...labelStyle, marginBottom: '10px' }}>
              추출된 키워드 ({keywords.length}개)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {keywords.map(kw => (
                <div key={kw} style={{ position: 'relative' }}>
                  <button className="tt-kw-chip"
                    onClick={() => handleKeywordClick(kw)}
                    style={{
                      padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${openKw === kw ? C.ink : C.borderDark}`,
                      background: openKw === kw ? C.ink : C.chip,
                      color: openKw === kw ? 'white' : C.dark,
                      fontSize: '12px', fontWeight: 400,
                      display: 'flex', alignItems: 'center', gap: '5px',
                      boxShadow: openKw === kw ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                    }}>
                    {loadingKw === kw
                      ? <svg style={{ animation: 'tt-spin 0.75s linear infinite' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    }
                    {kw}
                  </button>
                  {openKw === kw && synonymsMap[kw] && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 5px)', left: 0, zIndex: 200,
                      background: 'white', border: `1px solid ${C.border}`, borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      minWidth: '130px', overflow: 'hidden', animation: 'tt-fade 0.15s ease',
                    }}>
                      <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 800, color: C.dark, borderBottom: `1px solid ${C.border}`, background: C.chip, letterSpacing: '0.02em' }}>
                        대체어 선택
                      </div>
                      {synonymsMap[kw].map(syn => (
                        <div key={syn} className="tt-syn-item" onClick={() => handleSynonymSelect(kw, syn)}>
                          {syn}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '9px 11px', background: C.chip, borderRadius: '7px', fontSize: '11px', fontWeight: 400, color: C.mid, lineHeight: 1.6, border: `1px solid ${C.border}` }}>
          추출 후 키워드 칩 클릭 → 유사어 제안 → 선택 시 결과창에 반영
        </div>
      </div>
    );
  }

  /* ── CSS ── */
  const CSS = `
    @keyframes tt-spin  { to { transform: rotate(360deg); } }
    @keyframes tt-slide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes tt-fade  { from { opacity:0; } to { opacity:1; } }
    .tt-chip { transition: all 0.13s ease; }
    .tt-chip:hover { filter: brightness(0.95); transform: translateY(-1px); }
    .tt-textarea { outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .tt-textarea:focus { border-color: #374151 !important; box-shadow: 0 0 0 3px rgba(55,65,81,0.1) !important; }
    .tt-submit { transition: all 0.18s ease; }
    .tt-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.25) !important; }
    .tt-submit:active:not(:disabled) { transform: translateY(0); }
    .tt-copy:hover { border-color: #374151 !important; color: #111827 !important; }
    .tt-tab { transition: all 0.15s ease; cursor: pointer; border-radius: 6px; }
    .tt-tab:hover { background: rgba(255,255,255,0.8) !important; color: #111827 !important; }
    .tt-kw-chip { transition: all 0.13s ease; cursor: pointer; }
    .tt-kw-chip:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.12); }
    .tt-syn-item { padding: 7px 12px; font-size: 12px; font-weight: 400; color: #374151; cursor: pointer; transition: background 0.1s; }
    .tt-syn-item:hover { background: #f3f4f6; color: #111827; }
    .tt-tab-content { animation: tt-fade 0.16s ease; }
    @media (max-width: 440px) {
      .tt-popup-body { flex-direction: column !important; }
      .tt-left-panel { flex: none !important; height: 45vh !important; }
      .tt-right-panel { flex: none !important; height: 55vh !important; }
    }
  `;

  /* ── header ── */
  function renderHeader() {
    return (
      <div style={{
        padding: '7px 18px', flexShrink: 0,
        background: C.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>텍스트 변환</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>문체 · 길이 · 키워드</div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    );
  }

  /* ── tab nav ── */
  function renderTabNav(size: 'lg' | 'sm') {
    const pad = size === 'lg' ? '8px 4px' : '7px 4px';
    const fs  = size === 'lg' ? '12px' : '11.5px';
    return (
      <div style={{ display: 'flex', gap: '4px', padding: '7px', background: '#e0e0e0', flexShrink: 0, ...(size === 'sm' ? { borderRadius: '14px 14px 0 0' } : { borderBottom: `1px solid ${C.border}` }) }}>
        {TABS.map((label, i) => (
          <button key={i} className="tt-tab"
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: pad, fontSize: fs,
              fontWeight: activeTab === i ? 700 : 400,
              color: activeTab === i ? C.ink : C.muted,
              background: activeTab === i ? 'white' : 'transparent',
              border: `1px solid ${activeTab === i ? C.borderDark : '#c8c8c8'}`,
              boxShadow: activeTab === i ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transform: activeTab === i ? 'translateY(-1px)' : 'translateY(0)',
            }}>
            {label}
          </button>
        ))}
      </div>
    );
  }

  /* ── submit button ── */
  function renderSubmitBtn(padStyle: React.CSSProperties) {
    return (
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: 'white', ...padStyle }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#ef4444', padding: '8px 2px 0', fontWeight: 500 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        <button className="tt-submit" onClick={handleSubmit} disabled={isLoading}
          style={{
            width: '100%', padding: '12px',
            background: isLoading ? '#9ca3af' : C.ink,
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '13.5px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            boxShadow: isLoading ? 'none' : '0 3px 12px rgba(0,0,0,0.2)',
            marginTop: error ? '8px' : '0',
          }}>
          {isLoading ? (
            <>
              <svg style={{ animation: 'tt-spin 0.75s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {activeTab === 2 ? '추출 중...' : '변환 중...'}
            </>
          ) : (
            <>
              {activeTab === 2
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              }
              {getButtonLabel()}
            </>
          )}
        </button>
      </div>
    );
  }

  /* ── copy button ── */
  function renderCopyBtn() {
    return (
      <button className="tt-copy" onClick={handleCopy}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 11px', border: `1.5px solid ${copied ? C.dark : C.border}`, borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 500, color: copied ? C.ink : C.mid, background: copied ? C.chip : 'white', transition: 'all 0.15s' }}>
        {copied
          ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>복사됨</>
          : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>복사</>
        }
      </button>
    );
  }

  /* ════════════════════════════════════════════
     POPUP: 2-column layout
  ════════════════════════════════════════════ */
  if (isPopup) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', background: '#ebebeb' }}>
          {renderHeader()}

          <div className="tt-popup-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ── LEFT panel 60% ── */}
            <div className="tt-left-panel" style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>

              {/* 원본 */}
              <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', padding: '16px 18px 10px', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: C.dark, letterSpacing: '0.02em' }}>원본 텍스트</span>
                  {inputText && <span style={{ marginLeft: 'auto', fontSize: '11px', color: C.muted, fontWeight: 400 }}>{inputText.length}자</span>}
                </div>
                <textarea className="tt-textarea"
                  value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="변환할 텍스트를 붙여넣으세요..."
                  style={{
                    flex: 1, width: '100%', padding: '10px 12px',
                    border: `1.5px solid ${C.border}`, borderRadius: '8px',
                    fontSize: '13px', lineHeight: 1.7, resize: 'none', fontWeight: 400,
                    boxSizing: 'border-box', fontFamily: 'inherit', color: C.ink, background: C.inputBg,
                  }}
                />
              </div>

              <div style={{ height: '1px', background: C.border, flexShrink: 0 }} />

              {/* 결과 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 18px 16px', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: displayResult ? C.dark : C.muted, letterSpacing: '0.02em' }}>
                      변환 결과
                    </span>
                  </div>
                  {displayResult && renderCopyBtn()}
                </div>
                <div style={{
                  flex: 1, borderRadius: '8px', overflow: 'auto',
                  border: displayResult ? `1px solid ${C.borderDark}` : `1.5px dashed ${C.border}`,
                  background: displayResult ? '#fafafa' : C.inputBg,
                  padding: '12px 14px',
                  fontSize: '13px', fontWeight: 400, lineHeight: 1.75, color: C.ink,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  display: 'flex', alignItems: displayResult ? 'flex-start' : 'center', justifyContent: displayResult ? 'flex-start' : 'center',
                }}>
                  {displayResult || (
                    <span style={{ color: C.muted, fontSize: '12.5px', fontStyle: 'italic', textAlign: 'center', fontWeight: 400 }}>
                      변환 결과가 여기에 표시됩니다
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ width: '1px', background: C.border, flexShrink: 0 }} />

            {/* ── RIGHT panel 40% ── */}
            <div className="tt-right-panel" style={{ flex: '0 0 40%', background: C.panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderTabNav('lg')}
              <div className="tt-tab-content" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
                {renderTabContent()}
              </div>
              {renderSubmitBtn({ padding: '12px 16px' })}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════
     SIDEBAR: single-column layout
  ════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#f4f4f4', borderLeft: `1px solid ${C.border}`, boxShadow: '-6px 0 30px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', zIndex: 200, fontFamily: 'inherit' }}>
        {renderHeader()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* input */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '13px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 800, color: C.dark, letterSpacing: '0.02em' }}>원본 텍스트</span>
              {inputText && <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: C.muted, fontWeight: 400 }}>{inputText.length}자</span>}
            </div>
            <textarea className="tt-textarea" value={inputText} onChange={e => setInputText(e.target.value)}
              placeholder="변환할 텍스트를 붙여넣으세요..."
              style={{ width: '100%', padding: '9px 11px', height: '70px', border: `1.5px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 400, color: C.ink, background: C.inputBg }}
            />
          </div>

          {/* result */}
          {displayResult && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '13px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${C.borderDark}`, animation: 'tt-slide 0.25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: C.dark, letterSpacing: '0.02em' }}>변환 결과</span>
                {renderCopyBtn()}
              </div>
              <div style={{ padding: '10px 12px', background: '#fafafa', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', fontWeight: 400, lineHeight: 1.75, color: C.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {displayResult}
              </div>
            </div>
          )}

          {/* options card with tabs */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`, overflow: 'visible' }}>
            {renderTabNav('sm')}
            <div className="tt-tab-content" style={{ padding: '14px' }}>
              {renderTabContent()}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: '#ef4444', padding: '9px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: 500 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button className="tt-submit" onClick={handleSubmit} disabled={isLoading}
            style={{
              width: '100%', padding: '12px',
              background: isLoading ? C.muted : C.ink,
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '13.5px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: isLoading ? 'none' : '0 3px 12px rgba(0,0,0,0.2)',
            }}>
            {isLoading ? (
              <>
                <svg style={{ animation: 'tt-spin 0.75s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                {activeTab === 2 ? '추출 중...' : '변환 중...'}
              </>
            ) : (
              <>
                {activeTab === 2
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                }
                {getButtonLabel()}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
