'use client';

import { useState } from 'react';
import { Scene } from '../types';
import SceneCard from './SceneCard';

interface Props {
  scenes: Scene[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Scene>) => void;
  onMove: (fromIdx: number, toIdx: number) => void;
  onApplyCropAll: (crop: Scene['crop']) => void;
  onBulkTTS: () => void;
  isBulkLoading: boolean;
  aspectRatio?: '9:16' | '16:9';
}

export default function SceneList({ scenes, selectedId, onSelect, onAdd, onDelete, onUpdate, onMove, onApplyCropAll, onBulkTTS, isBulkLoading, aspectRatio = '9:16' }: Props) {
  const readyCount = scenes.filter(s => s.imageDataUrl && s.audioDataUrl).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 툴바 */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, background: '#2a2a2a' }}>
        <button onClick={onAdd} style={toolbarBtn('#1d4ed8')}>+ 장면 추가</button>
        <button
          onClick={onBulkTTS}
          disabled={isBulkLoading || scenes.every(s => !s.script.trim())}
          style={toolbarBtn('#7c3aed', isBulkLoading || scenes.every(s => !s.script.trim()))}
        >
          {isBulkLoading ? '음성 생성 중...' : '일괄 음성 생성'}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#888' }}>
          {readyCount}/{scenes.length} 준비완료
        </div>
      </div>

      {/* 장면 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#1a1a1a' }}>
        {scenes.map((scene, idx) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            isSelected={scene.id === selectedId}
            isFirst={idx === 0}
            isLast={idx === scenes.length - 1}
            onSelect={() => onSelect(scene.id)}
            onUpdate={updates => onUpdate(scene.id, updates)}
            onDelete={() => onDelete(scene.id)}
            onMoveUp={() => onMove(idx, idx - 1)}
            onMoveDown={() => onMove(idx, idx + 1)}
            onApplyCropAll={onApplyCropAll}
            aspectRatio={aspectRatio}
          />
        ))}

        {/* 하단 추가 버튼 */}
        <button
          onClick={onAdd}
          style={{
            padding: '0.6rem', background: 'transparent',
            border: '2px dashed #444', borderRadius: '8px',
            color: '#666', cursor: 'pointer', fontSize: '0.85rem',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#888'; (e.target as HTMLElement).style.color = '#ccc'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#444'; (e.target as HTMLElement).style.color = '#666'; }}
        >
          + 장면 추가
        </button>
      </div>
    </div>
  );
}

function toolbarBtn(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem', background: disabled ? '#333' : bg,
    color: disabled ? '#666' : 'white', border: 'none',
    borderRadius: '5px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.82rem', fontWeight: 600,
  };
}
