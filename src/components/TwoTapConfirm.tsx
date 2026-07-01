import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAnnouncer } from '@/stores/announcer-store';
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

  const onClick = () => {
    if (disabled) return;
    if (armed) {
      disarm();
      onConfirmed();
      return;
    }
    setArmed(true);
    announce(`${confirmLabel}.`);
    timer.current = setTimeout(disarm, disarmAfterMs);
  };

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
