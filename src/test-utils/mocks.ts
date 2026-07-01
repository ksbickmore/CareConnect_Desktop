/**
 * Opt-in mocks for the two browser/Electron surfaces jsdom cannot provide:
 * the `window.careconnect` preload bridge and the Web Speech API. Installed
 * per-test so the "not available" production paths stay tested by default.
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

/**
 * Scriptable SpeechRecognition double. Tests drive it via `emitResult` /
 * `emitError` / `emitEnd`; the wrapper under test attaches its handlers to
 * the most recent instance (`FakeSpeechRecognition.latest()`).
 */
export class FakeSpeechRecognition extends EventTarget implements SpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  static latest(): FakeSpeechRecognition {
    const last = FakeSpeechRecognition.instances.at(-1);
    if (!last) throw new Error('No FakeSpeechRecognition instantiated yet');
    return last;
  }

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onstart: ((event: Event) => void) | null = null;

  started = false;
  stopped = false;

  constructor() {
    super();
    FakeSpeechRecognition.instances.push(this);
  }

  start(): void {
    this.started = true;
    this.onstart?.(new Event('start'));
  }

  stop(): void {
    this.stopped = true;
    this.onend?.(new Event('end'));
  }

  abort(): void {
    this.onend?.(new Event('end'));
  }

  emitResult(transcript: string, isFinal: boolean): void {
    const alternative = { transcript, confidence: 1 };
    const result = {
      isFinal,
      length: 1,
      item: () => alternative,
      0: alternative,
    };
    const results = { length: 1, item: () => result, 0: result };
    this.onresult?.({
      resultIndex: 0,
      results,
    } as unknown as SpeechRecognitionEvent);
  }

  emitError(error: string, message = ''): void {
    this.onerror?.({ error, message } as unknown as SpeechRecognitionErrorEvent);
  }

  emitEnd(): void {
    this.onend?.(new Event('end'));
  }
}

/** Expose FakeSpeechRecognition as `window.SpeechRecognition`. */
export function installSpeech(): void {
  FakeSpeechRecognition.instances = [];
  window.SpeechRecognition =
    FakeSpeechRecognition as unknown as SpeechRecognitionConstructor;
}

/** Remove the speech constructors (back to the jsdom default). */
export function removeSpeech(): void {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
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
