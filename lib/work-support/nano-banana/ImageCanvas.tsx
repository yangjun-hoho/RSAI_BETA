'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface BrushStroke {
  id: string;
  points: { x: number; y: number }[];
  brushSize: number;
}

interface ImageCanvasProps {
  isDarkMode: boolean;
  canvasImage: string | null;
  brushStrokes: BrushStroke[];
  selectedTool: 'generate' | 'edit' | 'mask';
  isGenerating: boolean;
  showMasks: boolean;
  brushSize: number;
  canvasZoom: number;
  onAddBrushStroke: (stroke: BrushStroke) => void;
  onSetCanvasZoom: (z: number) => void;
  onSetShowMasks: (v: boolean) => void;
  onClearBrushStrokes: () => void;
  onSetBrushSize: (v: number) => void;
}

export function brushStrokesToMask(strokes: BrushStroke[], width: number, height: number): string {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;
    ctx.lineWidth = stroke.brushSize;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x + width / 2, stroke.points[0].y + height / 2);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x + width / 2, stroke.points[i].y + height / 2);
    }
    ctx.stroke();
  });
  return c.toDataURL('image/png').split('base64,')[1];
}

export default function ImageCanvas({
  isDarkMode, canvasImage, brushStrokes, selectedTool, isGenerating,
  showMasks, brushSize, canvasZoom, onAddBrushStroke, onSetCanvasZoom,
  onSetShowMasks, onClearBrushStrokes, onSetBrushSize,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const panRef = useRef({ x: 0, y: 0 });

  const getCanvasCoords = useCallback((e: MouseEvent | Touch): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    return {
      x: (mx - canvas.width / 2 - panRef.current.x) / canvasZoom,
      y: (my - canvas.height / 2 - panRef.current.y) / canvasZoom,
    };
  }, [canvasZoom]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bg = isDarkMode ? '#1a1d24' : '#e5e7eb';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (!img) return;
    ctx.save();
    ctx.translate(W / 2 + panRef.current.x, H / 2 + panRef.current.y);
    ctx.scale(canvasZoom, canvasZoom);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    if (showMasks && brushStrokes.length > 0) {
      ctx.strokeStyle = 'rgba(255,255,0,0.65)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      brushStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.lineWidth = stroke.brushSize;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });
    }
    ctx.restore();
  }, [isDarkMode, canvasZoom, brushStrokes, showMasks]);

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Load image when canvasImage changes
  useEffect(() => {
    if (!canvasImage) { imgRef.current = null; redraw(); return; }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        const scaleX = (canvas.width * 0.8) / img.width;
        const scaleY = (canvas.height * 0.8) / img.height;
        const zoom = Math.min(scaleX, scaleY, 1);
        onSetCanvasZoom(zoom);
        panRef.current = { x: 0, y: 0 };
      }
      redraw();
    };
    img.src = canvasImage;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasImage]);

  useEffect(() => { redraw(); }, [redraw]);

  // Mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      onSetCanvasZoom(Math.max(0.1, Math.min(5, canvasZoom + delta)));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (selectedTool !== 'mask' || !imgRef.current || isGenerating) return;
      isDrawingRef.current = true;
      const pos = getCanvasCoords(e);
      currentStrokeRef.current = [pos];
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      const pos = getCanvasCoords(e);
      currentStrokeRef.current.push(pos);
      // Optimistically draw current stroke
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      redraw();
      ctx.save();
      ctx.translate(canvas.width / 2 + panRef.current.x, canvas.height / 2 + panRef.current.y);
      ctx.scale(canvasZoom, canvasZoom);
      ctx.strokeStyle = 'rgba(255,255,0,0.65)';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = currentStrokeRef.current;
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const onMouseUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (currentStrokeRef.current.length >= 2) {
        onAddBrushStroke({
          id: Math.random().toString(36).slice(2),
          points: [...currentStrokeRef.current],
          brushSize,
        });
      }
      currentStrokeRef.current = [];
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [selectedTool, isGenerating, canvasZoom, brushSize, getCanvasCoords, onAddBrushStroke, onSetCanvasZoom, redraw]);

  function handleDownload() {
    if (!canvasImage) return;
    const a = document.createElement('a');
    a.href = canvasImage;
    a.download = `nano-banana-${Date.now()}.png`;
    a.click();
  }

  const dark = {
    toolbar: { background: '#030712', borderBottom: '1px solid #1f2937' },
    btn: { border: '1px solid #374151', color: '#d1d5db', background: 'transparent' },
    btnActive: { background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.5)', color: '#eab308' },
    zoom: '#9ca3af',
    dlBtn: { background: '#eab308', color: '#000' },
    status: { background: '#030712', borderTop: '1px solid #1f2937', color: '#9ca3af' },
  };
  const light = {
    toolbar: { background: '#ffffff', borderBottom: '1px solid #e5e7eb' },
    btn: { border: '1px solid #d1d5db', color: '#4b5563', background: 'transparent' },
    btnActive: { background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.5)', color: '#ca8a04' },
    zoom: '#6b7280',
    dlBtn: { background: '#eab308', color: '#000' },
    status: { background: '#ffffff', borderTop: '1px solid #e5e7eb', color: '#6b7280' },
  };
  const tc = isDarkMode ? dark : light;

  const tbBtn = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.78rem', transition: 'all 0.2s',
    ...(active ? tc.btnActive : tc.btn),
  });

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ ...tc.toolbar, padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button onClick={() => onSetCanvasZoom(Math.max(0.1, canvasZoom - 0.1))} style={tbBtn()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <span style={{ fontSize: '0.8rem', color: tc.zoom, minWidth: '46px', textAlign: 'center' }}>
            {Math.round(canvasZoom * 100)}%
          </span>
          <button onClick={() => onSetCanvasZoom(Math.min(5, canvasZoom + 0.1))} style={tbBtn()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button onClick={() => { onSetCanvasZoom(1); panRef.current = { x: 0, y: 0 }; redraw(); }} style={tbBtn()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.37"/></svg>
          </button>
          {selectedTool === 'mask' && (
            <>
              <div style={{ width: '1px', height: '20px', background: isDarkMode ? '#374151' : '#d1d5db', margin: '0 0.2rem' }} />
              <button onClick={() => onSetShowMasks(!showMasks)} style={tbBtn(showMasks)}>
                {showMasks ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
                <span>Masks</span>
              </button>
              <button onClick={() => { if (confirm('마스크를 모두 지울까요?')) onClearBrushStrokes(); }} style={tbBtn()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16l9-9 8 8z"/><path d="m6.5 12.5 5 5"/></svg>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: tc.zoom }}>Brush:</span>
                <input type="range" min="5" max="60" value={brushSize} onChange={(e) => onSetBrushSize(Number(e.target.value))} style={{ width: '70px' }} />
                <span style={{ fontSize: '0.72rem', color: tc.zoom, minWidth: '20px' }}>{brushSize}</span>
              </div>
            </>
          )}
        </div>
        {canvasImage && (
          <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, ...tc.dlBtn }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        )}
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: selectedTool === 'mask' ? 'crosshair' : 'default' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Welcome overlay */}
        {!canvasImage && !isGenerating && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', animation: 'nanoBananaFloat 3s ease-in-out infinite' }}>🍌</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#1f2937', margin: '0 0 0.5rem 0' }}>Welcome to Nano Banana 2</h2>
            <p style={{ fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280', margin: 0 }}>
              Start by describing what you want to create in the prompt box
            </p>
          </div>
        )}
        <style>{`
          @keyframes nanoBananaFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-16px); }
          }
        `}</style>
      </div>

      {/* Status bar */}
      <div style={{ ...tc.status, padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontSize: '0.75rem' }}>
        <div>
          {brushStrokes.length > 0 && (
            <span style={{ color: '#eab308' }}>{brushStrokes.length} brush stroke{brushStrokes.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDarkMode ? '#ecec10' : '#ca8a04' }}>
          <span>© 2026 기획조정실 스마트도시과</span>
          <span>⚡</span>
          <span>Powered by Gemini 3.0 Flash</span>
        </div>
      </div>
    </div>
  );
}
