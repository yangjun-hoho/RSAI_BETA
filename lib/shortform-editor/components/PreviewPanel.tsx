'use client';

import { useRef, useEffect, useState } from 'react';
import { Scene, ProjectSettings, BGM_OPTIONS, FONT_OPTIONS, DEFAULT_SUBTITLE } from '../types';

interface Props {
  scene: Scene | null;
  settings: ProjectSettings;
  onUpdateScene: (updates: Partial<Scene>) => void;
  onUpdateSettings: (updates: Partial<ProjectSettings>) => void;
  part?: 'preview' | 'settings'; // 기본값: 'preview'
}

// 크롭 데이터를 기반으로 canvas에 9:16 이미지 그리기
function drawCroppedImage(canvas: HTMLCanvasElement, scene: Scene) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !scene.imageDataUrl) return;

  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (scene.crop) {
      sx = scene.crop.x; sy = scene.crop.y;
      sw = scene.crop.width; sh = scene.crop.height;
    } else {
      // 기본 중앙 9:16 크롭
      const targetRatio = 9 / 16;
      const imgRatio = sw / sh;
      if (imgRatio > targetRatio) {
        sw = sh * targetRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = sw / targetRatio;
        sy = (img.naturalHeight - sh) / 2;
      }
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // 자막 렌더링
    if (scene.subtitle.enabled && scene.script.trim()) {
      const sub = scene.subtitle;
      const fontSize = Math.round(sub.size * (canvas.width / 1080));
      ctx.font = `bold ${fontSize}px "${sub.font}", sans-serif`;
      ctx.textAlign = 'center';

      const text = scene.script;
      const maxWidth = canvas.width * 0.9;
      const lines = wrapText(ctx, text, maxWidth);

      const lineH = fontSize * 1.3;
      const totalH = lines.length * lineH;
      let baseY = 0;
      if (sub.position === 'top') baseY = fontSize * 2;
      else if (sub.position === 'center') baseY = (canvas.height - totalH) / 2 + fontSize;
      else baseY = canvas.height - totalH - fontSize * 1.5;

      lines.forEach((line, i) => {
        const y = baseY + i * lineH;
        if (sub.borderWidth > 0) {
          ctx.strokeStyle = sub.borderColor;
          ctx.lineWidth = sub.borderWidth * 2;
          ctx.lineJoin = 'round';
          ctx.strokeText(line, canvas.width / 2, y);
        }
        ctx.fillStyle = sub.color;
        ctx.fillText(line, canvas.width / 2, y);
      });
    }
  };
  img.src = scene.imageDataUrl;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function PreviewPanel({ scene, settings, onUpdateScene, onUpdateSettings, part = 'preview' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = useState<'subtitle' | 'bgm'>('subtitle');

  useEffect(() => {
    if (!canvasRef.current || !scene) return;
    drawCroppedImage(canvasRef.current, scene);
  }, [scene?.imageDataUrl, scene?.crop, scene?.script, scene?.subtitle]);

  const sub = scene?.subtitle ?? { ...DEFAULT_SUBTITLE };

  // 중앙: 미리보기 캔버스
  if (part === 'preview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080d1a', gap: '0.75rem', padding: '1.25rem 0' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={270}
            height={480}
            style={{ display: 'block', borderRadius: '12px', background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
          />
          {!scene?.imageDataUrl && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
              장면을 선택하고<br />이미지를 업로드하세요
            </div>
          )}
          {scene?.audioDataUrl && (
            <button
              onClick={() => audioRef.current?.paused ? audioRef.current?.play() : audioRef.current?.pause()}
              style={{ position: 'absolute', bottom: '0.6rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(59,130,246,0.9)', border: 'none', borderRadius: '20px', color: 'white', padding: '0.3rem 1rem', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              나레이션 미리듣기
            </button>
          )}
        </div>
        {scene?.audioDataUrl && <audio ref={audioRef} src={scene.audioDataUrl} />}
        <div style={{ fontSize: '0.72rem', color: '#334155' }}>9 : 16 미리보기</div>
      </div>
    );
  }

  // 우측: 설정 패널
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1526', borderLeft: '1px solid #1e293b' }}>
      {/* 탭 헤더 */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        {(['subtitle', 'bgm'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '0.45rem 0.5rem',
            background: 'transparent',
            border: `1px solid ${activeTab === tab ? '#3b82f6' : '#334155'}`,
            borderRadius: '6px',
            color: activeTab === tab ? '#3b82f6' : '#64748b',
            cursor: 'pointer', fontSize: '0.82rem',
            fontWeight: activeTab === tab ? 700 : 400,
            transition: 'border-color 0.15s, color 0.15s',
          }}>
            {tab === 'subtitle' ? '자막 스타일' : '배경음악'}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeTab === 'subtitle' && (
          <div style={{ border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {!scene ? (
              <p style={{ color: '#334155', fontSize: '0.82rem', margin: 0 }}>장면을 선택하세요</p>
            ) : (
              <>
                <label style={labelStyle}>
                  <input type="checkbox" checked={sub.enabled} onChange={e => onUpdateScene({ subtitle: { ...sub, enabled: e.target.checked } })} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>자막 표시</span>
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
                        <input type="color" value={sub.color} onChange={e => onUpdateScene({ subtitle: { ...sub, color: e.target.value } })} style={{ width: 34, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title="글자 색" />
                        <input type="color" value={sub.borderColor} onChange={e => onUpdateScene({ subtitle: { ...sub, borderColor: e.target.value } })} style={{ width: 34, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title="테두리 색" />
                        <span style={{ color: '#64748b', fontSize: '0.72rem' }}>글자 / 테두리</span>
                      </div>
                    </Row>
                    <Row label={`크기 ${sub.size}`}>
                      <input type="range" min={20} max={80} value={sub.size} onChange={e => onUpdateScene({ subtitle: { ...sub, size: Number(e.target.value) } })} style={{ flex: 1, accentColor: '#3b82f6' }} />
                    </Row>
                    <Row label={`테두리 ${sub.borderWidth}`}>
                      <input type="range" min={0} max={8} value={sub.borderWidth} onChange={e => onUpdateScene({ subtitle: { ...sub, borderWidth: Number(e.target.value) } })} style={{ flex: 1, accentColor: '#3b82f6' }} />
                    </Row>
                    <Row label="위치">
                      <select value={sub.position} onChange={e => onUpdateScene({ subtitle: { ...sub, position: e.target.value as 'top' | 'center' | 'bottom' } })} style={selectStyle}>
                        <option value="top">상단</option>
                        <option value="center">중앙</option>
                        <option value="bottom">하단</option>
                      </select>
                    </Row>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'bgm' && (
          <div style={{ border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <Row label="배경음악">
              <select value={settings.bgMusicId} onChange={e => onUpdateSettings({ bgMusicId: e.target.value })} style={selectStyle}>
                {BGM_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </Row>
            {settings.bgMusicId !== 'none' && (
              <Row label={`볼륨 ${Math.round(settings.bgMusicVolume * 100)}%`}>
                <input type="range" min={0} max={100} value={Math.round(settings.bgMusicVolume * 100)} onChange={e => onUpdateSettings({ bgMusicVolume: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: '#3b82f6' }} />
              </Row>
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
      <span style={{ color: '#64748b', fontSize: '0.78rem', minWidth: '60px' }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' };
const selectStyle: React.CSSProperties = { flex: 1, padding: '0.3rem 0.4rem', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.8rem' };
