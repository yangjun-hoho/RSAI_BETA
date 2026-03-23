'use client';
import { useRef, useLayoutEffect, useState } from 'react';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  nodes: DocumentNode[];
}

const BASE_FONT_PT = 18;
const DEFAULT_LS = 0.02;
const MIN_LS = -0.08;

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

      ruler.style.fontSize = `${BASE_FONT_PT}pt`;
      ruler.style.letterSpacing = `${DEFAULT_LS}em`;
      void ruler.offsetWidth;
      const defaultWidth = ruler.offsetWidth;

      if (defaultWidth <= containerWidth) {
        setFontSize(`${BASE_FONT_PT}pt`);
        setLetterSpacing(`${DEFAULT_LS}em`);
        return;
      }

      ruler.style.letterSpacing = `${MIN_LS}em`;
      void ruler.offsetWidth;
      const minLsWidth = ruler.offsetWidth;

      if (minLsWidth <= containerWidth) {
        const ratio = (containerWidth - defaultWidth) / (minLsWidth - defaultWidth);
        const ls = DEFAULT_LS + ratio * (MIN_LS - DEFAULT_LS);
        setFontSize(`${BASE_FONT_PT}pt`);
        setLetterSpacing(`${ls.toFixed(4)}em`);
        return;
      }

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
    <div ref={containerRef} style={{ textAlign: 'center', padding: '14px 0 10px', position: 'relative' }}>
      <span ref={rulerRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', fontSize: `${BASE_FONT_PT}pt`, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {content}
      </span>
      <span style={{ display: 'inline-block', fontSize, fontWeight: 700, letterSpacing, color: '#111', whiteSpace: 'nowrap' }}>
        {content}
      </span>
    </div>
  );
}

export default function PressReleasePreviewPanel({ nodes }: Props) {
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '0.875rem' }}>
        보도자료를 생성하면 미리보기가 표시됩니다.
      </div>
    );
  }

  const titleNode = nodes.find(n => n.type === 'TITLE');
  const paragraphNodes = nodes.filter(n => n.type === 'PARAGRAPH');

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100%', padding: '1.5rem 1rem', overflowY: 'auto', overflowX: 'auto' }}>
      {/* A4 paper */}
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
        <div style={{ padding: '36px 56px 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/work-support2/head-press-release.png"
            alt="보도자료 헤더"
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        {/* ── 제목 ── */}
        {titleNode && (
          <div style={{ padding: '0 56px' }}>
            <FittedTitle content={titleNode.content} />
          </div>
        )}

        {/* ── 본문 단락 ── */}
        <div style={{ padding: '20px 56px 56px' }}>
          {paragraphNodes.map((node, i) => (
            <p key={i} style={{
              margin: '0 0 12px',
              fontSize: '10pt',
              lineHeight: 2.0,
              textAlign: 'justify',
              color: '#222',
              textIndent: '1em',
            }}>
              {node.content}
            </p>
          ))}
        </div>

      </div>
    </div>
  );
}
