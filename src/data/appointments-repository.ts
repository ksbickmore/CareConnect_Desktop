import type { Appointment } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'appointments';

/**
 * Read/write access to the user's scheduled appointments, ported from the
 * mobile app. Async signature for symmetry with the medications repository.
 */
export interface AppointmentsRepository {
  getAll(): Promise<readonly Appointment[]>;
  /** Appends a new appointment. Rejects if its id collides. */
  add(appt: Appointment): Promise<readonly Appointment[]>;
  /** Flips status `scheduled -> reminderSet`. Rejects if `id` doesn't exist. */
  setReminder(id: string): Promise<readonly Appointment[]>;
}

/** Today + `addDays` at `hour:minute`, seconds zeroed. */
function at(addDays: number, hour: number, minute: number): number {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + addDays,
    hour,
    minute,
  ).getTime();
}

/**
 * Dates are computed relative to load time so the demo list always reads as
 * upcoming. Exercises the scheduled / reminderSet status badges and fills the
 * week-calendar grid on the Schedule screen.
 */
export function buildAppointmentsSeed(): readonly Appointment[] {
  return [
    {
      id: 'physical-therapy',
      title: 'Physical Therapy',
      clinician: 'A. Rivera, PT',
      when: at(0, 14, 0),
      location: 'UMGC Medical',
      status: 'scheduled',
    },
    {
      id: 'nurse-check-in',
      title: 'Nurse check-in',
      clinician: 'Nurse Lee',
      when: at(2, 10, 30),
      location: 'Telehealth',
      status: 'scheduled',
    },
    {
      id: 'dr-park-follow-up',
      title: 'Dr. Park follow-up',
      clinician: 'Dr. Park',
      when: at(4, 14, 30),
      location: 'Riverside Clinic',
      status: 'reminderSet',
    },
  ];
}

export function createAppointmentsRepository(
  seed?: readonly Appointment[],
): AppointmentsRepository {
  const appts: Appointment[] = [
    ...(seed ?? loadJSON(STORAGE_KEY, buildAppointmentsSeed())),
  ];
  const persist = () => saveJSON(STORAGE_KEY, appts);
  const snapshot = () => Object.freeze([...appts]);

  return {
    async getAll() {
      return snapshot();
    },

    async add(appt) {
      // Reject duplicates by id so the Add Appointment form can surface an
      // inline error on the title field rather than silently overwriting.
      if (appts.some((a) => a.id === appt.id)) {
        throw new Error(`Appointment with id "${appt.id}" already exists`);
      }
      appts.push(appt);
      persist();
      return snapshot();
    },

    async setReminder(id) {
      const i = appts.findIndex((a) => a.id === id);
      if (i < 0) {
        throw new Error(`No appointment with id "${id}"`);
      }
      appts[i] = { ...appts[i], status: 'reminderSet' };
      persist();
      return snapshot();
    },
  };
}
