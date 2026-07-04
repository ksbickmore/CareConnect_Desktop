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

export const useAnnouncerStore = create<AnnouncerStore>()((set, get) => ({
  polite: '',
  assertive: '',
  announce(message, options) {
    const assertive = options?.assertive ?? false;
    const apply = (text: string) =>
      assertive ? set({ assertive: text }) : set({ polite: text });
    // aria-live regions only fire on a content *change*, so a new message can
    // be set immediately. Re-announcing the exact same text needs a clear
    // first, deferred so React doesn't batch the two writes into a no-op.
    if (get()[assertive ? 'assertive' : 'polite'] === message) {
      apply('');
      queueMicrotask(() => apply(message));
    } else {
      apply(message);
    }
  },
}));

/** Convenience selector returning just the `announce` function. */
export const useAnnouncer = () => useAnnouncerStore((s) => s.announce);
