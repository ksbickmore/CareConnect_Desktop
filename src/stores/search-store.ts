import { create } from 'zustand';

/**
 * Open/closed state of the global search overlay (Ctrl+F). A store rather
 * than AppShell state because the Dashboard toolbar button and the Electron
 * menu bridge both need to open it without prop drilling.
 */
interface SearchStore {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

export const useSearchStore = create<SearchStore>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
