'use client';

import { useState, useEffect, useRef } from 'react';
import { HWPXExporter } from './hwpxExporter';

interface ReportViewerProps {
  reportData: Record<string, unknown>;
}

type ViewMode = 'official' | 'json';

// ─── HTML 생성 헬퍼 (SvelteKit reportUtils.js 포팅) ────────────────────────

function processTextFormatting(text: string): string {
  if (!text) return '';
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/<strong>(.*?)<\/strong>\s*:?\s*/g, '<strong>$1:</strong> ');
  formatted = formatted.replace(/<\/strong>\s*:\s*:\s*/g, '</strong> ');
  return formatted;
}

function generateContentList(contentArray: unknown[]): string {
  if (!Array.isArray(contentArray)) return '';
  let html = '<ul class="content-list">';
  for (const item of contentArray) {
    if (item && typeof item === 'string' && item.trim()) {
      const trimmed = item.trim();
      if (trimmed.startsWith('SUB:')) {
        html += `<li class="content-sub-item">${processTextFormatting(trimmed.slice(4).trim())}</li>`;
      } else {
        html += `<li class="content-item">${processTextFormatting(trimmed)}</li>`;
      }
    }
  }
  html += '</ul>';
  return html;
}

function generateTable(table: Record<string, unknown>, tableNumber: number): string {
  const headers = table.headers as string[] | undefined;
  const rows = table.rows as string[][] | undefined;
  if (!headers || !rows) return '<div class="table-error">테이블 데이터가 올바르지 않습니다.</div>';

  let html = '<div class="report-table-container">';
  if (table.title) html += `<h4 class="table-title">표 ${tableNumber}. ${table.title}</h4>`;
  html += '<table class="report-table"><thead><tr>';
  for (const h of headers) html += `<th>${h}</th>`;
  html += '</tr></thead><tbody>';
  rows.forEach((row, rIdx) => {
    html += `<tr class="${rIdx % 2 === 0 ? 'even-row' : 'odd-row'}">`;
    for (const cell of row) html += `<td>${cell}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function generateChart(chart: Record<string, unknown>, sectionNumber: number, chartNumber: number): string {
  if (!chart.type || !chart.data) return '<div class="chart-error">차트 데이터가 올바르지 않습니다.</div>';
  const chartId = `chart-${sectionNumber}-${chartNumber}`;
  const safeData = JSON.stringify(chart).replace(/'/g, '&#39;');
  let html = `<div class="report-chart-container compact-chart" data-chart-data='${safeData}'>`;
  if (chart.title) html += `<h4 class="chart-title">${chart.title}</h4>`;
  html += `<div class="chart-wrapper compact"><canvas id="${chartId}" class="chart-canvas"></canvas></div>`;
  if (chart.description) html += `<div class="chart-desc-text">${chart.description}</div>`;
  html += '</div>';
  return html;
}

function generateSection(section: Record<string, unknown>, sectionNumber: number): string {
  let html = `<div class="report-section">
    <h2 class="section-title">
      <span class="section-number">${sectionNumber}</span>
      <span>${section.title || `섹션 ${sectionNumber}`}</span>
    </h2>
    <div class="section-content">`;

  const subsections = section.subsections as Array<Record<string, unknown>> | undefined;
  const content = section.content as unknown[] | undefined;

  if (subsections && subsections.length > 0) {
    subsections.forEach((sub, idx) => {
      html += `<h3 class="subsection-title">${sectionNumber}-${idx + 1}. ${sub.title}</h3>`;
      if (sub.content) html += generateContentList(sub.content as unknown[]);
    });
  } else if (content && content.length > 0) {
    html += generateContentList(content);
  } else {
    html += '<p class="no-content">이 섹션에는 내용이 없습니다.</p>';
  }

  html += '</div>';

  const tables = section.tables as Array<Record<string, unknown>> | undefined;
  if (tables && tables.length > 0) {
    html += '<div class="tables-section">';
    tables.forEach((table, idx) => { html += generateTable(table, idx + 1); });
    html += '</div>';
  }

  const charts = section.charts as Array<Record<string, unknown>> | undefined;
  if (charts && charts.length > 0) {
    if (charts.length === 2) {
      html += '<div class="charts-section"><div style="display:table;width:100%;table-layout:fixed"><div style="display:table-row">';
      charts.forEach((chart, idx) => {
        html += `<div style="display:table-cell;width:50%;padding:0 1rem;vertical-align:top">${generateChart(chart, sectionNumber, idx + 1)}</div>`;
      });
      html += '</div></div></div>';
    } else {
      html += '<div class="charts-section"><div style="display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:1rem">';
      charts.forEach((chart, idx) => { html += generateChart(chart, sectionNumber, idx + 1); });
      html += '</div></div>';
    }
  }

  html += '</div>';
  return html;
}

function generateHtml(reportData: Record<string, unknown>): string {
  const title = (reportData.title as string) || '제목 없음';
  const type = (reportData.type as string) || '';
  const detailType = (reportData.detailType as string) || '';
  const summary = reportData.summary as string | undefined;
  const sections = reportData.sections as Array<Record<string, unknown>> | undefined;
  const metadata = reportData.metadata as Record<string, unknown> | undefined;

  let html = '';

  // 헤더 이미지
  html += `<img src="/images/document/head-report.png" alt="보고서 헤더" style="width:100%;display:block;margin-bottom:0.1rem;" />`;

  // 헤더
  html += `<div class="report-header">
    <h1 class="report-title">${title}</h1>
    <div class="report-meta"><span class="report-type">${type}</span>${detailType ? `<span class="report-detail-type"> | ${detailType}</span>` : ''}</div>
  </div>`;

  // 요약
  if (summary) {
    html += `<div class="summary-section"><div class="summary-content"><p>${summary}</p></div></div>`;
  }

  // 섹션
  if (sections && sections.length > 0) {
    const sorted = [...sections].sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));
    html += '<div class="main-sections">';
    sorted.forEach((section, idx) => { html += generateSection(section, idx + 1); });
    html += '</div>';
  }

  // 메타데이터
  if (metadata) {
    html += '<div class="metadata-section"><div class="metadata-grid">';
    if (metadata.generatedAt) {
      const d = new Date(metadata.generatedAt as string).toLocaleString('ko-KR');
      html += `<div class="metadata-item"><span class="metadata-label">생성일시:</span><span class="metadata-value">${d}</span></div>`;
    }
    if (metadata.totalSections) {
      html += `<div class="metadata-item"><span class="metadata-label">총 섹션:</span><span class="metadata-value">${metadata.totalSections}개</span></div>`;
    }
    if (metadata.estimatedReadTime) {
      html += `<div class="metadata-item"><span class="metadata-label">예상 읽기 시간:</span><span class="metadata-value">${metadata.estimatedReadTime}</span></div>`;
    }
    html += '</div></div>';
  }

  return `<div class="report-container template-official">${html}</div>`;
}

// ─── 공식문서 CSS (official.js 포팅) ──────────────────────────────────────────
const officialCSS = `
  .report-container.template-official {
    background: white;
    color: #000;
    font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    line-height: 1.6;
    max-width: 900px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  .template-official .report-header {
    background: white;
    color: #000;
    text-align: center;
    margin-bottom: 0.1rem;
    padding: 1rem 0 1rem 0;
    border: none;
    position: relative;
  }
  .template-official .report-header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 6px;
    background: rgb(96, 100, 109);
  }
  .template-official .report-title {
    font-size: 2rem;
    font-weight: bold;
    margin: 0px 0 5px 0;
    line-height: 1.3;
    color: #000;
  }
  .template-official .report-meta { display: none; }
  .template-official .summary-section {
    background: #e2e2e2;
    margin: 1rem 0;
    padding: 0;
  }
  .template-official .summary-content p {
    font-size: 1rem;
    color: #585858;
    line-height: 1.6;
    text-align: justify;
    margin: 0;
    padding: 1rem;
  }
  .template-official .main-sections { margin-top: 1rem; }
  .template-official .report-section {
    background: white;
    border: none;
    margin-bottom: 1.5rem;
    padding: 0;
  }
  .template-official .section-title {
    display: flex;
    align-items: center;
    margin: 1rem 0 0.5rem 0;
    padding: 0;
    border: none;
    font-size: 1rem;
    font-weight: bold;
    color: #000;
  }
  .template-official .section-number {
    background: #565a63;
    color: white;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    margin-right: 0;
    border-radius: 0;
    flex-shrink: 0;
  }
  .template-official .section-title > span:last-child {
    background: #e5e7eb;
    color: #000;
    padding: 0 1rem;
    height: 40px;
    display: flex;
    align-items: center;
    flex: 1;
    font-weight: bold;
    font-size: 1.2rem;
  }
  .template-official .subsection-title {
    font-size: 0.9rem;
    font-weight: bold;
    color: #000;
    margin: 0.8rem 0 0.4rem 0;
    padding-left: 8px;
  }
  .template-official .subsection-title::before {
    content: "● ";
    color: #dc2626;
    margin-right: 4px;
  }
  .template-official .section-content { margin-bottom: 1rem; padding-left: 0; }
  .template-official .content-list { list-style: none; padding: 0; margin: 0; }
  .template-official .content-item {
    background: none;
    border: none;
    color: #000;
    padding: 0.5rem 0 0.5rem 2.5rem;
    margin-bottom: 0;
    position: relative;
    font-size: 1rem;
    line-height: 1.6;
    text-align: justify;
  }
  .template-official .content-item::before {
    content: "○";
    position: absolute;
    left: 14px;
    color: #000;
    font-size: 1rem;
    top: 0.4rem;
  }
  .template-official .content-sub-item {
    background: none;
    border: none;
    color: #4b5563;
    padding: 0.2rem 0 0.2rem 2.8rem;
    margin-bottom: 0.2rem;
    position: relative;
    font-size: 0.93rem;
    line-height: 1.5;
  }
  .template-official .content-sub-item::before {
    content: "－";
    position: absolute;
    left: 1.5rem;
    color: #6b7280;
    font-size: 0.8rem;
    top: 0.35rem;
  }
  .template-official .key-points { display: none; }
  .template-official .tables-section { margin: 1.5rem 0; }
  .template-official .report-table-container { margin: 1rem 0; }
  .template-official .table-title {
    font-size: 1rem;
    font-weight: bold;
    color: #303030;
    margin: 0.8rem 0 0.5rem 0;
    text-align: center;
  }
  .template-official .report-table {
    width: 95%;
    border-collapse: collapse;
    margin: 0.5rem auto;
    font-size: 0.9rem;
    border: 1px solid rgb(0,0,0);
  }
  .template-official .report-table th {
    background: rgb(190,190,190);
    color: black;
    padding: 0.5rem 0.4rem;
    text-align: center;
    font-weight: bold;
    border: 1px solid #000;
    font-size: 0.9rem;
  }
  .template-official .report-table td {
    padding: 0.45rem 0.4rem;
    text-align: center;
    border: 1px solid #a1a2a3;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .template-official .report-table .even-row { background: #f8fafc; }
  .template-official .report-table .odd-row { background: white; }
  .template-official .metadata-section {
    border-top: 1px solid #e5e7eb;
    margin-top: 2rem;
    padding: 1rem 0 0 0;
  }
  .template-official .metadata-grid {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .template-official .metadata-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .template-official .metadata-label,
  .template-official .metadata-value {
    font-size: 0.7rem;
    color: #6b7280;
  }
  /* 차트 스타일 */
  .charts-section {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  .report-chart-container {
    margin: 1rem 0;
    padding: 1rem;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 1px 2px 8px rgba(0,0,0,0.08);
    text-align: center;
  }
  .report-chart-container.compact-chart {
    width: 400px;
    display: block;
    margin: 1rem auto;
  }
  .chart-title {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 400;
    color: #374151;
    text-align: center;
  }
  .chart-wrapper {
    position: relative;
    height: 300px;
    margin: 1rem 0;
  }
  .chart-wrapper.compact { height: 250px; }
  .chart-canvas { width: 100% !important; height: 100% !important; }
  .chart-desc-text {
    margin: 1rem 0 0 0;
    font-size: 0.85rem;
    color: rgb(55,85,144);
    text-align: center;
    font-style: italic;
    line-height: 1.4;
  }
  .chart-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    background: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #6b7280;
    font-size: 0.9rem;
    text-align: center;
  }
  .table-error { color: #dc2626; padding: 0.5rem; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; }
`;

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
declare global {
  interface Window { Chart: unknown; }
  interface HTMLCanvasElement { _chartInstance?: unknown; }
}

export default function ReportViewer({ reportData }: ReportViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('official');
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlContent = generateHtml(reportData);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const exporter = new HWPXExporter();
      const blob = await exporter.export(reportData as Parameters<HWPXExporter['export']>[0]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const title = (reportData.title as string) || '보고서';
      a.download = `${title}.hwpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('HWPX 다운로드 실패', e);
      alert('HWPX 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleCopy() {
    if (viewMode === 'json') {
      navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    } else {
      const report = reportData as Record<string, unknown>;
      const sections = (report.sections as Array<Record<string, unknown>>) || [];
      const text = [
        report.title,
        report.summary,
        '',
        ...sections.flatMap(s => [s.title, ...(s.content as string[] || []), '']),
      ].join('\n');
      navigator.clipboard.writeText(text);
    }
    alert('클립보드에 복사되었습니다.');
  }

  // Chart.js 초기화
  useEffect(() => {
    if (viewMode !== 'official' || !containerRef.current || isDownloading) return;

    function renderCharts() {
      const ChartCtor = window.Chart as (new (canvas: HTMLCanvasElement, config: unknown) => { destroy(): void }) | undefined;
      if (!ChartCtor || !containerRef.current) return;

      const containers = containerRef.current.querySelectorAll<HTMLElement>('[data-chart-data]');
      containers.forEach((el) => {
        try {
          const raw = el.getAttribute('data-chart-data') || '';
          const chartData = JSON.parse(raw.replace(/&#39;/g, "'"));
          const canvas = el.querySelector<HTMLCanvasElement>('canvas');
          if (!canvas) return;
          if (canvas._chartInstance) {
            (canvas._chartInstance as { destroy(): void }).destroy();
            canvas._chartInstance = undefined;
          }
          const isRound = chartData.type === 'pie' || chartData.type === 'doughnut';
          const instance = new ChartCtor(canvas, {
            type: chartData.type || 'bar',
            data: applyColors(chartData.data, chartData.type),
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: isRound ? 'bottom' : 'top' },
              },
              scales: isRound ? {} : { y: { beginAtZero: true } },
            },
          });
          canvas._chartInstance = instance;
        } catch (e) {
          console.error('Chart render error', e);
        }
      });
    }

    const CHART_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';

    if (window.Chart) {
      renderCharts();
    } else if (!document.querySelector(`script[src="${CHART_URL}"]`)) {
      const script = document.createElement('script');
      script.src = CHART_URL;
      script.onload = renderCharts;
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.Chart) { clearInterval(check); renderCharts(); }
      }, 100);
    }

    const container = containerRef.current;
    return () => {
      if (!container) return;
      const canvases = container.querySelectorAll<HTMLCanvasElement>('canvas');
      canvases.forEach(c => { if (c._chartInstance) { (c._chartInstance as { destroy(): void }).destroy(); c._chartInstance = undefined; } });
    };
  }, [viewMode, reportData, isDownloading]);

  const views: { id: ViewMode; label: string }[] = [
    { id: 'official', label: '공식문서' },
    { id: 'json', label: 'JSON 보기' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{officialCSS}</style>

      {/* 툴바 */}
      <div style={{ padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>미리보기:</span>
        {views.map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{ padding: '0.25rem 0.6rem', border: `1px solid ${viewMode === v.id ? 'var(--focus-color)' : 'var(--border-color)'}`, borderRadius: '4px', background: viewMode === v.id ? '#eef2ff' : 'white', color: viewMode === v.id ? 'var(--focus-color)' : 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer' }}>
            {v.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          <button onClick={handleCopy} style={{ padding: '0.3rem 0.65rem', background: 'var(--focus-color)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}>복사</button>
          <button onClick={handleDownload} disabled={isDownloading} style={{ padding: '0.3rem 0.65rem', background: isDownloading ? '#aaa' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: isDownloading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {isDownloading ? '생성 중...' : 'HWP'}
          </button>
        </div>
      </div>

      {/* JSON 보기 */}
      {viewMode === 'json' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#1e1e1e' }}>
          <pre style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.6, color: '#d4d4d4', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </div>
      ) : (
        /* 공식문서 보기 */
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8f8f4' }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )}
    </div>
  );
}

// ─── 차트 색상 적용 ────────────────────────────────────────────────────────────
const COLORS_VIBRANT = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6b7280'];
const COLORS_ACCESSIBLE = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'];

function applyColors(data: Record<string, unknown>, type: string): Record<string, unknown> {
  if (!data || !data.datasets) return data;
  const isRound = type === 'pie' || type === 'doughnut';
  const colors = isRound ? COLORS_VIBRANT : COLORS_ACCESSIBLE;
  const labels = data.labels as unknown[];
  const datasets = (data.datasets as Array<Record<string, unknown>>).map((ds, di) => {
    const d = { ...ds };
    if (isRound) {
      d.backgroundColor = labels.map((_, i) => colors[i % colors.length]);
      d.borderColor = '#ffffff';
      d.borderWidth = 2;
    } else if (type === 'bar' && labels && labels.length > 1) {
      d.backgroundColor = labels.map((_, i) => colors[i % colors.length]);
      d.borderColor = labels.map((_, i) => colors[i % colors.length]);
      d.borderWidth = 1;
    } else {
      const c = colors[di % colors.length];
      d.backgroundColor = type === 'line' ? hexToRgba(c, 0.2) : c;
      d.borderColor = c;
      d.borderWidth = type === 'line' ? 3 : 1;
    }
    return d;
  });
  return { ...data, datasets };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
