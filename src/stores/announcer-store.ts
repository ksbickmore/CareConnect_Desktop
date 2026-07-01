import { create } from 'zustand';

/**
 * Global screen-reader announcer. The SRS requires a polite aria-live region
 * on every route for confirmations (medication logged, entry saved, filter
 * applied) and an assertive one for time-sensitive alerts (emergency sent,
 * "already logged today"). Any component can call `announce` without prop
 * drilling; `LiveRegion` (mounted once in AppShell) renders both regions.
 */
interface AnnouncerStore {
  readonly polite: string;
  readonly assertive: string;
  announce(message: string, options?: { assertive?: boolean }): void;
}

export const useAnnouncerStore = create<AnnouncerStore>()((set) => ({
  polite: '',
  assertive: '',
  announce(message, options) {
    // Clear first so re-announcing the same text still fires the live region.
    if (options?.assertive) {
      set({ assertive: '' });
      queueMicrotask(() => set({ assertive: message }));
    } else {
      set({ polite: '' });
      queueMicrotask(() => set({ polite: message }));
    }
  },
}));

/** Convenience selector returning just the `announce` function. */
export const useAnnouncer = () => useAnnouncerStore((s) => s.announce);
