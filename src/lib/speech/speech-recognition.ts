/**
 * Thin wrapper around the browser Web Speech API — the ONLY file that touches
 * `SpeechRecognition` directly. Everything above it (the hook, VoiceInputBar,
 * RecordingRadar, dictation fields) depends on this interface, so the rest of
 * the app stays decoupled from the vendor-prefixed global.
 *
 * The API is present in Electron's Chromium but absent in some environments,
 * so every function degrades to a safe "speech unavailable" no-op instead of
 * throwing. This mirrors the mobile app's `speech-recognition.ts` contract.
 */

export interface SpeechCallbacks {
  /** Interim transcript while the user is still speaking. */
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

function getCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** False when the browser has no SpeechRecognition implementation. */
export function isSpeechAvailable(): boolean {
  return getCtor() != null;
}

/**
 * Web Speech prompts for the microphone itself on `start()`, so there is no
 * separate permission call. Kept for interface parity with the mobile app.
 */
export async function requestSpeechPermissions(): Promise<boolean> {
  return isSpeechAvailable();
}

/** The single active recognition instance, so `stopListening` can reach it. */
let active: SpeechRecognition | null = null;

/**
 * Start a recognition session and subscribe to its events. Returns an
 * unsubscribe function that detaches the handlers (it does NOT stop the
 * session — pair with `stopListening`).
 */
export function startListening(
  callbacks: SpeechCallbacks,
  options: SpeechOptions = {},
): () => void {
  const Ctor = getCtor();
  if (!Ctor) {
    callbacks.onError?.('Speech recognition is not available.');
    callbacks.onEnd?.();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = options.continuous ?? false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0]?.transcript ?? '';
    if (result.isFinal) callbacks.onFinal?.(transcript.trim());
    else callbacks.onPartial?.(transcript);
  };
  recognition.onerror = (event) => {
    // `aborted`/`no-speech` fire on normal stops — treat as non-fatal end.
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      callbacks.onError?.(event.message || event.error);
    }
  };
  recognition.onend = () => {
    if (active === recognition) active = null;
    callbacks.onEnd?.();
  };

  try {
    active = recognition;
    recognition.start();
  } catch (e) {
    active = null;
    callbacks.onError?.(e instanceof Error ? e.message : String(e));
    callbacks.onEnd?.();
    return () => {};
  }

  return () => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
}

/** Stop the active recognition session (final results may still arrive). */
export function stopListening(): void {
  try {
    active?.stop();
  } catch {
    // Already stopped or unavailable — nothing to do.
  }
}
