'use client';

import { useCallback } from 'react';
import { Scene, ProjectSettings } from '../types';

const DB_NAME = 'shortform-editor';
const DB_VERSION = 1;
const STORE = 'project';
const KEY = 'current';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useIndexedDB() {
  const save = useCallback(async (scenes: Scene[], settings: ProjectSettings) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ scenes, settings }, KEY);
      await new Promise<void>((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
      db.close();
    } catch (e) {
      console.error('[IndexedDB] save 실패:', e);
    }
  }, []);

  const load = useCallback(async (): Promise<{ scenes: Scene[]; settings: ProjectSettings } | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, 'readonly');
      const result = await new Promise<unknown>((res, rej) => {
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      db.close();
      return (result as { scenes: Scene[]; settings: ProjectSettings }) ?? null;
    } catch (e) {
      console.error('[IndexedDB] load 실패:', e);
      return null;
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      db.close();
    } catch (e) {
      console.error('[IndexedDB] clear 실패:', e);
    }
  }, []);

  return { save, load, clear };
}
