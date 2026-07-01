import { create } from 'zustand';

import {
  createHealthLogRepository,
  type HealthLogRepository,
} from '@/data/health-log-repository';
import { todayLabel } from '@/lib/format';
import type { LogEntry } from '@/models/types';

/**
 * Bounds for the +/- step controls (C3). Pain is 0-10 (clinical scale), sleep
 * is 0-14 hours (covers naps + long sleep).
 */
export const PAIN_MIN = 0;
export const PAIN_MAX = 10;
export const SLEEP_MIN = 0;
export const SLEEP_MAX = 14;

/** Neutral default readings so the +/- controls have somewhere to start. */
const DEFAULT_PAIN = 6;
const DEFAULT_SLEEP = 7;

/**
 * Health Log store, ported from the mobile app. Owns pain / sleep / mood
 * readings plus the history list. Unlike the mobile version, saved entries are
 * persisted through the repository (localStorage) instead of being
 * session-scoped.
 */
interface HealthLogStore {
  /** Today's pain reading on the 0-10 clinical scale. */
  readonly painLevel: number;
  /** Today's sleep hours (0-14). */
  readonly sleepHours: number;
  /** Today's mood label (e.g. "OK"). */
  readonly mood: string;
  /** Past entries, newest first. */
  readonly history: readonly LogEntry[];

  incrementPain(): void;
  decrementPain(): void;
  incrementSleep(): void;
  decrementSleep(): void;
  setMood(mood: string): void;
  /**
   * Append the current reading to history and reset the controls.
   * Pass `now` for determinism in tests; production callers omit it.
   */
  addEntry(args: { note: string; now?: number }): void;
  /** Replace the backing repository and reset state. Used by tests. */
  reset(repo?: HealthLogRepository): void;
}

let repository = createHealthLogRepository();

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const useHealthLogStore = create<HealthLogStore>()((set, get) => ({
  painLevel: DEFAULT_PAIN,
  sleepHours: DEFAULT_SLEEP,
  mood: 'OK',
  history: repository.getHistory(),

  incrementPain: () =>
    set({ painLevel: clamp(get().painLevel + 1, PAIN_MIN, PAIN_MAX) }),
  decrementPain: () =>
    set({ painLevel: clamp(get().painLevel - 1, PAIN_MIN, PAIN_MAX) }),
  incrementSleep: () =>
    set({ sleepHours: clamp(get().sleepHours + 1, SLEEP_MIN, SLEEP_MAX) }),
  decrementSleep: () =>
    set({ sleepHours: clamp(get().sleepHours - 1, SLEEP_MIN, SLEEP_MAX) }),
  setMood: (mood) => set({ mood }),

  addEntry({ note, now }) {
    const stamp = now ?? Date.now();
    const trimmed = note.trim();
    const entry: LogEntry = {
      date: todayLabel(stamp),
      painLevel: get().painLevel,
      sleepHours: get().sleepHours,
      mood: get().mood,
      note: trimmed.length === 0 ? 'Logged from desktop.' : trimmed,
    };
    set({
      history: repository.append(entry),
      painLevel: DEFAULT_PAIN,
      sleepHours: DEFAULT_SLEEP,
      mood: 'OK',
    });
  },

  reset(repo) {
    repository = repo ?? createHealthLogRepository();
    set({
      painLevel: DEFAULT_PAIN,
      sleepHours: DEFAULT_SLEEP,
      mood: 'OK',
      history: repository.getHistory(),
    });
  },
}));
