import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAnnouncer } from '@/stores/announcer-store';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import type { VoiceCommand } from '@/lib/voice/match-command';
import styles from './TwoTapConfirm.module.css';

interface TwoTapConfirmProps {
  /** Label shown in the resting state, e.g. "Confirm taken". */
  readonly idleLabel: string;
  /** Label shown once armed, e.g. "Tap again to confirm". */
  readonly confirmLabel: string;
  readonly onConfirmed: () => void;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  /** Visual tone; danger is used by the Emergency targets. */
  readonly tone?: 'primary' | 'danger';
  /** Auto-disarm after this many ms without a second tap. */
  readonly disarmAfterMs?: number;
  /** Voice phrases that arm this action, e.g. ['confirm taken']. */
  readonly voicePhrases?: readonly string[];
}

/**
 * Two-tap confirmation control (SRS C3): the first activation arms it, the
 * second within `disarmAfterMs` fires `onConfirmed`. Replaces long-press /
 * slide-to-confirm, which are barred for CTS users. A real `<button>`, so it
 * is fully keyboard-operable; arm/disarm is announced politely.
 */
export function TwoTapConfirm({
  idleLabel,
  confirmLabel,
  onConfirmed,
  icon,
  disabled = false,
  fullWidth = false,
  tone = 'primary',
  disarmAfterMs = 4000,
  voicePhrases,
}: TwoTapConfirmProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useAnnouncer();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const disarm = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArmed(false);
  };

  // Voice recognition adds utterance + decode latency, so voice arming gets a
  // longer window than the 4s click default.
  const VOICE_DISARM_MS = 10_000;

  const arm = (windowMs: number) => {
    setArmed(true);
    announce(`${confirmLabel}.`);
    timer.current = setTimeout(disarm, windowMs);
  };

  const confirm = () => {
    disarm();
    onConfirmed();
  };

  const onClick = () => {
    if (disabled) return;
    if (armed) confirm();
    else arm(disarmAfterMs);
  };

  // While armed, "confirm"/"yes"/"cancel" outrank screen commands (dialog
  // priority) until the window lapses.
  const voiceCommands: VoiceCommand[] = armed
    ? [
        {
          phrases: ['confirm', 'yes'],
          hint: 'confirm',
          run: () => {
            confirm();
            return `${idleLabel} confirmed.`;
          },
        },
        {
          phrases: ['cancel'],
          run: () => {
            disarm();
            return 'Cancelled.';
          },
        },
      ]
    : (voicePhrases ?? []).map((phrase) => ({
        phrases: [phrase],
        hint: phrase,
        run: () => {
          if (disabled) return 'Not available.';
          arm(VOICE_DISARM_MS);
          return `Say confirm to ${idleLabel.toLowerCase()}.`;
        },
      }));

  useVoiceCommands('dialog', voiceCommands);

  return (
    <button
      type="button"
      className={[
        styles.btn,
        styles[tone],
        armed ? styles.armed : '',
        fullWidth ? styles.fullWidth : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      onBlur={disarm}
      disabled={disabled}
      aria-live="polite"
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {armed ? confirmLabel : idleLabel}
    </button>
  );
}
