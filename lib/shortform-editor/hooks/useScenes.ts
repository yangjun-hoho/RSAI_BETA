'use client';

import { useState, useCallback } from 'react';
import { Scene, ProjectSettings, DEFAULT_SUBTITLE, DEFAULT_SETTINGS, DEFAULT_TTS, DEFAULT_TRANSITION } from '../types';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function makeDefaultScene(): Scene {
  return {
    id: newId(),
    imageDataUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    crop: null,
    script: '',
    audioDataUrl: null,
    audioDuration: 5,
    subtitle: { ...DEFAULT_SUBTITLE },
    tts: { ...DEFAULT_TTS },
    transition: { ...DEFAULT_TRANSITION },
    motionEffect: 'none',
  };
}

export function useScenes() {
  const initial = makeDefaultScene();
  const [scenes, setScenes] = useState<Scene[]>([initial]);
  const [selectedId, setSelectedId] = useState<string>(initial.id);
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

  const selectedScene = scenes.find(s => s.id === selectedId) ?? null;

  const addScene = useCallback(() => {
    const s = makeDefaultScene();
    setScenes(prev => [...prev, s]);
    setSelectedId(s.id);
  }, []);

  const deleteScene = useCallback((id: string) => {
    setScenes(prev => {
      if (prev.length === 1) return prev;
      const next = prev.filter(s => s.id !== id);
      return next;
    });
    setSelectedId(prev => {
      if (prev !== id) return prev;
      const idx = scenes.findIndex(s => s.id === id);
      const next = scenes.filter(s => s.id !== id);
      return next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? '';
    });
  }, [scenes]);

  const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const moveScene = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setScenes(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<ProjectSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const loadProject = useCallback((data: { scenes: Scene[]; settings: ProjectSettings }) => {
    setScenes(data.scenes);
    setSettings(data.settings);
    setSelectedId(data.scenes[0]?.id ?? '');
  }, []);

  return {
    scenes, selectedId, selectedScene, settings,
    setSelectedId, addScene, deleteScene, updateScene,
    moveScene, updateSettings, loadProject,
  };
}
