import { useEffect } from 'react';
import { PhoneCall } from 'lucide-react';
import { Button } from './Button';
import styles from './ConnectingOverlay.module.css';

interface ConnectingOverlayProps {
  /** Who we're "connecting" to; `null` hides the overlay. */
  readonly target: string | null;
  readonly onDismiss: () => void;
  readonly autoDismissAfterMs?: number;
}

/**
 * Demo "Connecting to …" overlay shown after a confirmed emergency/caregiver
 * tap. There is no real telephony (zero-backend app); this confirms the action
 * took effect and auto-dismisses. Esc / Cancel closes it early.
 */
export function ConnectingOverlay({
  target,
  onDismiss,
  autoDismissAfterMs = 3000,
}: ConnectingOverlayProps) {
  useEffect(() => {
    if (target == null) return;
    const t = setTimeout(onDismiss, autoDismissAfterMs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [target, onDismiss, autoDismissAfterMs]);

  if (target == null) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`Connecting to ${target}`}>
      <div className={styles.panel}>
        <span className={styles.pulse} aria-hidden="true">
          <PhoneCall size={40} />
        </span>
        <p className={styles.text} aria-live="assertive">
          Connecting to {target}…
        </p>
        <Button variant="outline" onClick={onDismiss}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
