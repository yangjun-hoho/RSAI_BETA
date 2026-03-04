'use client';

import { useEffect, useState, useCallback } from 'react';
import EditorHeader from '@/lib/work-support/nano-banana/EditorHeader';
import PromptComposer, { type ToolMode } from '@/lib/work-support/nano-banana/PromptComposer';
import ImageCanvas, { type BrushStroke, brushStrokesToMask } from '@/lib/work-support/nano-banana/ImageCanvas';
import HistoryPanel, { type Generation } from '@/lib/work-support/nano-banana/HistoryPanel';

const DAILY_LIMIT = 10;
const THEME_KEY = 'nano-banana-theme';

export default function NanaBananaPage() {
  // ── Theme ──────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(true);

  // ── Usage ──────────────────────────────────────────────
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  // ── Editor State ───────────────────────────────────────
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedTool, setSelectedTool] = useState<ToolMode>('generate');
  const [temperature, setTemperature] = useState(0.9);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [editReferenceImages, setEditReferenceImages] = useState<string[]>([]);
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  const [showMasks, setShowMasks] = useState(true);
  const [brushSize, setBrushSize] = useState(20);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  useEffect(() => {
    document.title = '🍌 Nano Banana 2 | 남양주 AI';

    // Load theme
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) setIsDarkMode(saved === 'dark');

    // 서버에서 잔여 횟수 조회
    fetch('/api/work-support/nano-banana')
      .then(r => r.json())
      .then(({ used }) => setDailyUsageCount(used ?? 0))
      .catch(() => {});

    // Mobile: hide panels
    if (window.innerWidth < 768) {
      setShowPromptPanel(false);
      setShowHistory(false);
    }
  }, []);

  function toggleDarkMode() {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }

  // ── File Upload ────────────────────────────────────────
  // 이미지를 최대 800px로 리사이즈 (문서 삽입용)
  async function resizeImage(file: File, maxPx = 800): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = dataUrl;
    });
  }

  async function handleFileUpload(file: File) {
    const dataUrl = await resizeImage(file);

    if (selectedTool === 'generate') {
      if (uploadedImages.length < 2) setUploadedImages(prev => [...prev, dataUrl]);
    } else if (selectedTool === 'edit') {
      if (editReferenceImages.length < 2) setEditReferenceImages(prev => [...prev, dataUrl]);
      if (!canvasImage) setCanvasImage(dataUrl);
    } else if (selectedTool === 'mask') {
      setUploadedImages([dataUrl]);
      setCanvasImage(dataUrl);
    }
  }

  // ── Generate / Edit ────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!currentPrompt.trim() || isGenerating) return;
    if (dailyUsageCount >= DAILY_LIMIT) return;

    setIsGenerating(true);
    try {
      // Build base64 arrays (strip data URL prefix)
      const stripPrefix = (url: string) => url.includes('base64,') ? url.split('base64,')[1] : url;

      const refImages = uploadedImages.map(stripPrefix);
      const editRefImages = editReferenceImages.map(stripPrefix);
      const originalBase64 = canvasImage ? stripPrefix(canvasImage) : null;

      let maskBase64: string | null = null;
      if (selectedTool === 'mask' && brushStrokes.length > 0 && canvasImage) {
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.src = canvasImage; });
        maskBase64 = brushStrokesToMask(brushStrokes, img.width, img.height);
      }

      const response = await fetch('/api/work-support/nano-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedTool,
          prompt: currentPrompt.trim(),
          originalImage: originalBase64,
          referenceImages: selectedTool === 'generate' ? refImages : editRefImages,
          maskImage: maskBase64,
          temperature,
          aspectRatio,
          imageSize,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setDailyUsageCount(DAILY_LIMIT);
        }
        alert(err.error || '이미지 생성에 실패했습니다.');
        return;
      }

      const { image, mimeType, remaining } = await response.json();
      const dataUrl = `data:${mimeType ?? 'image/png'};base64,${image}`;
      setCanvasImage(dataUrl);

      const newGen: Generation = {
        id: Math.random().toString(36).slice(2),
        prompt: currentPrompt,
        modelVersion: 'gemini-3.1-flash-image-preview',
        timestamp: Date.now(),
        parameters: { temperature },
        imageUrl: dataUrl,
      };
      setGenerations(prev => [...prev, newGen]);
      setSelectedGenerationId(newGen.id);

      // 서버 응답 기준으로 사용량 업데이트
      if (remaining !== undefined) {
        setDailyUsageCount(DAILY_LIMIT - remaining);
      } else {
        setDailyUsageCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('[nano-banana] generate error:', err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, [currentPrompt, isGenerating, dailyUsageCount, selectedTool, uploadedImages, editReferenceImages, canvasImage, brushStrokes, temperature, aspectRatio]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key === 'g') setSelectedTool('generate');
      if (e.key === 'e') setSelectedTool('edit');
      if (e.key === 'm') setSelectedTool('mask');
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  function clearSession() {
    if (!confirm('세션을 초기화할까요? 생성된 이미지와 히스토리가 모두 삭제됩니다.')) return;
    setCurrentPrompt('');
    setUploadedImages([]);
    setEditReferenceImages([]);
    setCanvasImage(null);
    setBrushStrokes([]);
    setGenerations([]);
    setSelectedGenerationId(null);
    setCanvasZoom(1);
  }

  const bg = isDarkMode ? '#111827' : '#f9fafb';
  const color = isDarkMode ? '#f3f4f6' : '#1f2937';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: bg, color,
      display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
      overflow: 'hidden', zIndex: 50,
    }}>
      <EditorHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        dailyUsageCount={dailyUsageCount}
        dailyUsageLimit={DAILY_LIMIT}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <PromptComposer
          isDarkMode={isDarkMode}
          selectedTool={selectedTool}
          currentPrompt={currentPrompt}
          uploadedImages={uploadedImages}
          editReferenceImages={editReferenceImages}
          isGenerating={isGenerating}
          temperature={temperature}
          aspectRatio={aspectRatio}
          showPromptPanel={showPromptPanel}
          isUsageLimitReached={dailyUsageCount >= DAILY_LIMIT}
          dailyUsageLimit={DAILY_LIMIT}
          onSetTool={setSelectedTool}
          onSetPrompt={setCurrentPrompt}
          onGenerate={handleGenerate}
          onFileUpload={handleFileUpload}
          onRemoveUploadedImage={(i) => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
          onRemoveEditReferenceImage={(i) => setEditReferenceImages(prev => prev.filter((_, idx) => idx !== i))}
          imageSize={imageSize}
          onSetTemperature={setTemperature}
          onSetAspectRatio={setAspectRatio}
          onSetImageSize={setImageSize}
          onTogglePanel={() => setShowPromptPanel(p => !p)}
          onClearSession={clearSession}
        />

        <ImageCanvas
          isDarkMode={isDarkMode}
          canvasImage={canvasImage}
          brushStrokes={brushStrokes}
          selectedTool={selectedTool}
          isGenerating={isGenerating}
          showMasks={showMasks}
          brushSize={brushSize}
          canvasZoom={canvasZoom}
          onAddBrushStroke={(stroke) => setBrushStrokes(prev => [...prev, stroke])}
          onSetCanvasZoom={setCanvasZoom}
          onSetShowMasks={setShowMasks}
          onClearBrushStrokes={() => setBrushStrokes([])}
          onSetBrushSize={setBrushSize}
        />

        <HistoryPanel
          isDarkMode={isDarkMode}
          showHistory={showHistory}
          generations={generations}
          selectedGenerationId={selectedGenerationId}
          onTogglePanel={() => setShowHistory(p => !p)}
          onSelectGeneration={(gen) => setCanvasImage(gen.imageUrl)}
          onSetSelectedId={setSelectedGenerationId}
        />
      </div>

      {/* Loading Overlay */}
      {isGenerating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: isDarkMode ? '#1f2937' : '#ffffff',
            borderRadius: '12px', padding: '2rem', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: '1rem',
            border: isDarkMode ? 'none' : '1px solid #e5e7eb',
          }}>
            <div style={{
              width: '3.5rem', height: '3.5rem', border: '4px solid #eab308',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'nanoBananaSpin 1s linear infinite',
            }} />
            <style>{`@keyframes nanoBananaSpin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: isDarkMode ? '#f3f4f6' : '#1f2937', fontWeight: 500, margin: 0 }}>Generating your image...</p>
            <p style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem', margin: 0 }}>This may take a few moments</p>
          </div>
        </div>
      )}
    </div>
  );
}
