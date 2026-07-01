import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { useVoiceNotesStore } from '@/stores/voice-notes-store';
import { useAnnouncer } from '@/stores/announcer-store';
import styles from './RecordingRadar.module.css';

interface RecordingRadarProps {
  /** Label under the mic, e.g. "Voice log". */
  readonly label: string;
  /** Called with the final transcript when a recording completes. */
  readonly onTranscript?: (text: string) => void;
}

/**
 * Pulsing circular record button (SRS Feature A radar). Uses live speech
 * recognition; each completed session is stored as a `VoiceNote` (duration +
 * timestamp) so the action produces a visible, persisted change even though no
 * audio file is captured. Fully keyboard-operable.
 */
export function RecordingRadar({ label, onTranscript }: RecordingRadarProps) {
  const addNote = useVoiceNotesStore((s) => s.add);
  const announce = useAnnouncer();
  const startedAt = useRef<number | null>(null);
  const [status, setStatus] = useState<string>('Tap to record a voice note');

  const { listening, transcript, error, available, start, stop } =
    useSpeechRecognition((final) => {
      onTranscript?.(final);
    });

  // When a session ends, log its duration as a voice note.
  const wasListening = useRef(false);
  useEffect(() => {
    if (wasListening.current && !listening && startedAt.current != null) {
      const lengthMs = Date.now() - startedAt.current;
      startedAt.current = null;
      addNote({ id: `${Date.now()}`, savedAt: Date.now(), lengthMs });
      setStatus('Voice note saved');
      announce('Voice note saved.');
    }
    wasListening.current = listening;
  }, [listening, addNote, announce]);

  const toggle = () => {
    if (!available) {
      setStatus('Voice input is not available in this environment.');
      return;
    }
    if (listening) {
      stop();
    } else {
      startedAt.current = Date.now();
      setStatus('Recording… tap to stop');
      void start();
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.radar} ${listening ? styles.recording : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? `Stop recording ${label}` : `Start recording ${label}`}
      >
        <Mic size={32} />
      </button>
      <span className={styles.label}>{label}</span>
      <span className={styles.status} aria-live="polite">
        {error ?? (listening ? transcript || 'Recording… tap to stop' : status)}
      </span>
    </div>
  );
}
