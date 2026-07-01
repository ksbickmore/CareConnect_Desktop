import { forwardRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { parseVoiceCommand } from '@/lib/voice-commands';
import { useAnnouncer } from '@/stores/announcer-store';
import styles from './VoiceInputBar.module.css';

/**
 * Persistent voice command bar for the Dashboard (SRS Feature C "permanent
 * voice listener bar"). Recognized keywords navigate to a screen; unmatched
 * speech surfaces a hint. `Ctrl+Space` toggles it (handled in AppShell, which
 * focuses this button via the forwarded ref).
 */
export const VoiceInputBar = forwardRef<HTMLButtonElement>(function VoiceInputBar(
  _props,
  ref,
) {
  const navigate = useNavigate();
  const announce = useAnnouncer();
  const [hint, setHint] = useState<string | null>(null);

  const { listening, transcript, error, available, start, stop } =
    useSpeechRecognition((final) => {
      const command = parseVoiceCommand(final);
      if (command) {
        setHint(`Opening ${command.label}…`);
        announce(`Opening ${command.label}.`);
        navigate(command.route);
      } else {
        setHint(`Heard: "${final}" — try saying a screen name.`);
        announce('Command not recognized. Try saying a screen name.', {
          assertive: true,
        });
      }
    });

  const toggle = () => {
    if (!available) {
      setHint('Voice input is not available in this environment.');
      return;
    }
    if (listening) stop();
    else void start();
  };

  const status = listening
    ? transcript || 'Listening… say "medications", "schedule", "messages"…'
    : error ?? hint ?? 'Tap to speak a command, or press Ctrl+Space.';

  return (
    <div className={styles.bar}>
      <button
        ref={ref}
        id="voice-command-mic"
        type="button"
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? 'Stop voice command' : 'Start voice command'}
      >
        {available ? <Mic size={20} /> : <MicOff size={20} />}
      </button>
      <span className={styles.label}>{status}</span>
      <kbd className={styles.kbd}>Ctrl Space</kbd>
    </div>
  );
});
