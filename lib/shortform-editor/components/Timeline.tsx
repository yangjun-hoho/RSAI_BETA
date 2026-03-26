'use client';

import { useRef } from 'react';
import { Scene } from '../types';

interface Props {
  scenes: Scene[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (fromIdx: number, toIdx: number) => void;
}

export default function Timeline({ scenes, selectedId, onSelect, onMove }: Props) {
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function handleDragStart(idx: number) { dragIdx.current = idx; }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); dragOverIdx.current = idx; }
  function handleDrop() {
    if (dragIdx.current !== null && dragOverIdx.current !== null && dragIdx.current !== dragOverIdx.current) {
      onMove(dragIdx.current, dragOverIdx.current);
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
  }

  const totalDuration = scenes.reduce((sum, s) => sum + (s.audioDuration || 5), 0);

  return (
    <div style={{
      height: '88px',
      background: '#111',
      borderTop: '1px solid #2a2a2a',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      {/* 라벨 */}
      <div style={{
        width: '52px', flexShrink: 0, borderRight: '1px solid #2a2a2a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
      }}>
        <span style={{ color: '#444', fontSize: '0.58rem', letterSpacing: '0.05em', transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
          TIMELINE
        </span>
        <span style={{ color: '#444', fontSize: '0.58rem' }}>{totalDuration.toFixed(0)}s</span>
      </div>

      {/* 타임라인 트랙 */}
      <div
        style={{
          flex: 1, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', alignItems: 'center',
          padding: '0 0.5rem', gap: '3px',
        }}
      >
        {scenes.map((scene, idx) => {
          const isSelected = scene.id === selectedId;
          const thumb = scene.imageDataUrl;
          const dur = scene.audioDuration || 5;
          const w = Math.max(70, Math.min(200, dur * 16));
          const hasAudio = !!scene.audioDataUrl;
          const hasMedia = !!scene.imageDataUrl;

          return (
            <div
              key={scene.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              onClick={() => onSelect(scene.id)}
              style={{
                width: `${w}px`, height: '66px', flexShrink: 0,
                borderRadius: '4px',
                border: `1.5px solid ${isSelected ? '#3b82f6' : '#2a2a2a'}`,
                background: isSelected ? '#1a2035' : '#1a1a1a',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 썸네일 */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} draggable={false} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#333', fontSize: '0.9rem' }}>+</span>
                  </div>
                )}
                {/* 씬 번호 */}
                <div style={{ position: 'absolute', top: 2, left: 4, color: isSelected ? '#9ab8f0' : '#777', fontSize: '0.6rem', fontWeight: 700, textShadow: '0 0 3px #000' }}>
                  {idx + 1}
                </div>
              </div>

              {/* 하단 바 */}
              <div style={{ height: '16px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasMedia ? '#4ade80' : '#555' }} title={hasMedia ? '이미지 있음' : '이미지 없음'} />
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasAudio ? '#60a5fa' : '#555' }} title={hasAudio ? '음성 있음' : '음성 없음'} />
                </div>
                <span style={{ color: '#555', fontSize: '0.56rem' }}>{dur}s</span>
              </div>

              {/* 전환 화살표 */}
              {idx < scenes.length - 1 && scene.transition?.type !== 'none' && (
                <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', fontSize: '0.6rem', zIndex: 2 }}>→</div>
              )}
            </div>
          );
        })}
        <div style={{ width: '0.5rem', flexShrink: 0 }} />
      </div>
    </div>
  );
}
