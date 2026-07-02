/**
 * Speech-to-text entry point for the app — the ONLY module consumers touch.
 * Everything above it (the hook, VoiceInputBar, RecordingRadar, dictation
 * fields) depends on this interface, so the engine can change without
 * touching any screen.
 *
 * The engine is a fully local Whisper model (transformers.js in a Web
 * Worker, see `whisper/`). The previous implementation used the browser Web
 * Speech API, which is non-functional in Electron: Chromium's recognizer
 * streams audio to Google's cloud speech service with API keys only Chrome
 * ships with, so every session died with a network error
 * (electron/electron#22436). Whisper runs entirely offline instead.
 */

import { startMicCapture } from './whisper/mic-capture';
import { createWorkerTranscriber } from './whisper/worker-transcriber';
import {
  createWhisperEngine,
  type WhisperEngine,
} from './whisper/whisper-engine';

export interface SpeechCallbacks {
  /** Interim transcript while the utterance is being decoded. */
  onPartial?: (transcript: string) => void;
  /** Final transcript for the utterance. */
  onFinal?: (transcript: string) => void;
  onError?: (message: string) => void;
  /** Recognition session ended (after final result, error, or stop). */
  onEnd?: () => void;
}

export interface SpeechOptions {
  /** Keep listening across utterances (dashboard command bar). */
  continuous?: boolean;
}

/** False when the environment lacks mic capture or worker/wasm support. */
export function isSpeechAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined'
  );
}

/**
 * The mic itself prompts on session start, so there is no separate
 * permission call. Kept for interface parity with the mobile app.
 */
export async function requestSpeechPermissions(): Promise<boolean> {
  return isSpeechAvailable();
}

/** Lazy singleton: the engine (and its worker) exist only once voice is used. */
let engine: WhisperEngine | null = null;

function getEngine(): WhisperEngine {
  engine ??= createWhisperEngine({
    startMicCapture,
    transcriber: createWorkerTranscriber(),
  });
  return engine;
}

/**
 * Start a recognition session and subscribe to its events. Returns an
 * unsubscribe function that detaches the handlers (it does NOT stop the
 * session — pair with `stopListening`).
 */
export function startListening(
  callbacks: SpeechCallbacks,
  options: SpeechOptions = {},
): () => void {
  if (!isSpeechAvailable()) {
    callbacks.onError?.('Speech recognition is not available.');
    callbacks.onEnd?.();
    return () => {};
  }
  return getEngine().startListening(callbacks, options);
}

/** Stop the active recognition session (a final result may still arrive). */
export function stopListening(): void {
  engine?.stopListening();
}
