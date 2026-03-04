'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PPTInputForm from '@/lib/work-support/ppt-converter/InputForm';
import PPTViewer, { type Slide, type TemplateId } from '@/lib/work-support/ppt-converter/PPTViewer';

export default function PPTConverterPage() {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [pptTitle, setPptTitle] = useState('프레젠테이션');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('template1');

  useEffect(() => { document.title = 'PPT 변환기 | 남양주 AI'; }, []);

  async function handleGenerate(data: {
    content: string; title: string; slideCount: number;
    includeTitle: boolean; includeIndex: boolean; includeConclusion: boolean;
  }) {
    setIsGenerating(true);
    setError('');
    setPptTitle(data.title);
    try {
      const response = await fetch('/api/work-support/ppt-converter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error || 'PPT 생성에 실패했습니다.');
      }
      const result = await response.json();
      setSlides(result.slides);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPT 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFileUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/work-support/ppt-converter/upload', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || '파일 업로드에 실패했습니다.');
    }
    const result = await response.json();
    setUploadedFileInfo({ name: file.name, size: file.size });
    return result.text;
  }

  async function handleDownload() {
    if (!slides.length) return;
    setIsDownloading(true);
    try {
      const response = await fetch('/api/work-support/ppt-converter/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, title: pptTitle, template: selectedTemplate }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'PPT 다운로드 실패');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pptTitle}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PPT 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
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
          <h1>🖥️ PPT 변환기</h1>
        </div>
      </header>
      <div className="page-content">
        <div className="content-container">
          <div className="content-layout">
            <div className="form-section" style={{ width: '380px' }}>
              <PPTInputForm
                onGenerate={handleGenerate}
                onFileUpload={handleFileUpload}
                isGenerating={isGenerating}
                uploadedFileInfo={uploadedFileInfo}
              />
              {error && <div className="error-message" role="alert" style={{ marginTop: '0.5rem' }}>{error}</div>}
            </div>

            <div className="result-section">
              {isGenerating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                  <div className="loading-spinner" />
                  <p style={{ color: 'var(--text-secondary)' }}>PPT를 생성하고 있습니다...</p>
                </div>
              ) : slides.length > 0 ? (
                <PPTViewer
                  slides={slides}
                  onSlidesChange={setSlides}
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
                  onTemplateChange={setSelectedTemplate}
                  defaultTemplate={selectedTemplate}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🖥️</span>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>PPT 생성 대기 중</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>파일을 업로드하거나 텍스트를 입력하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
