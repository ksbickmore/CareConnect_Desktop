/**
 * Scriptable stand-in for the `@/lib/speech/speech-recognition` module, for
 * component tests that drive voice flows. Usage:
 *
 *   jest.mock('@/lib/speech/speech-recognition', () =>
 *     require('@/test-utils/fake-speech').fakeSpeechModule);
 *
 * then drive the active session via `fakeSpeech.emitFinal(...)` etc. and call
 * `fakeSpeech.reset()` in afterEach. The wrapper's own behavior is covered by
 * `src/lib/speech/speech-recognition.test.ts`.
 */

import type {
  SpeechCallbacks,
  SpeechOptions,
} from '@/lib/speech/speech-recognition';

let callbacks: SpeechCallbacks | null = null;
let available = true;

/** Drop-in replacement for the real module's exports. */
export const fakeSpeechModule = {
  isSpeechAvailable: (): boolean => available,
  startListening: (cb: SpeechCallbacks, _options?: SpeechOptions): (() => void) => {
    callbacks = cb;
    return () => {
      if (callbacks === cb) callbacks = null;
    };
  },
  stopListening: (): void => {
    const cb = callbacks;
    callbacks = null;
    cb?.onEnd?.();
  },
};

/** Test-side controls for the fake session. */
export const fakeSpeech = {
  setAvailable(value: boolean): void {
    available = value;
  },
  listening(): boolean {
    return callbacks != null;
  },
  emitPartial(text: string): void {
    callbacks?.onPartial?.(text);
  },
  emitFinal(text: string): void {
    callbacks?.onFinal?.(text);
  },
  emitError(message: string): void {
    callbacks?.onError?.(message);
  },
  emitEnd(): void {
    const cb = callbacks;
    callbacks = null;
    cb?.onEnd?.();
  },
  reset(): void {
    callbacks = null;
    available = true;
  },
};
