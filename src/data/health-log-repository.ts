import type { LogEntry } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'health-log';

/**
 * Access to the user's health-log history, ported from the mobile app. The
 * desktop build persists entries to localStorage (per the SRS zero-backend /
 * localStorage approach), so `append` was added alongside `getHistory`.
 */
export interface HealthLogRepository {
  getHistory(): readonly LogEntry[];
  /** Prepend a new entry (newest first) and persist. */
  append(entry: LogEntry): readonly LogEntry[];
}

// Seed rows mirror the Figma "Recent Entries" card so the Pain / Sleep / Mood
// chips render immediately without the user saving anything.
export const defaultHealthLogSeed: readonly LogEntry[] = [
  { date: 'Wed, May 27', painLevel: 5, sleepHours: 7, mood: 'OK', note: 'Wrist pain after typing.' },
  { date: 'Tue, May 26', painLevel: 7, sleepHours: 5.5, mood: 'Low', note: 'Flare in late afternoon.' },
  { date: 'Mon, May 25', painLevel: 4, sleepHours: 8, mood: 'Good', note: 'Better after rest.' },
  { date: 'Sun, May 24', painLevel: 6, sleepHours: 6, mood: 'OK', note: 'Light activity.' },
  { date: 'Sat, May 23', painLevel: 3, sleepHours: 7.5, mood: 'Good', note: 'Mild tingling.' },
];

export function createHealthLogRepository(
  seed: readonly LogEntry[] = loadJSON(STORAGE_KEY, defaultHealthLogSeed),
): HealthLogRepository {
  const history: LogEntry[] = [...seed];
  const persist = () => saveJSON(STORAGE_KEY, history);
  const snapshot = () => Object.freeze([...history]);

  return {
    getHistory: () => snapshot(),

    append(entry) {
      history.unshift(entry);
      persist();
      return snapshot();
    },
  };
}
