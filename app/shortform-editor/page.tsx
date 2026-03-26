'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useScenes } from '@/lib/shortform-editor/hooks/useScenes';
import { useIndexedDB } from '@/lib/shortform-editor/hooks/useIndexedDB';
import SceneList from '@/lib/shortform-editor/components/SceneList';
import PreviewPanel from '@/lib/shortform-editor/components/PreviewPanel';
import Timeline from '@/lib/shortform-editor/components/Timeline';
import { Scene } from '@/lib/shortform-editor/types';

// 자막 PNG (투명 배경) 생성 - 자막 애니메이션용 별도 레이어
async function buildSubtitlePngBlob(scene: Scene, renderW: number, renderH: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = renderW; canvas.height = renderH;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, renderW, renderH);

    if (scene.subtitle.enabled && scene.script.trim()) {
      const sub = scene.subtitle;
      const fontSize = sub.size;
      ctx.font = `bold ${fontSize}px "${sub.font}", sans-serif`;
      ctx.textAlign = 'center';

      const maxW = renderW * 0.9;
      const lines = wrapText(ctx, scene.script, maxW);
      const lineH = fontSize * 1.3;
      const totalH = lines.length * lineH;

      let baseY = 0;
      if (sub.customY !== null && sub.customY !== undefined) {
        baseY = (sub.customY / 100) * renderH;
      } else if (sub.position === 'top') baseY = fontSize * 2;
      else if (sub.position === 'center') baseY = (renderH - totalH) / 2 + fontSize;
      else baseY = renderH - totalH - fontSize * 1.5;

      const cx = sub.customX !== null && sub.customX !== undefined ? (sub.customX / 100) * renderW : renderW / 2;

      lines.forEach((line, i) => {
        const y = baseY + i * lineH;
        if (sub.borderWidth > 0) {
          ctx.strokeStyle = sub.borderColor;
          ctx.lineWidth = sub.borderWidth * 2;
          ctx.lineJoin = 'round';
          ctx.strokeText(line, cx, y);
        }
        ctx.fillStyle = sub.color;
        ctx.fillText(line, cx, y);
      });
    }
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('자막 PNG 생성 실패')), 'image/png');
  });
}

// 장면 합성 이미지(크롭+자막) 생성 - animateSubtitle=true면 자막 제외
async function buildCompositeBlob(scene: Scene, aspectRatio: '9:16' | '16:9', animateSubtitle = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const is16x9 = aspectRatio === '16:9';
    const renderW = is16x9 ? 1920 : 1080;
    const renderH = is16x9 ? 1080 : 1920;
    const ratio = is16x9 ? 16 / 9 : 9 / 16;

    const canvas = document.createElement('canvas');
    canvas.width = renderW; canvas.height = renderH;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (scene.crop) {
        sx = scene.crop.x; sy = scene.crop.y;
        sw = scene.crop.width; sh = scene.crop.height;
      } else {
        if (sw / sh > ratio) { sw = sh * ratio; sx = (img.naturalWidth - sw) / 2; }
        else { sh = sw / ratio; sy = (img.naturalHeight - sh) / 2; }
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, renderW, renderH);

      // 자막 (애니메이션 없을 때만 베이크인)
      if (!animateSubtitle && scene.subtitle.enabled && scene.script.trim()) {
        const sub = scene.subtitle;
        ctx.font = `bold ${sub.size}px "${sub.font}", sans-serif`;
        ctx.textAlign = 'center';
        const lines = wrapText(ctx, scene.script, renderW * 0.9);
        const lineH = sub.size * 1.3;
        const totalH = lines.length * lineH;
        let baseY = 0;
        if (sub.customY !== null && sub.customY !== undefined) {
          baseY = (sub.customY / 100) * renderH;
        } else if (sub.position === 'top') baseY = sub.size * 2;
        else if (sub.position === 'center') baseY = (renderH - totalH) / 2 + sub.size;
        else baseY = renderH - totalH - sub.size * 1.5;
        const cx = sub.customX !== null && sub.customX !== undefined ? (sub.customX / 100) * renderW : renderW / 2;
        lines.forEach((line, i) => {
          const y = baseY + i * lineH;
          if (sub.borderWidth > 0) {
            ctx.strokeStyle = sub.borderColor;
            ctx.lineWidth = sub.borderWidth * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, cx, y);
          }
          ctx.fillStyle = sub.color;
          ctx.fillText(line, cx, y);
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

  const aspectRatio = settings.aspectRatio ?? '9:16';

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
            model: 'gemini-2.5-flash-preview-tts',
            voice: scene.tts?.voice ?? 'Aoede',
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

    const is16x9 = aspectRatio === '16:9';
    const renderW = is16x9 ? 1920 : 1080;
    const renderH = is16x9 ? 1080 : 1920;

    setRenderStatus('preparing');
    setRenderProgress('이미지 처리 중...');

    try {
      const formData = new FormData();
      for (let i = 0; i < valid.length; i++) {
        const scene = valid[i];
        setRenderProgress(`이미지 처리 중... (${i + 1}/${valid.length})`);

        const subtitleAnimation = scene.subtitle.animation ?? 'none';
        const hasSubtitleAnim = subtitleAnimation !== 'none' && scene.subtitle.enabled && scene.script.trim();

        const imgBlob = await buildCompositeBlob(scene, aspectRatio, !!hasSubtitleAnim);
        formData.append(`image_${i}`, imgBlob, `scene_${i}.jpg`);

        // 자막 애니메이션 PNG 별도 전송
        if (hasSubtitleAnim) {
          const subPngBlob = await buildSubtitlePngBlob(scene, renderW, renderH);
          formData.append(`subtitle_png_${i}`, subPngBlob, `subtitle_${i}.png`);
        }
        formData.append(`subtitle_animation_${i}`, subtitleAnimation);
        formData.append(`subtitle_anim_dur_${i}`, String(scene.subtitle.animationDuration ?? 0.5));

        if (scene.audioDataUrl) {
          const res = await fetch(scene.audioDataUrl);
          const audioBlob = await res.blob();
          formData.append(`audio_${i}`, audioBlob, `scene_${i}.mp3`);
        }
        formData.append(`duration_${i}`, String(scene.audioDuration));
        formData.append(`motion_effect_${i}`, scene.motionEffect ?? 'none');
        formData.append(`tts_volume_${i}`, String(scene.ttsVolume ?? 1.0));
        formData.append(`scene_bgm_volume_${i}`, String(scene.sceneBgmVolume ?? 1.0));
        formData.append(`color_brightness_${i}`, String(scene.colorBrightness ?? 0));
        formData.append(`color_contrast_${i}`, String(scene.colorContrast ?? 0));
        formData.append(`color_saturation_${i}`, String(scene.colorSaturation ?? 0));
      }
      formData.append('sceneCount', String(valid.length));
      formData.append('aspectRatio', aspectRatio);
      formData.append('bgMusicId', settings.bgMusicId);
      formData.append('bgMusicVolume', String(settings.bgMusicVolume));
      formData.append('bgMusicFadeOut', String(settings.bgMusicFadeOut ?? true));
      formData.append('bgMusicFadeOutDuration', String(settings.bgMusicFadeOutDuration ?? 3));

      // 전환 효과 데이터
      for (let i = 0; i < valid.length - 1; i++) {
        const trans = valid[i].transition ?? { type: 'none', duration: 0.5 };
        formData.append(`transition_type_${i}`, trans.type);
        formData.append(`transition_duration_${i}`, String(trans.duration));
      }

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
  }, [scenes, settings, projectName, aspectRatio]);

  const isRendering = renderStatus === 'preparing' || renderStatus === 'rendering';

  // 프로젝트 파일로 내보내기 (.sfp)
  function handleSaveProject() {
    const data = JSON.stringify({ version: 1, projectName, scenes, settings }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName}.sfp`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // 프로젝트 파일 불러오기 (.sfp)
  function handleLoadProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.projectName) setProjectName(data.projectName);
        loadProject({ scenes: data.scenes, settings: data.settings });
      } catch {
        alert('프로젝트 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a', color: '#ccc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* 상단 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#2a2a2a', borderBottom: '1px solid #3a3a3a', gap: '0.6rem', flexShrink: 0 }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: '#333', border: '1px solid #444', color: '#aaa', borderRadius: '5px', padding: '0.28rem 0.55rem', cursor: 'pointer', fontSize: '0.82rem' }}
        >
          &#8592; 홈
        </button>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>숏폼 에디터</span>
        <div style={{ width: '1px', height: '16px', background: '#444' }} />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '0.85rem', outline: 'none', minWidth: '150px' }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {renderProgress && (
            <span style={{ fontSize: '0.78rem', color: renderStatus === 'error' ? '#f87171' : renderStatus === 'done' ? '#4ade80' : '#aaa' }}>
              {renderProgress}
            </span>
          )}
          {/* 불러오기 */}
          <label style={{ ...topBtnStyle('#333'), cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            불러오기
            <input type="file" accept=".sfp" style={{ display: 'none' }} onChange={handleLoadProject} />
          </label>
          <button onClick={handleSaveProject} style={topBtn('#444')}>내보내기</button>
          <button onClick={() => { save(scenes, settings); }} style={topBtn('#333')}>저장</button>
          <button onClick={() => { if (confirm('현재 프로젝트를 초기화하시겠습니까?')) { clear(); window.location.reload(); } }} style={topBtn('#5a1d1d')}>초기화</button>
          <button onClick={handleRender} disabled={isRendering} style={topBtn(isRendering ? '#333' : '#1d4ed8', isRendering)}>
            {isRendering ? '렌더링 중...' : '영상 렌더링'}
          </button>
        </div>
      </div>

      {/* 메인 영역: 3열 레이아웃 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* 좌측: 장면 목록 (4) */}
        <div style={{ flex: 3.5, minWidth: 0, borderRight: '1px solid #333', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
            aspectRatio={aspectRatio}
          />
        </div>

        {/* 중앙: 미리보기 (3) */}
        <div style={{ flex: 4, minWidth: 0, borderRight: '1px solid #333', overflow: 'hidden', background: '#111' }}>
          <PreviewPanel
            part="preview"
            scene={selectedScene}
            settings={settings}
            onUpdateScene={updates => selectedScene && updateScene(selectedScene.id, updates)}
            onUpdateSettings={updateSettings}
            aspectRatio={aspectRatio}
            scenes={scenes}
          />
        </div>

        {/* 우측: 상세 설정 (3) */}
        <div style={{ flex: 2.5, minWidth: 0, overflow: 'hidden' }}>
          <PreviewPanel
            part="settings"
            scene={selectedScene}
            settings={settings}
            onUpdateScene={updates => selectedScene && updateScene(selectedScene.id, updates)}
            onUpdateSettings={updateSettings}
            aspectRatio={aspectRatio}
            scenes={scenes}
          />
        </div>
      </div>

      {/* 타임라인 */}
      <Timeline
        scenes={scenes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={moveScene}
      />

      {/* 렌더링 오버레이 */}
      {isRendering && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: '12px', padding: '2rem', textAlign: 'center', minWidth: '280px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
              {renderStatus === 'preparing' ? '⚙️' : '🎬'}
            </div>
            <p style={{ color: '#ccc', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
              {renderStatus === 'preparing' ? '이미지 처리 중' : '영상 렌더링 중'}
            </p>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>{renderProgress}</p>
          </div>
        </div>
      )}

    </div>
  );
}

function topBtnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem', background: disabled ? '#333' : bg,
    color: disabled ? '#666' : '#ccc', border: '1px solid #555',
    borderRadius: '5px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8rem', fontWeight: 500,
  };
}

function topBtn(bg: string, disabled = false): React.CSSProperties {
  return topBtnStyle(bg, disabled);
}
