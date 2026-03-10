'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CropData } from '../types';

interface Props {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  initialCrop: CropData | null;
  onApply: (crop: CropData) => void;
  onApplyAll: (crop: CropData) => void;
  onClose: () => void;
}

const DISPLAY_MAX_W = 700;
const DISPLAY_MAX_H = 500;

export default function CropTool({ imageDataUrl, imageWidth, imageHeight, initialCrop, onApply, onApplyAll, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 디스플레이 스케일
  const scaleX = imageWidth ? DISPLAY_MAX_W / imageWidth : 1;
  const scaleY = imageHeight ? DISPLAY_MAX_H / imageHeight : 1;
  const scale = Math.min(scaleX, scaleY, 1);
  const dw = Math.round(imageWidth * scale);
  const dh = Math.round(imageHeight * scale);

  // 줌: 100% = 최대 9:16 크롭(가장 많은 영역), 300% = 3배 확대
  const [zoom, setZoom] = useState(100);

  // 크롭 박스 디스플레이 좌표 (left-top)
  const [bx, setBx] = useState(0);
  const [by, setBy] = useState(0);

  const isDragging = useRef(false);
  const dragRef = useRef({ mx: 0, my: 0, bx: 0, by: 0 });

  // 박스 크기 계산 (zoom에 따라 변함)
  const getBoxSize = useCallback(() => {
    // 기준: 9:16 비율로 dh를 꽉 채우는 박스
    let baseH = dh;
    let baseW = baseH * 9 / 16;
    if (baseW > dw) { baseW = dw; baseH = baseW * 16 / 9; }
    const bh = baseH * (100 / zoom);
    const bw = bh * 9 / 16;
    return { bw: Math.round(bw), bh: Math.round(bh) };
  }, [dw, dh, zoom]);

  // 초기 위치 설정
  useEffect(() => {
    if (!dw || !dh) return;
    const { bw, bh } = getBoxSize();
    if (initialCrop) {
      setBx(Math.round(initialCrop.x * scale));
      setBy(Math.round(initialCrop.y * scale));
    } else {
      setBx(Math.round((dw - bw) / 2));
      setBy(Math.round((dh - bh) / 2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dw, dh]);

  // 줌 변경 시 박스가 화면 밖으로 나가지 않게 보정
  useEffect(() => {
    const { bw, bh } = getBoxSize();
    setBx(prev => Math.max(0, Math.min(prev, dw - bw)));
    setBy(prev => Math.max(0, Math.min(prev, dh - bh)));
  }, [zoom, getBoxSize, dw, dh]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragRef.current = { mx: e.clientX, my: e.clientY, bx, by };

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const { bw, bh } = getBoxSize();
      const nx = dragRef.current.bx + ev.clientX - dragRef.current.mx;
      const ny = dragRef.current.by + ev.clientY - dragRef.current.my;
      setBx(Math.max(0, Math.min(nx, dw - bw)));
      setBy(Math.max(0, Math.min(ny, dh - bh)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const getCropData = (): CropData => {
    const { bw, bh } = getBoxSize();
    return {
      x: Math.round(bx / scale),
      y: Math.round(by / scale),
      width: Math.round(bw / scale),
      height: Math.round(bh / scale),
    };
  };

  const { bw, bh } = getBoxSize();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: '1rem', fontWeight: 700 }}>화면 조정 (Pan & Zoom) — 9:16 숏폼</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* 이미지 + 크롭 박스 */}
        <div ref={containerRef} style={{ position: 'relative', width: dw, height: dh, background: '#000', userSelect: 'none', overflow: 'hidden', borderRadius: '6px' }}>
          {/* 어두운 전체 이미지 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageDataUrl} style={{ position: 'absolute', width: dw, height: dh, objectFit: 'fill', opacity: 0.35 }} alt="" draggable={false} />

          {/* 밝은 크롭 영역 */}
          <div
            style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, cursor: 'move', overflow: 'hidden', border: '2px dashed #3b82f6', boxSizing: 'border-box' }}
            onMouseDown={handleMouseDown}
          >
            {/* 원본 밝기로 보이는 이미지 조각 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              style={{ position: 'absolute', width: dw, height: dh, objectFit: 'fill', left: -bx, top: -by, pointerEvents: 'none' }}
              alt=""
              draggable={false}
            />
            {/* 3×3 그리드 */}
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', pointerEvents: 'none' }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ border: '0.5px solid rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* 줌 슬라이더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', minWidth: '80px' }}>크기(Zoom):</span>
          <input
            type="range" min={100} max={300} step={5} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#3b82f6' }}
          />
          <span style={{ color: '#f1f5f9', minWidth: '45px', textAlign: 'right', fontSize: '0.9rem' }}>{zoom}%</span>
          <button onClick={() => setZoom(100)} style={{ padding: '0.25rem 0.6rem', background: '#334155', color: '#94a3b8', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            초기화
          </button>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.55rem 1.4rem', background: '#334155', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>취소</button>
          <button onClick={() => { onApply(getCropData()); onClose(); }} style={{ padding: '0.55rem 1.4rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>적용</button>
          <button onClick={() => { onApplyAll(getCropData()); onClose(); }} style={{ padding: '0.55rem 1.4rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>모든 장면에 적용</button>
        </div>
      </div>
    </div>
  );
}
