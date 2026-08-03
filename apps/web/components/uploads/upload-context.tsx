'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type UploadItemStatus = 'uploading' | 'done' | 'error' | 'cancelled';

export type UploadItem = {
  id: string;
  file: File;
  bytesTotal: number;
  bytesSent: number;
  status: UploadItemStatus;
  error?: string;
};

type Ctx = {
  items: UploadItem[];
  hasActive: boolean;
  totalInProgress: number;
  /** Quantos modais estão abertos no momento. Esconde o sheet enquanto > 0. */
  modalCount: number;
  update: (id: string, patch: Partial<UploadItem>) => void;
  enqueueAndStart: (
    files: File[],
    run: (item: UploadItem, update: (patch: Partial<UploadItem>) => void) => Promise<void>,
  ) => void;
  cancel: (id: string) => void;
  clearDone: () => void;
  remove: (id: string) => void;
  registerModal: () => () => void;
};

const UploadContext = createContext<Ctx | null>(null);

let counter = 0;
const nextId = () => `up_${Date.now()}_${++counter}`;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [modalCount, setModalCount] = useState(0);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const enqueueAndStart = useCallback(
    (
      files: File[],
      run: (item: UploadItem, updateFn: (patch: Partial<UploadItem>) => void) => Promise<void>,
    ) => {
      const fresh: UploadItem[] = files.map((f) => ({
        id: nextId(),
        file: f,
        bytesTotal: f.size,
        bytesSent: 0,
        status: 'uploading',
      }));
      setItems((prev) => [...prev, ...fresh]);

      const updateFor = (id: string) => (patch: Partial<UploadItem>) => update(id, patch);
      for (const item of fresh) {
        run(item, updateFor(item.id)).catch((err) => {
          update(item.id, { status: 'error', error: err?.message ?? 'Erro' });
        });
      }
    },
    [update],
  );

  const cancel = useCallback(
    (id: string) => {
      update(id, { status: 'cancelled' });
    },
    [update],
  );

  const clearDone = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status === 'uploading'));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const itemsRef = useRef<UploadItem[]>([]);
  itemsRef.current = items;
  const totalInProgress = items.filter((i) => i.status === 'uploading').length;
  const hasActive = totalInProgress > 0;

  const registerModal = useCallback(() => {
    setModalCount((c) => c + 1);
    return () => setModalCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ items, hasActive, totalInProgress, modalCount, update, enqueueAndStart, cancel, clearDone, remove, registerModal }),
    [items, hasActive, totalInProgress, modalCount, update, enqueueAndStart, cancel, clearDone, remove, registerModal],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploads() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploads deve estar dentro de <UploadProvider>');
  return ctx;
}