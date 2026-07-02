import { forwardRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { parseVoiceCommand } from '@/lib/voice-commands';
import {
  dispatchVoiceCommand,
  registeredHints,
} from '@/lib/voice/voice-registry';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import {
  clickButtonByName,
  dictateIntoFocusedField,
  openDialog,
} from '@/lib/voice/dom-actions';
import { useAnnouncer } from '@/stores/announcer-store';
import styles from './VoiceInputBar.module.css';

/**
 * Persistent voice command bar (SRS Feature C), mounted in AppShell so it is
 * available on every authenticated screen. Owns the app's single continuous
 * speech session and dispatches each utterance through the voice command
 * registry: dialog commands, then screen commands, then global commands,
 * then navigation keywords, then a visible-button-name fallback.
 * `Ctrl+Space` toggles it from anywhere (AppShell clicks this button by id).
 */
export const VoiceInputBar = forwardRef<HTMLButtonElement>(function VoiceInputBar(
  _props,
  ref,
) {
  const location = useLocation();
  const navigate = useNavigate();
  const announce = useAnnouncer();
  const [hint, setHint] = useState<string | null>(null);

  const say = (message: string) => {
    setHint(message);
    announce(message);
  };

  const handleFinal = (final: string) => {
    // 1. Registered commands: dialog > screen > global.
    const result = dispatchVoiceCommand(final);
    if (result.handled) {
      if (result.feedback) say(result.feedback);
      else setHint(`Heard: "${final}"`);
      return;
    }

    if (openDialog()) {
      // 2a. Dictation into the focused text field of the open dialog.
      const label = dictateIntoFocusedField(final);
      if (label) {
        say(`Added to ${label}.`);
        return;
      }
      // 2b. Buttons inside the dialog by name.
      const pressed = clickButtonByName(final);
      if (pressed) {
        say(`${pressed}.`);
        return;
      }
    } else {
      // 3. Navigation keywords (lenient substring matching).
      const command = parseVoiceCommand(final);
      const sameRoute = command != null && command.route === location.pathname;
      if (command && !sameRoute) {
        say(`Opening ${command.label}.`);
        navigate(command.route);
        return;
      }
      // 4. Visible buttons in the main content by name.
      const pressed = clickButtonByName(final);
      if (pressed) {
        say(`${pressed}.`);
        return;
      }
      if (sameRoute && command) {
        say(`Already on ${command.label}.`);
        return;
      }
    }

    setHint(`Heard: "${final}" — say "what can I say" for options.`);
    announce('Command not recognized. Say "what can I say" for options.', {
      assertive: true,
    });
  };

  const { listening, transcript, error, available, start, stop } =
    useSpeechRecognition(handleFinal, { continuous: true });

  useVoiceCommands('global', [
    {
      phrases: ['stop listening', 'stop voice'],
      hint: 'stop listening',
      run: () => {
        stop();
        return 'Voice commands off.';
      },
    },
    {
      phrases: ['what can i say', 'help'],
      hint: 'what can I say',
      run: () => `You can say: ${registeredHints().join(', ')}.`,
    },
  ]);

  const toggle = () => {
    if (!available) {
      setHint('Voice input is not available in this environment.');
      return;
    }
    if (listening) stop();
    else void start();
  };

  const status = listening
    ? transcript || 'Listening… speak a command, or say "what can I say".'
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
