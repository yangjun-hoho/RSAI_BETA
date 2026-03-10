'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useScenes } from '@/lib/shortform-editor/hooks/useScenes';
import { useIndexedDB } from '@/lib/shortform-editor/hooks/useIndexedDB';
import SceneList from '@/lib/shortform-editor/components/SceneList';
import PreviewPanel from '@/lib/shortform-editor/components/PreviewPanel';
import { Scene, BGM_OPTIONS } from '@/lib/shortform-editor/types';

// 렌더링 전: Canvas로 합성 이미지(크롭+자막) 생성
async function buildCompositeBlob(scene: Scene): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (scene.crop) {
        sx = scene.crop.x; sy = scene.crop.y;
        sw = scene.crop.width; sh = scene.crop.height;
      } else {
        const ratio = 9 / 16;
        if (sw / sh > ratio) { sw = sh * ratio; sx = (img.naturalWidth - sw) / 2; }
        else { sh = sw / ratio; sy = (img.naturalHeight - sh) / 2; }
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1080, 1920);

      // 자막
      if (scene.subtitle.enabled && scene.script.trim()) {
        const sub = scene.subtitle;
        ctx.font = `bold ${sub.size}px "${sub.font}", sans-serif`;
        ctx.textAlign = 'center';
        const lines = wrapText(ctx, scene.script, 1080 * 0.9);
        const lineH = sub.size * 1.3;
        const totalH = lines.length * lineH;
        let baseY = 0;
        if (sub.customY !== null && sub.customY !== undefined) {
          baseY = (sub.customY / 100) * 1920;
        } else if (sub.position === 'top') baseY = sub.size * 2;
        else if (sub.position === 'center') baseY = (1920 - totalH) / 2 + sub.size;
        else baseY = 1920 - totalH - sub.size * 1.5;
        lines.forEach((line, i) => {
          const y = baseY + i * lineH;
          if (sub.borderWidth > 0) {
            ctx.strokeStyle = sub.borderColor;
            ctx.lineWidth = sub.borderWidth * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, 540, y);
          }
          ctx.fillStyle = sub.color;
          ctx.fillText(line, 540, y);
        });
      }
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob 실패')), 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = scene.imageDataUrl!;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export default function ShortformEditorPage() {
  const router = useRouter();
  const { scenes, selectedId, selectedScene, settings, setSelectedId, addScene, deleteScene, updateScene, moveScene, updateSettings, loadProject } = useScenes();
  const { save, load, clear } = useIndexedDB();
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'preparing' | 'rendering' | 'done' | 'error'>('idle');
  const [renderProgress, setRenderProgress] = useState('');
  const [projectName, setProjectName] = useState('새 숏폼 프로젝트');

  // 자동 저장 (5초마다)
  useEffect(() => {
    const timer = setInterval(() => { save(scenes, settings); }, 5000);
    return () => clearInterval(timer);
  }, [scenes, settings, save]);

  // 초기 로드
  useEffect(() => {
    load().then(data => { if (data) loadProject(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 모든 장면에 크롭 적용
  const handleApplyCropAll = useCallback((crop: Scene['crop']) => {
    scenes.forEach(s => updateScene(s.id, { crop }));
  }, [scenes, updateScene]);

  // 일괄 음성 생성
  const handleBulkTTS = useCallback(async () => {
    setIsBulkLoading(true);
    for (const scene of scenes) {
      if (!scene.script.trim()) continue;
      try {
        const res = await fetch('/api/shortform-editor/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scene.script,
            model: scene.tts?.model ?? 'gpt-4o-mini-tts',
            voice: scene.tts?.voice ?? 'nova',
            speed: scene.tts?.speed ?? 1.0,
            format: scene.tts?.format ?? 'mp3',
            instructions: scene.tts?.instructions ?? '',
          }),
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = e => r(e.target?.result as string); fr.readAsDataURL(blob); });
        const audio = new Audio(dataUrl);
        await new Promise<void>(r => { audio.onloadedmetadata = () => r(); });
        updateScene(scene.id, { audioDataUrl: dataUrl, audioDuration: Math.ceil(audio.duration) });
      } catch (e) { console.error(e); }
    }
    setIsBulkLoading(false);
  }, [scenes, updateScene]);

  // 렌더링
  const handleRender = useCallback(async () => {
    const valid = scenes.filter(s => s.imageDataUrl);
    if (valid.length === 0) { alert('이미지가 업로드된 장면이 없습니다.'); return; }
    const noAudio = valid.filter(s => !s.audioDataUrl);
    if (noAudio.length > 0 && !confirm(`${noAudio.length}개 장면에 음성이 없습니다. 계속하시겠습니까? (음성 없는 장면은 5초로 처리)`)) return;

    setRenderStatus('preparing');
    setRenderProgress('이미지 처리 중...');

    try {
      const formData = new FormData();
      for (let i = 0; i < valid.length; i++) {
        const scene = valid[i];
        setRenderProgress(`이미지 처리 중... (${i + 1}/${valid.length})`);

        const imgBlob = await buildCompositeBlob(scene);
        formData.append(`image_${i}`, imgBlob, `scene_${i}.jpg`);

        if (scene.audioDataUrl) {
          const res = await fetch(scene.audioDataUrl);
          const audioBlob = await res.blob();
          formData.append(`audio_${i}`, audioBlob, `scene_${i}.mp3`);
        }
        formData.append(`duration_${i}`, String(scene.audioDuration));
      }
      formData.append('sceneCount', String(valid.length));
      formData.append('bgMusicId', settings.bgMusicId);
      formData.append('bgMusicVolume', String(settings.bgMusicVolume));

      setRenderStatus('rendering');
      setRenderProgress('서버에서 영상 렌더링 중...');

      const res = await fetch('/api/shortform-editor/render', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
        throw new Error(err.error || '렌더링 실패');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      setRenderStatus('done');
      setRenderProgress('완료! 다운로드 되었습니다.');
      setTimeout(() => { setRenderStatus('idle'); setRenderProgress(''); }, 3000);
    } catch (err) {
      setRenderStatus('error');
      setRenderProgress(err instanceof Error ? err.message : '렌더링 오류');
      setTimeout(() => { setRenderStatus('idle'); setRenderProgress(''); }, 5000);
    }
  }, [scenes, settings, projectName]);

  const isRendering = renderStatus === 'preparing' || renderStatus === 'rendering';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1e', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* 상단 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1rem', background: '#0f172a', borderBottom: '1px solid #1e293b', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={() => router.push('/')}
          title="메인 채팅으로 이동"
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          &#8592; 홈
        </button>
        <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1rem' }}>숏폼 에디터</span>
        <div style={{ width: '1px', height: '18px', background: '#1e293b' }} />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.88rem', outline: 'none', minWidth: '160px' }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {renderProgress && (
            <span style={{ fontSize: '0.8rem', color: renderStatus === 'error' ? '#ef4444' : renderStatus === 'done' ? '#22c55e' : '#94a3b8' }}>
              {renderProgress}
            </span>
          )}
          <button onClick={() => { save(scenes, settings); }} style={topBtn('#334155')}>저장</button>
          <button onClick={() => { if (confirm('현재 프로젝트를 초기화하시겠습니까?')) { clear(); window.location.reload(); } }} style={topBtn('#7f1d1d')}>초기화</button>
          <button
            onClick={handleRender}
            disabled={isRendering}
            style={topBtn(isRendering ? '#334155' : '#1d4ed8', isRendering)}
          >
            {isRendering ? '렌더링 중...' : '영상 렌더링'}
          </button>
        </div>
      </div>

      {/* 메인 영역: 3열 레이아웃 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* 좌측: 장면 목록 (4) */}
        <div style={{ flex: 4, minWidth: 0, borderRight: '1px solid #1e293b', background: '#0d1526', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SceneList
            scenes={scenes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={addScene}
            onDelete={deleteScene}
            onUpdate={updateScene}
            onMove={moveScene}
            onApplyCropAll={handleApplyCropAll}
            onBulkTTS={handleBulkTTS}
            isBulkLoading={isBulkLoading}
          />
        </div>

        {/* 중앙: 9:16 미리보기 (3) */}
        <div style={{ flex: 3, minWidth: 0, borderRight: '1px solid #1e293b', overflow: 'hidden' }}>
          <PreviewPanel
            part="preview"
            scene={selectedScene}
            settings={settings}
            onUpdateScene={updates => selectedScene && updateScene(selectedScene.id, updates)}
            onUpdateSettings={updateSettings}
          />
        </div>

        {/* 우측: 상세 설정 (3) */}
        <div style={{ flex: 3, minWidth: 0, overflow: 'hidden' }}>
          <PreviewPanel
            part="settings"
            scene={selectedScene}
            settings={settings}
            onUpdateScene={updates => selectedScene && updateScene(selectedScene.id, updates)}
            onUpdateSettings={updateSettings}
          />
        </div>
      </div>

      {/* 렌더링 오버레이 */}
      {isRendering && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '2rem', textAlign: 'center', minWidth: '280px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
              {renderStatus === 'preparing' ? '⚙️' : '🎬'}
            </div>
            <p style={{ color: '#f1f5f9', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
              {renderStatus === 'preparing' ? '이미지 처리 중' : '영상 렌더링 중'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>{renderProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function topBtn(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '0.4rem 0.9rem', background: disabled ? '#1e293b' : bg,
    color: disabled ? '#475569' : 'white', border: 'none',
    borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem', fontWeight: 600,
  };
}
