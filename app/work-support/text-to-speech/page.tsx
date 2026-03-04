'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TTSInputForm from '@/lib/work-support/text-to-speech/InputForm';
import AudioPlayer from '@/lib/work-support/text-to-speech/AudioPlayer';

export default function TextToSpeechPage() {
  const router = useRouter();
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('ko-KR-SunHiNeural');
  const [speechRate, setSpeechRate] = useState(0);
  const [speechPitch, setSpeechPitch] = useState(0);
  const prevAudioUrl = useRef<string | null>(null);

  useEffect(() => {
    document.title = '텍스트 음성변환 | 남양주 AI';
    return () => { if (prevAudioUrl.current) URL.revokeObjectURL(prevAudioUrl.current); };
  }, []);

  async function handleGenerate(data: { text: string; voice: string; rate: number; pitch: number; language: string }) {
    if (!data.text.trim()) { setErrorMessage('변환할 텍스트를 입력해주세요.'); return; }
    setIsGenerating(true);
    setErrorMessage('');
    setCurrentText(data.text);
    setSelectedVoice(data.voice);
    setSpeechRate(data.rate);
    setSpeechPitch(data.pitch);
    try {
      const response = await fetch('/api/work-support/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '음성 생성에 실패했습니다.');
      }
      if (prevAudioUrl.current) URL.revokeObjectURL(prevAudioUrl.current);
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      prevAudioUrl.current = url;
      setCurrentAudioUrl(url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '음성 생성 중 오류가 발생했습니다.');
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
          <h1>TTS | text-to-speech</h1>
        </div>
      </header>
      <div className="page-content">
        <div className="content-container">
          <div className="content-layout">
            <div className="form-section">
              <TTSInputForm currentText={currentText} selectedVoice={selectedVoice} speechRate={speechRate} speechPitch={speechPitch} isGenerating={isGenerating} onGenerate={handleGenerate} />
              {errorMessage && (
                <div className="error-message" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {errorMessage}
                </div>
              )}
            </div>
            <div className="result-section">
              <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5,6 9,2 9,2 15,6 15,11 19,11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  음성 결과
                </h2>
              </div>
              <div style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
                    <div className="loading-spinner" />
                    <p style={{ margin: 0 }}>음성을 생성하고 있습니다...</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <p>선택된 음성: {selectedVoice}</p>
                      <p>텍스트 길이: {currentText.length}자</p>
                    </div>
                  </div>
                ) : currentAudioUrl ? (
                  <AudioPlayer audioUrl={currentAudioUrl} currentText={currentText} selectedVoice={selectedVoice} speechRate={speechRate} speechPitch={speechPitch} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>음성 변환 대기 중</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>음성 설정을 선택하고 텍스트를 입력하세요.</p>
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
