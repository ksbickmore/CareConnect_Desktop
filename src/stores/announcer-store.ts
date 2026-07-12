import { create } from 'zustand';

/**
 * Global screen-reader announcer. The SRS requires a polite aria-live region
 * on every route for confirmations (medication logged, entry saved, filter
 * applied) and an assertive one for time-sensitive alerts (emergency sent,
 * "already logged today"). Any component can call `announce` without prop
 * drilling; `LiveRegion` (mounted once in AppShell) renders both regions.
 *
 * The store only records the message text (synchronously, so tests can assert
 * it) plus a nonce that increments on every call — including repeats of the
 * same text. `LiveRegion` watches the nonce and performs the clear-then-set
 * DOM dance that actually makes screen readers speak.
 */
interface AnnouncerStore {
  readonly polite: string;
  readonly politeNonce: number;
  readonly assertive: string;
  readonly assertiveNonce: number;
  announce(message: string, options?: { assertive?: boolean }): void;
}

export const useAnnouncerStore = create<AnnouncerStore>()((set) => ({
  polite: '',
  politeNonce: 0,
  assertive: '',
  assertiveNonce: 0,
  announce(message, options) {
    if (options?.assertive) {
      set((s) => ({ assertive: message, assertiveNonce: s.assertiveNonce + 1 }));
    } else {
      set((s) => ({ polite: message, politeNonce: s.politeNonce + 1 }));
    }
  },
}));

/** Convenience selector returning just the `announce` function. */
export const useAnnouncer = () => useAnnouncerStore((s) => s.announce);
