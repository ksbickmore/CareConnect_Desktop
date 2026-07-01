import { create } from 'zustand';

import {
  createMedicationsRepository,
  type MedicationsRepository,
} from '@/data/medications-repository';
import type { Medication } from '@/models/types';
import { guard, loading, type Async } from './async';

/**
 * Medications store, ported from the mobile app. Every mutating method
 * flips state to loading, then runs the repository call inside `guard` so a
 * thrown error becomes an error state instead of an unhandled rejection.
 */
interface MedicationsStore {
  readonly medications: Async<readonly Medication[]>;

  /** Initial load from the repository; called once on app start. */
  load(): Promise<void>;
  /** Mark medication `id` as taken; repository stamps `lastTakenAt`. */
  markTaken(id: string): Promise<void>;
  /** Append a freshly-built medication. Errors on duplicate id. */
  add(med: Medication): Promise<void>;
  /** Look up a single medication from the current snapshot, or `null`. */
  byId(id: string): Medication | null;
  /** Replace the backing repository and reset state. */
  reset(repo?: MedicationsRepository): void;
}

let repository = createMedicationsRepository();

export const useMedicationsStore = create<MedicationsStore>()((set, get) => ({
  medications: loading(),

  async load() {
    set({ medications: loading() });
    set({ medications: await guard(() => repository.getAll()) });
  },

  async markTaken(id) {
    set({ medications: await guard(() => repository.markTaken(id)) });
  },

  async add(med) {
    const result = await guard(() => repository.add(med));
    // Keep the current snapshot on failure and rethrow so the add-form can
    // surface the message inline (the dialog catches this) instead of the
    // whole ledger collapsing into an error state.
    if (result.status === 'error') throw new Error(result.error);
    set({ medications: result });
  },

  byId(id) {
    const state = get().medications;
    if (state.status !== 'success') return null;
    return state.data.find((m) => m.id === id) ?? null;
  },

  reset(repo) {
    repository = repo ?? createMedicationsRepository();
    set({ medications: loading() });
  },
}));
