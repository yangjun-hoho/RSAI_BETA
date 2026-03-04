'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OptionForm from '@/lib/work-support/greetings/OptionForm';
import GreetingDisplay from '@/lib/work-support/greetings/GreetingDisplay';

export default function GreetingsPage() {
  const router = useRouter();
  const [greetingText, setGreetingText] = useState('');
  const [greetingType, setGreetingType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = 'AI 인사말씀 생성기 | 남양주 AI'; }, []);

  async function handleFormSubmit(options: Record<string, unknown>) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/work-support/greetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '인사말씀 생성 중 오류가 발생했습니다.');
      setGreetingText(data.greeting);
      setGreetingType((options.greetingType as string) || '인사말씀');
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
          <button className="back-button" onClick={() => router.back()} aria-label="이전 페이지로 돌아가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>AI Greetings Generator</h1>
        </div>
      </header>
      <div className="page-content">
        <div className="content-container">
          <div className="content-layout">
            <div className="form-section">
              <OptionForm onSubmit={handleFormSubmit} isLoading={isLoading} />
              {error && (
                <div className="error-message" role="alert">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-color)', fontWeight: 'bold' }}>×</button>
                </div>
              )}
            </div>
            <div className="result-section">
              <GreetingDisplay greetingText={greetingText} greetingType={greetingType} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
