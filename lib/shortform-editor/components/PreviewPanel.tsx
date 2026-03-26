'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Scene, ProjectSettings, FONT_OPTIONS, DEFAULT_SUBTITLE,
  OverlayItem, LogoPosition, DEFAULT_OVERLAY_POSITIONS,
  SUBTITLE_ANIMATION_OPTIONS, SubtitleAnimationType,
  FIXED_LOGO_FILES, FIXED_LOGO_LABELS, DEFAULT_FIXED_LOGO,
} from '../types';

interface BgmItem { id: string; label: string; file: string }

const CANVAS_9_16_W = 297;
const CANVAS_9_16_H = 528;
const CANVAS_16_9_W = 528;
const CANVAS_16_9_H = 297;

interface Props {
  scene: Scene | null;
  settings: ProjectSettings;
  onUpdateScene: (updates: Partial<Scene>) => void;
  onUpdateSettings: (updates: Partial<ProjectSettings>) => void;
  part?: 'preview' | 'settings';
  aspectRatio?: '9:16' | '16:9';
  scenes?: Scene[];
}

interface DragPos { x: number; y: number }

function getSubtitleBaseY(position: 'top' | 'center' | 'bottom', fontSize: number, totalH: number, canvasH: number): number {
  if (position === 'top') return fontSize * 2;
  if (position === 'center') return (canvasH - totalH) / 2 + fontSize;
  return canvasH - totalH - fontSize * 1.5;
}

function getItemCanvasPos(
  item: { position: LogoPosition; customX: number | null; customY: number | null },
  itemW: number, itemH: number, canvasW: number, canvasH: number,
): { lx: number; ly: number } {
  const pad = 10;
  if (item.customX !== null && item.customY !== null) {
    return {
      lx: (item.customX / 100) * canvasW - itemW / 2,
      ly: (item.customY / 100) * canvasH - itemH / 2,
    };
  }
  const pos = item.position;
  let lx = pad, ly = pad;
  if (pos.includes('right'))  lx = canvasW - itemW - pad;
  if (pos === 'top-center' || pos === 'bottom-center') lx = (canvasW - itemW) / 2;
  if (pos.includes('bottom')) ly = canvasH - itemH - pad;
  return { lx, ly };
}

const imageCache = new Map<string, HTMLImageElement>();
function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

function drawSubtitleOnCtx(ctx: CanvasRenderingContext2D, scene: Scene, canvasW: number, canvasH: number, drag?: DragPos | null) {
  if (!scene.subtitle.enabled || !scene.script.trim()) return;
  const sub = scene.subtitle;
  const fontSize = Math.round(sub.size * (canvasW / 1080));
  ctx.font = `bold ${fontSize}px "${sub.font}", sans-serif`;

  const maxWidth = canvasW * 0.9;
  const lines = wrapText(ctx, scene.script, maxWidth);
  const lineH = fontSize * 1.3;
  const totalH = lines.length * lineH;

  const centerX = drag?.x !== undefined
    ? drag.x
    : (sub.customX !== null && sub.customX !== undefined ? (sub.customX / 100) * canvasW : canvasW / 2);

  const baseY = drag?.y !== undefined
    ? drag.y
    : (sub.customY !== null && sub.customY !== undefined
        ? (sub.customY / 100) * canvasH
        : getSubtitleBaseY(sub.position, fontSize, totalH, canvasH));

  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    const y = baseY + i * lineH;
    if (sub.borderWidth > 0) {
      ctx.strokeStyle = sub.borderColor;
      ctx.lineWidth = sub.borderWidth * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, centerX, y);
    }
    ctx.fillStyle = sub.color;
    ctx.fillText(line, centerX, y);
  });
}

function drawScene(
  canvas: HTMLCanvasElement,
  scene: Scene,
  cachedImg: HTMLImageElement | null,
  drag?: DragPos | null,
  overlayImgs?: (HTMLImageElement | null)[],
  settings?: ProjectSettings,
  fixedLogoImgs?: (HTMLImageElement | null)[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (cachedImg) {
    const canvasRatio = canvas.width / canvas.height;
    const is16x9Canvas = Math.abs(canvasRatio - 16 / 9) < Math.abs(canvasRatio - 9 / 16);
    const cropRatio = is16x9Canvas ? 16 / 9 : 9 / 16;
    let sx = 0, sy = 0, sw = cachedImg.naturalWidth, sh = cachedImg.naturalHeight;
    if (scene.crop) {
      sx = scene.crop.x; sy = scene.crop.y;
      sw = scene.crop.width; sh = scene.crop.height;
    } else {
      const imgRatio = sw / sh;
      if (imgRatio > cropRatio) { sw = sh * cropRatio; sx = (cachedImg.naturalWidth - sw) / 2; }
      else { sh = sw / cropRatio; sy = (cachedImg.naturalHeight - sh) / 2; }
    }
    ctx.drawImage(cachedImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  drawSubtitleOnCtx(ctx, scene, canvas.width, canvas.height, drag);

  // 사용자 오버레이 이미지
  const overlays = settings?.overlays ?? [];
  if (overlayImgs) {
    for (let i = 0; i < overlays.length; i++) {
      const overlay = overlays[i];
      const img = overlayImgs[i];
      if (!img) continue;
      const oW = Math.round(canvas.width * (overlay.width / 100));
      const oH = Math.round(canvas.height * (overlay.height / 100));
      const { lx, ly } = getItemCanvasPos(overlay, oW, oH, canvas.width, canvas.height);
      ctx.globalAlpha = overlay.opacity / 100;
      ctx.drawImage(img, lx, ly, oW, oH);
      ctx.globalAlpha = 1;
    }
  }

  // 고정 로고
  const fixedLogos = settings?.fixedLogos ?? [];
  if (fixedLogoImgs) {
    for (let i = 0; i < fixedLogos.length; i++) {
      const logo = fixedLogos[i];
      const img = fixedLogoImgs[i];
      if (!logo.enabled || !img) continue;
      const lW = Math.round(canvas.width * (logo.size / 100));
      const lH = Math.round(lW * (img.naturalHeight / img.naturalWidth));
      const { lx, ly } = getItemCanvasPos(logo, lW, lH, canvas.width, canvas.height);
      ctx.globalAlpha = logo.opacity / 100;
      ctx.drawImage(img, lx, ly, lW, lH);
      ctx.globalAlpha = 1;
    }
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word; }
    else current = test;
  }
  if (current) lines.push(current);
  return lines;
}

export default function PreviewPanel({ scene, settings, onUpdateScene, onUpdateSettings, part = 'preview', aspectRatio = '9:16', scenes }: Props) {
  const is16x9 = aspectRatio === '16:9';
  const CANVAS_W = is16x9 ? CANVAS_16_9_W : CANVAS_9_16_W;
  const CANVAS_H = is16x9 ? CANVAS_16_9_H : CANVAS_9_16_H;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = useState<'subtitle' | 'bgm' | 'logo' | 'image'>('subtitle');
  const [bgmList, setBgmList] = useState<BgmItem[]>([]);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const overlayImgsRef = useRef<(HTMLImageElement | null)[]>([null, null, null]);
  const fixedLogoImgsRef = useRef<(HTMLImageElement | null)[]>([null, null, null]);
  const [, forceRedraw] = useState(0);

  useEffect(() => {
    fetch('/api/shortform-editor/bgm')
      .then(r => r.json())
      .then((list: BgmItem[]) => setBgmList(list))
      .catch(() => setBgmList([]));
  }, []);

  // 사용자 오버레이 이미지 로드
  const overlays = settings.overlays ?? [];
  useEffect(() => {
    overlays.forEach((overlay, i) => {
      if (overlayImgsRef.current[i]?.src !== overlay.dataUrl) {
        loadImage(overlay.dataUrl).then(img => {
          overlayImgsRef.current[i] = img;
          forceRedraw(n => n + 1);
        }).catch(() => { overlayImgsRef.current[i] = null; });
      }
    });
    for (let i = overlays.length; i < overlayImgsRef.current.length; i++) {
      overlayImgsRef.current[i] = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays.length, settings.overlays]);

  // 고정 로고 이미지 로드
  const fixedLogos = settings.fixedLogos ?? [{ ...DEFAULT_FIXED_LOGO }, { ...DEFAULT_FIXED_LOGO }, { ...DEFAULT_FIXED_LOGO }];
  useEffect(() => {
    FIXED_LOGO_FILES.forEach((file, i) => {
      const src = `/logos/${file}`;
      loadImage(src).then(img => {
        fixedLogoImgsRef.current[i] = img;
        forceRedraw(n => n + 1);
      }).catch(() => { fixedLogoImgsRef.current[i] = null; });
    });
  }, []);

  const draggingRef = useRef(false);
  const [drag, setDrag] = useState<DragPos | null>(null);
  const cachedImgRef = useRef<HTMLImageElement | null>(null);
  const sub = useMemo(() => scene?.subtitle ?? { ...DEFAULT_SUBTITLE }, [scene?.subtitle]);

  useEffect(() => {
    if (!scene?.imageDataUrl) {
      cachedImgRef.current = null;
      if (canvasRef.current && scene) drawScene(canvasRef.current, scene, null, null, overlayImgsRef.current, settings, fixedLogoImgsRef.current);
      return;
    }
    loadImage(scene.imageDataUrl).then(img => {
      cachedImgRef.current = img;
      if (canvasRef.current && scene) drawScene(canvasRef.current, scene, img, null, overlayImgsRef.current, settings, fixedLogoImgsRef.current);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.imageDataUrl, scene?.crop]);

  useEffect(() => {
    if (!canvasRef.current || !scene) return;
    drawScene(canvasRef.current, scene, cachedImgRef.current, drag, overlayImgsRef.current, settings, fixedLogoImgsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, drag, aspectRatio, settings.overlays, settings.fixedLogos]);

  const toCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): DragPos => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scene?.subtitle.enabled || !scene?.script.trim()) return;
    draggingRef.current = true;
    setDrag(toCanvasPos(e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    setDrag(toCanvasPos(e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || !scene) return;
    draggingRef.current = false;
    const pos = toCanvasPos(e);
    const pctX = Math.min(Math.max((pos.x / CANVAS_W) * 100, 0), 100);
    const pctY = Math.min(Math.max((pos.y / CANVAS_H) * 100, 0), 100);
    onUpdateScene({ subtitle: { ...sub, customX: pctX, customY: pctY } });
    setDrag(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, sub, onUpdateScene, CANVAS_W, CANVAS_H]);

  const handleMouseLeave = useCallback(() => {
    if (draggingRef.current && scene) {
      draggingRef.current = false;
      setDrag(null);
    }
  }, [scene]);

  // ── 미리보기 파트 ──
  if (part === 'preview') {
    const hasDraggable = !!(scene?.subtitle.enabled && scene?.script.trim());
    const hasCustomPos = (sub.customX !== null && sub.customX !== undefined) ||
                         (sub.customY !== null && sub.customY !== undefined);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', background: '#111' }}>

        {/* 상단: 종횡비 선택 */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #222', flexShrink: 0, gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>비율</span>
          <div style={{ display: 'flex', gap: '0.2rem', background: '#2a2a2a', borderRadius: '5px', padding: '0.15rem', border: '1px solid #3a3a3a' }}>
            {(['9:16', '16:9'] as const).map(ar => (
              <button key={ar} onClick={() => onUpdateSettings({ aspectRatio: ar })} style={{
                padding: '0.2rem 0.7rem', borderRadius: '3px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                background: aspectRatio === ar ? '#555' : 'transparent',
                color: aspectRatio === ar ? '#fff' : '#666',
                transition: 'background 0.15s',
              }}>{ar}</button>
            ))}
          </div>
        </div>

        {/* 캔버스 영역 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', minHeight: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                display: 'block', borderRadius: '10px', background: '#222',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                cursor: hasDraggable ? 'move' : 'default',
                maxHeight: '100%', maxWidth: '100%',
              }}
            />
            {!scene?.imageDataUrl && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem', textAlign: 'center', padding: '1rem', pointerEvents: 'none' }}>
                장면을 선택하고<br />이미지를 업로드하세요
              </div>
            )}
          </div>
        </div>

        {/* 하단: 버튼 및 안내 */}
        <div style={{ width: '100%', borderTop: '1px solid #222', padding: '0.5rem 0.75rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {hasDraggable && (
            <div style={{ fontSize: '0.68rem', color: '#555', textAlign: 'center' }}>
              ↕ 캔버스 드래그로 자막 위치 이동
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {scene?.audioDataUrl && (
              <>
                <button
                  onClick={() => audioRef.current?.paused ? audioRef.current?.play() : audioRef.current?.pause()}
                  style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: '5px', color: '#ccc', padding: '0.3rem 0.9rem', cursor: 'pointer', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                >
                  ▶ 나레이션 듣기
                </button>
                <audio ref={audioRef} src={scene.audioDataUrl} />
              </>
            )}
            {hasCustomPos && (
              <button
                onClick={() => onUpdateScene({ subtitle: { ...sub, customX: null, customY: null } })}
                style={{ background: 'transparent', border: '1px solid #444', borderRadius: '5px', color: '#777', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.76rem' }}
              >
                자막 위치 초기화
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 설정 파트 (우측) ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e', borderLeft: '1px solid #333' }}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.6rem 0.6rem', borderBottom: '1px solid #333', flexShrink: 0, background: '#2a2a2a' }}>
        {(['subtitle', 'bgm', 'logo', 'image'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '0.35rem 0.15rem',
            background: activeTab === tab ? '#444' : 'transparent',
            border: `1px solid ${activeTab === tab ? '#666' : '#3a3a3a'}`,
            borderRadius: '4px',
            color: activeTab === tab ? '#fff' : '#888',
            cursor: 'pointer', fontSize: '0.72rem',
            fontWeight: activeTab === tab ? 700 : 400,
            transition: 'all 0.15s',
          }}>
            {tab === 'subtitle' ? '자막' : tab === 'bgm' ? '배경음악' : tab === 'logo' ? '로고' : '이미지'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* ── 자막 탭 ── */}
        {activeTab === 'subtitle' && (
          <div style={{ border: '1px solid #333', borderRadius: '7px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#252525' }}>
            {!scene ? (
              <p style={{ color: '#555', fontSize: '0.82rem', margin: 0 }}>장면을 선택하세요</p>
            ) : (
              <>
                <label style={labelStyle}>
                  <input type="checkbox" checked={sub.enabled} onChange={e => onUpdateScene({ subtitle: { ...sub, enabled: e.target.checked } })} style={{ accentColor: '#fff' }} />
                  <span style={{ color: '#ccc', fontSize: '0.82rem' }}>자막 표시</span>
                </label>
                {sub.enabled && (
                  <>
                    <Row label="폰트">
                      <select value={sub.font} onChange={e => onUpdateScene({ subtitle: { ...sub, font: e.target.value } })} style={selectStyle}>
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Row>
                    <Row label="글자색">
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={sub.color} onChange={e => onUpdateScene({ subtitle: { ...sub, color: e.target.value } })} style={{ width: 34, height: 30, border: 'none', borderRadius: '40px', background: 'none', cursor: 'pointer', padding: 0 }} title="글자 색" />
                        <input type="color" value={sub.borderColor} onChange={e => onUpdateScene({ subtitle: { ...sub, borderColor: e.target.value } })} style={{ width: 34, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title="테두리 색" />
                        <span style={{ color: '#888', fontSize: '0.72rem' }}>글자 / 테두리</span>
                      </div>
                    </Row>
                    <Row label={`크기 ${sub.size}`}>
                      <input type="range" min={20} max={80} value={sub.size} onChange={e => onUpdateScene({ subtitle: { ...sub, size: Number(e.target.value) } })} style={{ flex: 1, accentColor: '#fff' }} />
                    </Row>
                    <Row label={`테두리 ${sub.borderWidth}`}>
                      <input type="range" min={0} max={8} value={sub.borderWidth} onChange={e => onUpdateScene({ subtitle: { ...sub, borderWidth: Number(e.target.value) } })} style={{ flex: 1, accentColor: '#fff' }} />
                    </Row>
                    <Row label="위치">
                      <select value={sub.position} onChange={e => onUpdateScene({ subtitle: { ...sub, position: e.target.value as 'top' | 'center' | 'bottom', customX: null, customY: null } })} style={selectStyle}>
                        <option value="top">상단</option>
                        <option value="center">중앙</option>
                        <option value="bottom">하단</option>
                      </select>
                    </Row>
                    <Row label="애니메이션">
                      <select
                        value={sub.animation ?? 'none'}
                        onChange={e => onUpdateScene({ subtitle: { ...sub, animation: e.target.value as SubtitleAnimationType } })}
                        style={selectStyle}
                      >
                        {SUBTITLE_ANIMATION_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </Row>
                    {(sub.animation ?? 'none') !== 'none' && (
                      <Row label={`속도 ${(sub.animationDuration ?? 0.5).toFixed(1)}s`}>
                        <input type="range" min={1} max={20} step={1}
                          value={Math.round((sub.animationDuration ?? 0.5) * 10)}
                          onChange={e => onUpdateScene({ subtitle: { ...sub, animationDuration: Number(e.target.value) / 10 } })}
                          style={{ flex: 1, accentColor: '#fff' }} />
                      </Row>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 로고 탭 ── */}
        {activeTab === 'logo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#666', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
              public/logos/ 폴더의 로고 이미지를 영상에 고정 삽입합니다.
            </p>
            {fixedLogos.map((logo, idx) => (
              <div key={idx} style={{ border: '1px solid #333', borderRadius: '7px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', background: '#252525' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', flex: 1 }}>
                    <input type="checkbox" checked={logo.enabled}
                      onChange={e => {
                        const newLogos = fixedLogos.map((l, i) => i === idx ? { ...l, enabled: e.target.checked } : l);
                        onUpdateSettings({ fixedLogos: newLogos });
                      }}
                      style={{ accentColor: '#fff' }} />
                    <span style={{ color: '#ccc', fontSize: '0.78rem', fontWeight: 600 }}>{FIXED_LOGO_LABELS[idx]}</span>
                  </label>
                  {fixedLogoImgsRef.current[idx] ? (
                    <div style={{ background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 10px 10px', borderRadius: 4, padding: 3, border: '1px solid #555' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/logos/${FIXED_LOGO_FILES[idx]}`} alt="" style={{ height: 36, maxWidth: 72, objectFit: 'contain', display: 'block', opacity: logo.enabled ? 1 : 0.35 }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#555', border: '1px dashed #444', borderRadius: 4, padding: '0.2rem 0.5rem' }}>이미지 없음</span>
                  )}
                </div>
                {logo.enabled && (
                  <>
                    <Row label="위치">
                      <select value={logo.position} onChange={e => {
                        const newLogos = fixedLogos.map((l, i) => i === idx ? { ...l, position: e.target.value as LogoPosition, customX: null, customY: null } : l);
                        onUpdateSettings({ fixedLogos: newLogos });
                      }} style={selectStyle}>
                        <option value="top-left">좌상단</option>
                        <option value="top-center">상단 중앙</option>
                        <option value="top-right">우상단</option>
                        <option value="bottom-left">좌하단</option>
                        <option value="bottom-center">하단 중앙</option>
                        <option value="bottom-right">우하단</option>
                      </select>
                    </Row>
                    <Row label={`크기 ${logo.size}%`}>
                      <input type="range" min={5} max={50} value={logo.size}
                        onChange={e => {
                          const newLogos = fixedLogos.map((l, i) => i === idx ? { ...l, size: Number(e.target.value) } : l);
                          onUpdateSettings({ fixedLogos: newLogos });
                        }}
                        style={{ flex: 1, accentColor: '#fff' }} />
                    </Row>
                    <Row label={`불투명도 ${logo.opacity}%`}>
                      <input type="range" min={10} max={100} value={logo.opacity}
                        onChange={e => {
                          const newLogos = fixedLogos.map((l, i) => i === idx ? { ...l, opacity: Number(e.target.value) } : l);
                          onUpdateSettings({ fixedLogos: newLogos });
                        }}
                        style={{ flex: 1, accentColor: '#fff' }} />
                    </Row>
                    {(logo.customX !== null || logo.customY !== null) && (
                      <button
                        onClick={() => {
                          const newLogos = fixedLogos.map((l, i) => i === idx ? { ...l, customX: null, customY: null } : l);
                          onUpdateSettings({ fixedLogos: newLogos });
                        }}
                        style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        위치 초기화
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 이미지 (오버레이) 탭 ── */}
        {activeTab === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p style={{ color: '#666', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
              이미지를 추가하면 영상에 오버레이됩니다.<br />
              적용할 장면을 개별로 선택할 수 있습니다.
            </p>

            {overlays.map((overlay, idx) => {
              const sceneList = scenes ?? [];
              const isAll = overlay.sceneIds == null;
              const isSceneActive = (sceneId: string) => isAll || (overlay.sceneIds?.includes(sceneId) ?? false);

              const toggleScene = (sceneId: string) => {
                let newIds: string[] | null;
                if (isAll) {
                  newIds = sceneList.map(s => s.id).filter(id => id !== sceneId);
                  if (newIds.length === 0) newIds = null;
                } else if (overlay.sceneIds!.includes(sceneId)) {
                  newIds = overlay.sceneIds!.filter(id => id !== sceneId);
                  if (newIds.length === 0) newIds = null;
                } else {
                  newIds = [...overlay.sceneIds!, sceneId];
                  if (newIds.length === sceneList.length) newIds = null;
                }
                onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, sceneIds: newIds } : o) });
              };

              return (
                <div key={idx} style={{ border: '1px solid #333', borderRadius: '7px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', background: '#252525' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#aaa', fontSize: '0.76rem', fontWeight: 600, minWidth: '48px' }}>이미지 {idx + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={overlay.dataUrl} alt="" style={{ height: 26, maxWidth: 56, objectFit: 'contain', background: '#111', border: '1px solid #444', borderRadius: 3, padding: 2 }} />
                    <button
                      onClick={() => onUpdateSettings({ overlays: overlays.filter((_, i) => i !== idx) })}
                      style={{ marginLeft: 'auto', padding: '0.18rem 0.4rem', background: '#2a0a0a', border: '1px solid #5a1d1d', color: '#f87171', borderRadius: 4, cursor: 'pointer', fontSize: '0.68rem' }}
                    >제거</button>
                  </div>

                  <Row label="위치">
                    <select value={overlay.position} onChange={e => {
                      onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, position: e.target.value as LogoPosition, customX: null, customY: null } : o) });
                    }} style={selectStyle}>
                      <option value="top-left">좌상단</option>
                      <option value="top-center">상단 중앙</option>
                      <option value="top-right">우상단</option>
                      <option value="bottom-left">좌하단</option>
                      <option value="bottom-center">하단 중앙</option>
                      <option value="bottom-right">우하단</option>
                    </select>
                  </Row>
                  <Row label={`가로 ${Math.round(overlay.width)}%`}>
                    <input type="range" min={5} max={100} value={overlay.width}
                      onChange={e => onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, width: Number(e.target.value) } : o) })}
                      style={{ flex: 1, accentColor: '#fff' }} />
                  </Row>
                  <Row label={`세로 ${Math.round(overlay.height)}%`}>
                    <input type="range" min={5} max={100} value={overlay.height}
                      onChange={e => onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, height: Number(e.target.value) } : o) })}
                      style={{ flex: 1, accentColor: '#fff' }} />
                  </Row>
                  <Row label={`불투명도 ${overlay.opacity}%`}>
                    <input type="range" min={10} max={100} value={overlay.opacity}
                      onChange={e => onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, opacity: Number(e.target.value) } : o) })}
                      style={{ flex: 1, accentColor: '#fff' }} />
                  </Row>

                  {sceneList.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#666', marginBottom: '0.3rem' }}>적용 장면</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <button
                          onClick={() => onUpdateSettings({ overlays: overlays.map((o, i) => i === idx ? { ...o, sceneIds: null } : o) })}
                          style={sceneBadgeStyle(isAll)}
                        >전체</button>
                        {sceneList.map((s, si) => (
                          <button key={s.id} onClick={() => toggleScene(s.id)} style={sceneBadgeStyle(isSceneActive(s.id))}>
                            {si + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {overlays.length < 3 && (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.55rem', border: '2px dashed #3a3a3a', borderRadius: '7px',
                color: '#666', cursor: 'pointer', fontSize: '0.8rem',
              }}>
                + 이미지 추가 {overlays.length > 0 ? `(${overlays.length}/3)` : ''}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const newOverlay: OverlayItem = {
                      dataUrl: ev.target?.result as string,
                      position: DEFAULT_OVERLAY_POSITIONS[overlays.length] ?? 'top-right',
                      customX: null, customY: null, opacity: 80, width: 20, height: 20, sceneIds: null,
                    };
                    onUpdateSettings({ overlays: [...overlays, newOverlay] });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </label>
            )}
            {overlays.length === 0 && (
              <p style={{ color: '#444', fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>
                이미지를 추가하면<br />모든 장면에 오버레이됩니다
              </p>
            )}
          </div>
        )}

        {/* ── 배경음악 탭 ── */}
        {activeTab === 'bgm' && (
          <div style={{ border: '1px solid #333', borderRadius: '7px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#252525' }}>
            {bgmList.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>
                public/bgm/ 폴더에 mp3 파일을 넣으면 자동으로 표시됩니다.
              </p>
            ) : (
              <>
                <Row label="음악">
                  <div style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
                    <select
                      value={settings.bgMusicId}
                      onChange={e => {
                        onUpdateSettings({ bgMusicId: e.target.value });
                        if (bgmAudioRef.current) { bgmAudioRef.current.pause(); bgmAudioRef.current = null; }
                      }}
                      style={{ ...selectStyle, flex: 1 }}
                    >
                      <option value="none">없음</option>
                      {bgmList.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                    {settings.bgMusicId !== 'none' && (
                      <button
                        onClick={() => {
                          const item = bgmList.find(o => o.id === settings.bgMusicId);
                          if (!item) return;
                          if (bgmAudioRef.current && !bgmAudioRef.current.paused) {
                            bgmAudioRef.current.pause();
                            bgmAudioRef.current = null;
                            setBgmPlaying(false);
                          } else {
                            bgmAudioRef.current = new Audio(item.file);
                            bgmAudioRef.current.volume = settings.bgMusicVolume;
                            bgmAudioRef.current.play();
                            bgmAudioRef.current.onended = () => setBgmPlaying(false);
                            setBgmPlaying(true);
                          }
                        }}
                        style={{ padding: '0.2rem 0.5rem', background: bgmPlaying ? '#3a3a3a' : '#2a2a2a', border: `1px solid ${bgmPlaying ? '#555' : '#444'}`, borderRadius: '4px', color: bgmPlaying ? '#f87171' : '#aaa', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        {bgmPlaying ? '■ 취소' : '▶ 미리듣기'}
                      </button>
                    )}
                  </div>
                </Row>
                {settings.bgMusicId !== 'none' && (
                  <>
                    <Row label={`볼륨 ${Math.round(settings.bgMusicVolume * 100)}%`}>
                      <input type="range" min={0} max={100} value={Math.round(settings.bgMusicVolume * 100)} onChange={e => onUpdateSettings({ bgMusicVolume: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: '#fff' }} />
                    </Row>
                    <Row label="페이드아웃">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.bgMusicFadeOut ?? true}
                          onChange={e => onUpdateSettings({ bgMusicFadeOut: e.target.checked })}
                          style={{ accentColor: '#fff', width: 14, height: 14 }}
                        />
                        <span style={{ color: '#aaa', fontSize: '0.78rem' }}>영상 끝에 자연스럽게 페이드아웃</span>
                      </label>
                    </Row>
                    {(settings.bgMusicFadeOut ?? true) && (
                      <Row label={`시간 ${settings.bgMusicFadeOutDuration ?? 3}s`}>
                        <input
                          type="range" min={1} max={5} step={1}
                          value={settings.bgMusicFadeOutDuration ?? 3}
                          onChange={e => onUpdateSettings({ bgMusicFadeOutDuration: Number(e.target.value) })}
                          style={{ flex: 1, accentColor: '#fff' }}
                        />
                      </Row>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: '#888', fontSize: '0.75rem', minWidth: '60px' }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function sceneBadgeStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.15rem 0.4rem', fontSize: '0.66rem', borderRadius: 3, cursor: 'pointer',
    background: active ? '#3a3a3a' : 'transparent',
    border: `1px solid ${active ? '#666' : '#3a3a3a'}`,
    color: active ? '#ccc' : '#555',
  };
}

const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' };
const selectStyle: React.CSSProperties = { flex: 1, padding: '0.3rem 0.4rem', background: '#1a1a1a', color: '#ccc', border: '1px solid #444', borderRadius: '4px', fontSize: '0.78rem' };
