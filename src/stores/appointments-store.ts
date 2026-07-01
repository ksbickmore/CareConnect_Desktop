import { create } from 'zustand';

import {
  createAppointmentsRepository,
  type AppointmentsRepository,
} from '@/data/appointments-repository';
import type { Appointment } from '@/models/types';
import { guard, loading, type Async } from './async';

/**
 * Appointments store, ported from the mobile app. Mirrors the medications
 * store: every mutation flips to loading, then runs the repository call inside
 * `guard` so a thrown error becomes an error state.
 */
interface AppointmentsStore {
  readonly appointments: Async<readonly Appointment[]>;

  load(): Promise<void>;
  /** Append a freshly-built appointment. Errors on duplicate id. */
  add(appt: Appointment): Promise<void>;
  /** Flip appointment `id` to `reminderSet`. */
  setReminder(id: string): Promise<void>;
  /** `null` while loading / in error / unknown id. */
  byId(id: string): Appointment | null;
  /** Replace the backing repository and reset state. Used by tests. */
  reset(repo?: AppointmentsRepository): void;
}

let repository = createAppointmentsRepository();

export const useAppointmentsStore = create<AppointmentsStore>()((set, get) => ({
  appointments: loading(),

  async load() {
    set({ appointments: loading() });
    set({ appointments: await guard(() => repository.getAll()) });
  },

  async add(appt) {
    const result = await guard(() => repository.add(appt));
    // Keep the current snapshot on failure and rethrow so the add-form can
    // surface the message inline (the dialog catches this) instead of the
    // whole schedule collapsing into an error state.
    if (result.status === 'error') throw new Error(result.error);
    set({ appointments: result });
  },

  async setReminder(id) {
    set({ appointments: await guard(() => repository.setReminder(id)) });
  },

  byId(id) {
    const state = get().appointments;
    if (state.status !== 'success') return null;
    return state.data.find((a) => a.id === id) ?? null;
  },

  reset(repo) {
    repository = repo ?? createAppointmentsRepository();
    set({ appointments: loading() });
  },
}));
