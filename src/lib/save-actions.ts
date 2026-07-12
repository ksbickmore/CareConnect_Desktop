import { useEffect, useId, useRef } from 'react';
import { create } from 'zustand';

/**
 * App-wide registry of "primary save" actions for the Ctrl+S shortcut.
 * Screens and dialogs register their save handler (via useSaveAction);
 * AppShell dispatches Ctrl+S through the registry. An open dialog's save
 * always beats the screen behind it. Sibling of the voice registry.
 */
interface SaveEntry {
  readonly id: string;
  readonly scope: 'screen' | 'dialog';
  readonly run: () => void;
}

interface SaveActionsStore {
  readonly entries: readonly SaveEntry[];
  register(entry: SaveEntry): void;
  unregister(id: string): void;
}

export const useSaveActionsStore = create<SaveActionsStore>()((set) => ({
  entries: [],
  register: (entry) =>
    set((s) => ({ entries: [...s.entries.filter((x) => x.id !== entry.id), entry] })),
  unregister: (id) =>
    set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
}));

/**
 * Run the active save action — the most recently registered dialog entry if
 * any, else the most recently registered screen entry. Returns whether
 * anything ran (AppShell announces "Nothing to save." when it didn't).
 */
export function dispatchSave(): boolean {
  const { entries } = useSaveActionsStore.getState();
  const target =
    [...entries].reverse().find((e) => e.scope === 'dialog') ??
    [...entries].reverse().find((e) => e.scope === 'screen');
  if (!target) return false;
  target.run();
  return true;
}

/**
 * Register `run` as the component's save action for its lifetime. The handler
 * is kept in a ref so the latest closure runs (form state changes every
 * keystroke) without re-registering on each render.
 */
export function useSaveAction(scope: 'screen' | 'dialog', run: () => void): void {
  const id = useId();
  const ref = useRef(run);
  useEffect(() => {
    ref.current = run;
  });

  useEffect(() => {
    const { register, unregister } = useSaveActionsStore.getState();
    register({ id, scope, run: () => ref.current() });
    return () => unregister(id);
  }, [id, scope]);
}
