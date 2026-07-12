import { create } from 'zustand';

/**
 * Open/closed state of the global search overlay (Ctrl+F). A store rather
 * than AppShell state because the Dashboard toolbar button, the Electron
 * menu bridge, and the voice command bar all need to open it without prop
 * drilling. `openWith` pre-fills the query (voice: "search aspirin").
 */
interface SearchStore {
  readonly open: boolean;
  readonly initialQuery: string;
  setOpen(open: boolean): void;
  openWith(query: string): void;
}

export const useSearchStore = create<SearchStore>()((set) => ({
  open: false,
  initialQuery: '',
  setOpen: (open) => set({ open, initialQuery: '' }),
  openWith: (query) => set({ open: true, initialQuery: query }),
}));
