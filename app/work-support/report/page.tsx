'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportForm from '@/lib/work-support/report/ReportForm';
import ReportViewer from '@/lib/work-support/report/ReportViewer';
import { generateReportContent, type GenerateReportParams } from '@/lib/work-support/report/reportGenerator';

export default function ReportPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { document.title = '보고서 생성 | 남양주 AI'; }, []);

  async function handleGenerateReport(formValues: Record<string, unknown>) {
    if (!String(formValues.reportTitle || '').trim()) {
      setError('제목은 필수 입력 항목입니다.');
      return;
    }
    setError('');
    setIsGenerating(true);
    const params: GenerateReportParams = {
      title: String(formValues.reportTitle || ''),
      reportType: String(formValues.selectedReportType || ''),
      detailType: String(formValues.selectedDetailType || ''),
      reportLength: String(formValues.selectedLength || 'standard'),
      model: String(formValues.selectedModel || 'gemini-2.5-flash-lite'),
    };
    try {
      const result = await generateReportContent(params);
      setGeneratedReport({
        ...result,
        ...(formValues.managerInfo && { managerInfo: String(formValues.managerInfo) }),
        ...(formValues.teamLeaderInfo && { teamLeaderInfo: String(formValues.teamLeaderInfo) }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <button className="back-button" onClick={() => router.back()} aria-label="이전 페이지로 돌아가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>AI Report-generator</h1>
        </div>
      </header>
      <div className="page-content">
        <div className="content-container">
          <div className="content-layout">
            <div className="form-section" style={{ padding: '20px' }}>
              <ReportForm onGenerate={handleGenerateReport} isLoading={isGenerating} error={error} />
              {error && <div className="error-message" role="alert">{error}</div>}
            </div>
            <div className="result-section">
              <div style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                    <div className="loading-spinner" />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI가 보고서를 생성하고 있습니다...</p>
                  </div>
                ) : generatedReport ? (
                  <ReportViewer reportData={generatedReport} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📄</span>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>보고서를 생성해보세요</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>왼쪽 입력 폼을 작성하고 생성 버튼을 클릭하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
