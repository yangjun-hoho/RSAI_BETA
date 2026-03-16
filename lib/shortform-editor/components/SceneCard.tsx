'use client';

import { useRef, useState } from 'react';
import { Scene, DEFAULT_TTS, VOICE_OPTIONS_TTS1, VOICE_OPTIONS_MINI_TTS, FORMAT_OPTIONS, DEFAULT_TRANSITION, TRANSITION_OPTIONS, TransitionType, MOTION_EFFECT_OPTIONS, MotionEffectType } from '../types';
import CropTool from './CropTool';

interface Props {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Scene>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onApplyCropAll: (crop: Scene['crop']) => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function SceneCard({ scene, index, isSelected, onSelect, onUpdate, onDelete, onMoveUp, onMoveDown, onApplyCropAll, isFirst, isLast }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const tts = scene.tts ?? { ...DEFAULT_TTS };
  const trans = scene.transition ?? { ...DEFAULT_TRANSITION };
  const voiceOptions = tts.model === 'gpt-4o-mini-tts' ? VOICE_OPTIONS_MINI_TTS : VOICE_OPTIONS_TTS1;

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onUpdate({ imageDataUrl: dataUrl, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight, crop: null });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleGenerateTTS() {
    if (!scene.script.trim()) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/shortform-editor/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.script,
          model: tts.model,
          voice: tts.voice,
          speed: tts.speed,
          format: tts.format,
          instructions: tts.instructions,
        }),
      });
      if (!res.ok) throw new Error('TTS 생성 실패');
      const blob = await res.blob();
      const dataUrl = await new Promise<string>(resolve => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target?.result as string);
        r.readAsDataURL(blob);
      });
      const audio = new Audio(dataUrl);
      audio.onloadedmetadata = () => {
        onUpdate({ audioDataUrl: dataUrl, audioDuration: Math.ceil(audio.duration) });
      };
    } catch (err) {
      console.error(err);
      alert('음성 생성에 실패했습니다.');
    } finally {
      setTtsLoading(false);
    }
  }

  function handleDownloadAudio() {
    if (!scene.audioDataUrl) return;
    const a = document.createElement('a');
    a.href = scene.audioDataUrl;
    a.download = `scene_${index + 1}.${tts.format}`;
    a.click();
  }

  const thumb = scene.imageDataUrl;

  return (
    <>
      <div
        onClick={onSelect}
        style={{
          background: isSelected ? '#1e293b' : '#16213e',
          border: `2px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
          borderRadius: '10px',
          padding: '0.75rem',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.88rem' }}>#{index + 1}</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} style={arrowBtn} title="위로">▲</button>
            <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} style={arrowBtn} title="아래로">▼</button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={deleteBtn} title="삭제">✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* 썸네일 */}
          <div
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            style={{
              width: 72, height: 128, flexShrink: 0,
              background: '#0f172a', borderRadius: '6px',
              border: '2px dashed #334155',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}
            title="이미지 업로드"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            ) : (
              <>
                <span style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>+</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center' }}>이미지<br />업로드</span>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>

          {/* 우측: 대본 + 버튼들 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <textarea
              value={scene.script}
              onChange={e => onUpdate({ script: e.target.value })}
              onClick={e => e.stopPropagation()}
              placeholder="대본을 입력하세요..."
              rows={2}
              style={{
                width: '100%', resize: 'none', padding: '0.4rem 0.5rem',
                background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155',
                borderRadius: '5px', fontSize: '0.82rem', lineHeight: '1.5',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {scene.imageDataUrl && (
                <button
                  onClick={e => { e.stopPropagation(); setShowCrop(true); }}
                  style={actionBtn('#475569')}
                >
                  크롭 조정
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setShowTtsSettings(v => !v); }}
                style={actionBtn(showTtsSettings ? '#1e3a5f' : '#334155')}
              >
                TTS 설정
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleGenerateTTS(); }}
                disabled={ttsLoading || !scene.script.trim()}
                style={actionBtn(ttsLoading ? '#334155' : '#1d4ed8', ttsLoading || !scene.script.trim())}
              >
                {ttsLoading ? '생성 중...' : scene.audioDataUrl ? '음성 재생성' : '음성 생성'}
              </button>
              {!isLast && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={e => e.stopPropagation()}>
                  <select
                    value={trans.type}
                    onChange={e => onUpdate({ transition: { ...trans, type: e.target.value as TransitionType } })}
                    style={{ width: '86px', padding: '0.2rem 0.25rem', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.72rem', flexShrink: 0 }}
                  >
                    {TRANSITION_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  {trans.type !== 'none' && (
                    <>
                      <input
                        type="range" min={2} max={15} step={1}
                        value={Math.round(trans.duration * 10)}
                        onChange={e => onUpdate({ transition: { ...trans, duration: Number(e.target.value) / 10 } })}
                        style={{ width: '44px', accentColor: '#3b82f6', flexShrink: 0 }}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '0.68rem', flexShrink: 0 }}>{trans.duration.toFixed(1)}s</span>
                    </>
                  )}
                </div>
              )}
              {scene.audioDataUrl && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); handleDownloadAudio(); }}
                    style={actionBtn('#065f46')}
                    title="음성 파일 다운로드"
                  >
                    다운로드
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onUpdate({ audioDataUrl: null, audioDuration: 5 }); }}
                    style={actionBtn('#7f1d1d')}
                    title="음성 제거"
                  >
                    음성 제거
                  </button>
                </>
              )}
            </div>

            {/* 동작 효과 */}
            {scene.imageDataUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                <span style={{ color: '#64748b', fontSize: '0.7rem', flexShrink: 0 }}>동작 효과</span>
                <select
                  value={scene.motionEffect ?? 'none'}
                  onChange={e => onUpdate({ motionEffect: e.target.value as MotionEffectType })}
                  style={{ flex: 1, padding: '0.2rem 0.25rem', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.72rem' }}
                >
                  {MOTION_EFFECT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* TTS 설정 패널 */}
            {showTtsSettings && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '6px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}
              >
                {/* 모델 선택 */}
                <TtsRow label="모델">
                  <select
                    value={tts.model}
                    onChange={e => {
                      const newModel = e.target.value as 'tts-1' | 'gpt-4o-mini-tts';
                      const defaultVoice = newModel === 'gpt-4o-mini-tts' ? 'nova' : 'nova';
                      onUpdate({ tts: { ...tts, model: newModel, voice: defaultVoice } });
                    }}
                    style={ttsSelect}
                  >
                    <option value="gpt-4o-mini-tts">gpt-4o-mini-tts (고품질)</option>
                    <option value="tts-1">tts-1 (빠름)</option>
                  </select>
                </TtsRow>

                {/* 보이스 선택 */}
                <TtsRow label="보이스">
                  <select
                    value={tts.voice}
                    onChange={e => onUpdate({ tts: { ...tts, voice: e.target.value } })}
                    style={ttsSelect}
                  >
                    {voiceOptions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </TtsRow>

                {/* 감정/스타일 지시 (gpt-4o-mini-tts 전용) */}
                {tts.model === 'gpt-4o-mini-tts' && (
                  <TtsRow label="지시">
                    <input
                      type="text"
                      value={tts.instructions}
                      onChange={e => onUpdate({ tts: { ...tts, instructions: e.target.value } })}
                      placeholder="예: 깜짝 놀란 톤으로, 차분하고 따뜻하게..."
                      style={{ ...ttsSelect, flex: 1 }}
                    />
                  </TtsRow>
                )}

                {/* 속도 */}
                <TtsRow label={`속도 ${tts.speed.toFixed(1)}x`}>
                  <input
                    type="range" min={25} max={200} step={5}
                    value={Math.round(tts.speed * 100)}
                    onChange={e => onUpdate({ tts: { ...tts, speed: Number(e.target.value) / 100 } })}
                    style={{ flex: 1, accentColor: '#3b82f6' }}
                  />
                </TtsRow>

                {/* 포맷 */}
                <TtsRow label="포맷">
                  <select
                    value={tts.format}
                    onChange={e => onUpdate({ tts: { ...tts, format: e.target.value as 'mp3' | 'wav' | 'opus' | 'aac' } })}
                    style={ttsSelect}
                  >
                    {FORMAT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </TtsRow>
              </div>
            )}

            {/* 오디오 플레이어 */}
            {scene.audioDataUrl && (
              <audio
                ref={audioRef}
                src={scene.audioDataUrl}
                controls
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', height: '28px', marginTop: '0.2rem' }}
              />
            )}

            {/* 상태 표시 */}
            <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem' }}>
              <span style={{ color: scene.imageDataUrl ? '#22c55e' : '#ef4444' }}>
                {scene.imageDataUrl ? '이미지 ✓' : '이미지 없음'}
              </span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: scene.audioDataUrl ? '#22c55e' : '#ef4444' }}>
                {scene.audioDataUrl ? `음성 ✓ ${scene.audioDuration}초` : '음성 없음'}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* 크롭 도구 모달 */}
      {showCrop && scene.imageDataUrl && (
        <CropTool
          imageDataUrl={scene.imageDataUrl}
          imageWidth={scene.imageWidth}
          imageHeight={scene.imageHeight}
          initialCrop={scene.crop}
          onApply={crop => onUpdate({ crop })}
          onApplyAll={crop => onApplyCropAll(crop)}
          onClose={() => setShowCrop(false)}
        />
      )}
    </>
  );
}

function TtsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ color: '#64748b', fontSize: '0.72rem', minWidth: '44px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
  width: 22, height: 22, cursor: 'pointer', borderRadius: '3px', fontSize: '0.65rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

const deleteBtn: React.CSSProperties = {
  background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
  width: 22, height: 22, cursor: 'pointer', borderRadius: '3px', fontSize: '0.65rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

function actionBtn(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '0.25rem 0.6rem', background: disabled ? '#1e293b' : bg,
    color: disabled ? '#475569' : '#f1f5f9', border: 'none',
    borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.75rem', fontWeight: 500,
  };
}

const ttsSelect: React.CSSProperties = {
  flex: 1, padding: '0.2rem 0.3rem', background: '#1e293b', color: '#f1f5f9',
  border: '1px solid #334155', borderRadius: '4px', fontSize: '0.75rem',
};
