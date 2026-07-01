import type { Medication } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'medications';

/**
 * Read/write access to the user's medication list, ported from the mobile
 * app. In-memory implementation behind an interface so the store above
 * doesn't depend on the storage mechanism. Methods return the new snapshot
 * so the store can update state without a follow-up read.
 */
export interface MedicationsRepository {
  /** Returns a frozen snapshot of the current list. */
  getAll(): Promise<readonly Medication[]>;
  /**
   * Flips status to `taken` and stamps `lastTakenAt = now`.
   * Rejects if `id` doesn't exist.
   */
  markTaken(id: string): Promise<readonly Medication[]>;
  /** Appends a new medication. Rejects if its id collides. */
  add(med: Medication): Promise<readonly Medication[]>;
}

// Seed data matches the desktop Figma (medications.png): a "Today" group of
// active meds plus one already-completed med, with the extra detail-panel
// fields the desktop layout shows.
export const defaultMedicationsSeed: readonly Medication[] = [
  {
    id: 'lisinopril-10mg',
    name: 'Lisinopril',
    dose: '10 mg',
    schedule: 'Once daily',
    timeLabel: '8:00 AM · Daily',
    instructions:
      'Take with water in the morning. Avoid skipping doses — contact ' +
      'Dr. Park before stopping.',
    status: 'dueSoon',
    lastTakenAt: null,
    category: 'Blood pressure',
    refill: '12 days left',
    adherence: '6 of 7',
    prescriber: 'Dr. Park',
  },
  {
    id: 'ibuprofen-400mg',
    name: 'Ibuprofen',
    dose: '400 mg',
    schedule: 'As needed',
    timeLabel: '1:00 PM · As needed',
    instructions: 'Take with food for wrist pain. Max 3 times per day.',
    status: 'reminderSet',
    lastTakenAt: null,
    category: 'Pain relief',
    refill: '20 days left',
    adherence: '4 of 7',
    prescriber: 'Dr. Park',
  },
  {
    id: 'vitamin-b6-50mg',
    name: 'Vitamin B6',
    dose: '50 mg',
    schedule: 'Once daily',
    timeLabel: '9:00 PM · Daily',
    instructions: 'Supports nerve health. Take with dinner.',
    status: 'scheduled',
    lastTakenAt: null,
    category: 'Supplement',
    refill: '35 days left',
    adherence: '7 of 7',
    prescriber: 'Nurse Lee',
  },
  {
    id: 'aspirin-81mg',
    name: 'Aspirin',
    dose: '81 mg',
    schedule: 'Once daily',
    timeLabel: 'Taken at 7:30 AM',
    instructions: 'Low-dose. Take with food to protect the stomach.',
    status: 'taken',
    lastTakenAt: Date.now(),
    takenAtLabel: '7:30 AM',
    category: 'Heart health',
    refill: '8 days left',
    adherence: '7 of 7',
    prescriber: 'Dr. Park',
  },
];

/**
 * Pass an explicit `seed` in tests; production hydrates from localStorage,
 * falling back to the shared seed on first run. Every mutation persists the
 * new snapshot so added/taken medications survive a restart.
 */
export function createMedicationsRepository(
  seed: readonly Medication[] = loadJSON(STORAGE_KEY, defaultMedicationsSeed),
): MedicationsRepository {
  const meds: Medication[] = [...seed];
  const persist = () => saveJSON(STORAGE_KEY, meds);
  const snapshot = () => Object.freeze([...meds]);

  return {
    async getAll() {
      return snapshot();
    },

    async markTaken(id) {
      const i = meds.findIndex((m) => m.id === id);
      if (i < 0) {
        throw new Error(`No medication with id "${id}"`);
      }
      const now = new Date();
      const takenAtLabel = now
        .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        .toUpperCase();
      meds[i] = {
        ...meds[i],
        status: 'taken',
        lastTakenAt: now.getTime(),
        takenAtLabel,
        timeLabel: `Taken at ${takenAtLabel}`,
      };
      persist();
      return snapshot();
    },

    async add(med) {
      if (meds.some((m) => m.id === med.id)) {
        throw new Error(`Medication with id "${med.id}" already exists`);
      }
      meds.push(med);
      persist();
      return snapshot();
    },
  };
}
