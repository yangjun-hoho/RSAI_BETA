'use client';
import { useRef, useLayoutEffect, useState } from 'react';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  nodes: DocumentNode[];
}

const BASE_FONT_PT = 20;
const DEFAULT_LS = 0.03;  // em — 기본 자간
const MIN_LS = -0.08;     // em — 자간 최솟값

function FittedTitle({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(`${BASE_FONT_PT}pt`);
  const [letterSpacing, setLetterSpacing] = useState(`${DEFAULT_LS}em`);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const ruler = rulerRef.current;
      if (!container || !ruler) return;

      const containerWidth = container.offsetWidth;
      if (containerWidth <= 0) return;

      // 1단계: 기본 자간으로 측정
      ruler.style.fontSize = `${BASE_FONT_PT}pt`;
      ruler.style.letterSpacing = `${DEFAULT_LS}em`;
      void ruler.offsetWidth; // force reflow
      const defaultWidth = ruler.offsetWidth;

      if (defaultWidth <= containerWidth) {
        setFontSize(`${BASE_FONT_PT}pt`);
        setLetterSpacing(`${DEFAULT_LS}em`);
        return;
      }

      // 2단계: 최소 자간으로 측정 (폰트 크기 유지)
      ruler.style.letterSpacing = `${MIN_LS}em`;
      void ruler.offsetWidth;
      const minLsWidth = ruler.offsetWidth;

      if (minLsWidth <= containerWidth) {
        // 자간 조정만으로 해결 — 선형 보간
        const ratio = (containerWidth - defaultWidth) / (minLsWidth - defaultWidth);
        const ls = DEFAULT_LS + ratio * (MIN_LS - DEFAULT_LS);
        setFontSize(`${BASE_FONT_PT}pt`);
        setLetterSpacing(`${ls.toFixed(4)}em`);
        return;
      }

      // 3단계: 최소 자간으로도 부족 → 폰트 크기 축소
      const scale = containerWidth / minLsWidth;
      setFontSize(`${(BASE_FONT_PT * scale).toFixed(2)}pt`);
      setLetterSpacing(`${MIN_LS}em`);
    };

    measure();

    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [content]);

  return (
    <div ref={containerRef} style={{ textAlign: 'center', padding: '10px 0', position: 'relative' }}>
      {/* 측정용 ruler — 보이지 않음, 레이아웃 영향 없음 */}
      <span
        ref={rulerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          fontSize: `${BASE_FONT_PT}pt`,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {content}
      </span>
      {/* 표시용 */}
      <span style={{
        display: 'inline-block',
        fontSize,
        fontWeight: 700,
        letterSpacing,
        color: '#111',
        whiteSpace: 'nowrap',
      }}>
        {content}
      </span>
    </div>
  );
}

export default function PreviewPanel({ nodes }: Props) {
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#9ca3af', fontSize: '0.875rem',
      }}>
        문서를 생성하면 미리보기가 표시됩니다.
      </div>
    );
  }

  let sectionCounter = 0;

  return (
    <div style={{
      background: '#e5e7eb',
      minHeight: '100%',
      padding: '1.5rem 1rem',
      overflowY: 'auto',
      overflowX: 'auto',
    }}>
      {/* A4 paper — 고정 너비로 사이드바 토글 영향 없음 */}
      <div style={{
        background: '#ffffff',
        width: '680px',
        margin: '0 auto',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        fontFamily: '"Malgun Gothic", "나눔고딕", "Apple SD Gothic Neo", sans-serif',
        fontSize: '10pt',
        lineHeight: 1.7,
        color: '#222',
        minHeight: '960px',
        overflow: 'hidden',
      }}>

        {/* ── 상단 헤더 이미지 ── */}
        <div style={{ padding: '24px 56px 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/work-support2/head-report.png"
            alt="보고서 헤더"
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        {/* ── 제목 영역 ── */}
        <div style={{ padding: '0 56px 0' }}>
          {nodes.map((node, i) => {
            if (node.type !== 'TITLE') return null;
            return (
              <div key={i}>
                <FittedTitle content={node.content} />
                <div style={{ height: '6px', background: 'rgb(96,100,109)' }} />
              </div>
            );
          })}
        </div>

        {/* ── 본문 ── */}
        <div style={{ padding: '20px 56px 56px' }}>
          {nodes.map((node, i) => {
            switch (node.type) {
              case 'TITLE':
                return null;

              case 'BACKGROUND':
                return (
                  <div key={i} style={{
                    borderTop: '1.5px solid #555',
                    borderBottom: '1.5px solid #555',
                    padding: '10px 14px',
                    margin: '5px 0 16px',
                    fontSize: '9.5pt',
                    color: '#333',
                    background: '#fafafa',
                    lineHeight: 1.8,
                  }}>
                    {node.content}
                  </div>
                );

              case 'SECTION': {
                sectionCounter++;
                const num = sectionCounter;
                return (
                  <div key={i} style={{ display: 'flex', margin: '16px 0 4px', border: '1px solid #aaa' }}>
                    <div style={{ background: '#565a63', color: '#fff', fontWeight: 700, fontSize: '10pt', width: '34px', minWidth: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                      {num}
                    </div>
                    <div style={{ background: '#d9d9d9', fontWeight: 700, fontSize: '10pt', padding: '6px 14px', flex: 1, display: 'flex', alignItems: 'center' }}>
                      {node.content}
                    </div>
                  </div>
                );
              }

              case 'SUBSECTION':
                return (
                  <div key={i} style={{ padding: '4px 0 3px 12px', fontSize: '10pt', marginTop: '6px' }}>
                    ○ {node.content}
                  </div>
                );

              case 'SUB_DETAIL':
                return (
                  <div key={i} style={{ padding: '2px 0 2px 32px', fontSize: '9.5pt', color: '#333' }}>
                    - {node.content}
                  </div>
                );

              case 'BULLET':
                return (
                  <div key={i} style={{ padding: '2px 0 2px 32px', fontSize: '9.5pt', color: '#444' }}>
                    · {node.content}
                  </div>
                );

              case 'TABLE': {
                const tdata = node.data;
                if (!tdata || !tdata.headers?.length || !tdata.rows?.length) return null;
                return (
                  <div key={i} style={{ margin: '10px 0 14px' }}>
                    {node.content && (
                      <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#333', marginBottom: '6px', textAlign: 'center' }}>
                        [{node.content}]
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                      <thead>
                        <tr>
                          {tdata.headers.map((h, hi) => (
                            <th key={hi} style={{ background: '#d9d9d9', color: '#111', fontWeight: 700, padding: '5px 8px', border: '1px solid #bbb', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tdata.rows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '4px 8px', border: '1px solid #ccc', color: '#222', verticalAlign: 'top' }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              case 'PARAGRAPH':
                return (
                  <div key={i} style={{ padding: '4px 0', fontSize: '10pt', lineHeight: 1.9, textAlign: 'justify', color: '#222', marginBottom: '6px' }}>
                    {node.content}
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>

        {/* ── 하단 회색바 ── */}
        <div style={{ height: '8px', background: 'rgb(96,100,109)' }} />

      </div>
    </div>
  );
}
