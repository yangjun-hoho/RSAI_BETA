'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PressReleaseForm from '@/lib/work-support/press-release/PressReleaseForm';
import TitleSelector from '@/lib/work-support/press-release/TitleSelector';
import PressReleaseDisplay from '@/lib/work-support/press-release/PressReleaseDisplay';

type Step = 'input' | 'selectTitle';

export default function PressReleasePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [pressReleaseData, setPressReleaseData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => { document.title = '보도자료 생성기 | 남양주 AI'; }, []);

  async function handleGenerateTitles(data: Record<string, unknown>) {
    setIsLoading(true);
    setError(null);
    setFormData(data);
    try {
      const response = await fetch('/api/work-support/press-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateTitles', ...data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '제목 생성에 실패했습니다.');
      setTitles(result.titles);
      setStep('selectTitle');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTitleSelect(title: string) {
    setSelectedTitle(title);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/work-support/press-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generatePressRelease', ...formData, title }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '보도자료 생성에 실패했습니다.');
      setPressReleaseData(result.pressRelease);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <button className="back-button" onClick={() => { if (step === 'input') router.back(); else setStep('input'); }} aria-label="이전으로">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>📰 보도자료 생성기</h1>
        </div>
      </header>
      <div className="page-content">
        <div className="content-container">
          <div className="content-layout">
            <div className="form-section">
              {step === 'input' && <PressReleaseForm onSubmit={handleGenerateTitles} isLoading={isLoading} />}
              {step === 'selectTitle' && <TitleSelector titles={titles} onSelect={handleTitleSelect} isLoading={isLoading} selectedTitle={selectedTitle} onBack={() => setStep('input')} />}
              {error && <div className="error-message" role="alert">{error}</div>}
            </div>
            <div className="result-section" style={{ padding: 0 }}>
              <PressReleaseDisplay
                data={pressReleaseData ?? {}}
                isLoading={isLoading && step === 'selectTitle'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
