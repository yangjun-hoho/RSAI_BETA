'use client';

import { useState } from 'react';
import Image from 'next/image';
import { marked } from 'marked';
import { exportScenarioToODT } from './scenarioOdtExporter';

interface ScriptData {
  content: string;
  estimatedDuration: number;
  tips: string[];
  metadata: Record<string, unknown>;
}

interface ScenarioViewerProps {
  script: ScriptData;
  originalContent: string;
  template: string;
  settings: Record<string, unknown>;
}

const templateLabels: Record<string, string> = {
  presentation: '발표 대본',
  scenario:     '시나리오',
  speech:       '연설문',
  lecture:      '강의 대본',
  meeting:      '회의 진행 대본',
  mc:           '사회자 대본',
  briefing:     '브리핑 대본',
  debate:       '토론 대본',
};

const scenarioCSS = `
  .scenario-doc-container {
    background: white;
    color: #000;
    font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem 2rem 1rem;
  }
  .scenario-doc-header {
    text-align: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0 1rem 0;
    position: relative;
  }
  .scenario-doc-header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 6px;
    background: rgb(96, 100, 109);
  }
  .scenario-doc-title {
    font-size: 2.3rem;
    font-weight: bold;
    margin: 3px 0 3px 0;
    line-height: 1.3;
    color: #000;
  }
  .scenario-doc-body {
    padding: 1.5rem 0.5rem;
    font-size: 1rem;
    line-height: 2.0;
    color: #1a1a1a;
  }
  .scenario-doc-body h3 {
    font-size: 1rem;
    font-weight: 700;
    color: #1d4ed8;
    margin: 0em 0 0.4em;
  }
  .scenario-doc-body p {
    margin: 0 0 0.8em;
  }
  .scenario-doc-body strong {
    font-weight: 700;
  }
`;

export default function ScenarioViewer({ script, template }: ScenarioViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const titleLabel = templateLabels[template] || template || '시나리오';

  function handleCopy() {
    navigator.clipboard.writeText(script.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDownload() {
    if (!script.content || isDownloading) return;
    setIsDownloading(true);
    try {
      await exportScenarioToODT(script.content, titleLabel);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{scenarioCSS}</style>

      {/* 툴바 */}
      <div style={{ padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={handleCopy}
            disabled={!script.content}
            style={{ padding: '0.3rem 0.65rem', background: copied ? '#059669' : script.content ? 'var(--focus-color)' : '#aaa', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: script.content ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!script.content || isDownloading}
            style={{ padding: '0.3rem 0.65rem', background: script.content && !isDownloading ? '#16a34a' : '#aaa', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: script.content && !isDownloading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {isDownloading ? '생성 중...' : 'ODT'}
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8f8f4' }}>
        <div className="scenario-doc-container">
          <Image src="/images/document/head-report.png" alt="헤더" width={800} height={200} style={{ width: '100%', height: 'auto', display: 'block', marginBottom: '0.1rem' }} />
          <div className="scenario-doc-header">
            <h1 className="scenario-doc-title">{titleLabel}</h1>
          </div>
          <div className="scenario-doc-body" dangerouslySetInnerHTML={{ __html: marked.parse(script.content) as string }} />
        </div>
      </div>
    </div>
  );
}
