/**
 * Opt-in mocks for the browser/Electron surfaces jsdom cannot provide, e.g.
 * the `window.careconnect` preload bridge. Installed per-test so the "not
 * available" production paths stay tested by default. Voice-flow component
 * tests fake the speech module instead — see `./fake-speech`.
 */
import type { AppointmentsRepository } from '@/data/appointments-repository';
import type { MedicationsRepository } from '@/data/medications-repository';

export interface CareconnectMock {
  readonly popupMenu: jest.Mock;
  readonly unsubscribe: jest.Mock;
  /** Simulate the Electron main process sending a menu/accelerator action. */
  fireMenuAction(action: MenuAction): void;
  /** Remove the bridge from `window` again. */
  cleanup(): void;
}

/** Install a fake `window.careconnect` bridge and return its spies. */
export function installCareconnectMock(): CareconnectMock {
  let captured: ((action: MenuAction) => void) | null = null;
  const popupMenu = jest.fn();
  const unsubscribe = jest.fn();
  window.careconnect = {
    platform: 'win32',
    version: 'test',
    popupMenu,
    onMenuAction: (callback) => {
      captured = callback;
      return unsubscribe;
    },
  };
  return {
    popupMenu,
    unsubscribe,
    fireMenuAction(action) {
      captured?.(action);
    },
    cleanup() {
      delete window.careconnect;
    },
  };
}

/** Medications repository whose every method rejects — for error-state tests. */
export function failingMedicationsRepo(message = 'repository unavailable'): MedicationsRepository {
  const fail = async (): Promise<never> => {
    throw new Error(message);
  };
  return { getAll: fail, markTaken: fail, add: fail };
}

/** Appointments repository whose every method rejects. */
export function failingAppointmentsRepo(message = 'repository unavailable'): AppointmentsRepository {
  const fail = async (): Promise<never> => {
    throw new Error(message);
  };
  return { getAll: fail, add: fail, setReminder: fail };
}
