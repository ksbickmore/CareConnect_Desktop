import { useEffect, useRef, useState } from 'react';
import { Phone, Siren } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { ConnectingOverlay } from '@/components/ConnectingOverlay';
import { useContactsStore } from '@/stores/contacts-store';
import { useAnnouncer } from '@/stores/announcer-store';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { normalize } from '@/lib/voice/spoken-words';
import styles from './EmergencyScreen.module.css';

type TargetId = '911' | 'caregiver';
const COUNTDOWN_SECONDS = 5;

/**
 * Emergency Crisis Hub (SRS Feature E). Two oversized stacked targets — 911
 * and the primary caregiver — each activated by a two-tap sequence (no
 * long-press). A confirmed tap starts a keyboard-focused countdown cancel bar
 * that catches accidental activations before "connecting". Reachable from the
 * sidebar SOS button and the global Ctrl+Shift+E shortcut.
 */
export function EmergencyScreen() {
  const contacts = useContactsStore((s) => s.contacts);
  const caregiver = contacts[0] ?? null;
  const announce = useAnnouncer();

  const [armed, setArmed] = useState<TargetId | null>(null);
  const [countdown, setCountdown] = useState<{ target: TargetId; left: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const targetName = (t: TargetId) => (t === '911' ? '911' : caregiver?.name ?? 'caregiver');

  // Drive the countdown; the final tick escalates to the connecting overlay
  // from inside the timer callback (event time, not the effect body).
  useEffect(() => {
    if (!countdown) return;
    const t = setTimeout(() => {
      if (countdown.left <= 1) {
        const name = targetName(countdown.target);
        setConnecting(name);
        setCountdown(null);
        announce(`Emergency alert sent. Connecting to ${name}.`, { assertive: true });
      } else {
        setCountdown((c) => (c ? { ...c, left: c.left - 1 } : null));
      }
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Move focus to the Cancel button when the countdown starts.
  useEffect(() => {
    if (countdown) cancelRef.current?.focus();
  }, [countdown]);

  const activate = (target: TargetId) => {
    if (target === 'caregiver' && !caregiver) return;
    if (countdown) return;
    if (armed === target) {
      setArmed(null);
      setCountdown({ target, left: COUNTDOWN_SECONDS });
      announce(`Calling ${targetName(target)} in ${COUNTDOWN_SECONDS} seconds.`, {
        assertive: true,
      });
    } else {
      setArmed(target);
      announce(`Tap again to call ${targetName(target)}.`);
    }
  };

  const cancel = () => {
    setCountdown(null);
    setArmed(null);
    announce('Emergency call cancelled.', { assertive: true });
  };

  const engaged = armed != null || countdown != null || connecting != null;

  useVoiceCommands('screen', [
    {
      phrases: ['call 911', 'call emergency', 'call emergency services'],
      hint: 'call 911',
      run: () => {
        activate('911');
      },
    },
    ...(caregiver
      ? [
          {
            phrases: ['call caregiver', `call ${normalize(caregiver.name)}`],
            hint: 'call caregiver',
            run: () => {
              activate('caregiver');
            },
          },
        ]
      : []),
  ]);

  // While armed/counting down/connecting, confirm and cancel outrank
  // everything else (dialog priority) — life-safety controls.
  useVoiceCommands(
    'dialog',
    engaged
      ? [
          ...(armed
            ? [
                {
                  phrases: ['confirm', 'yes'],
                  hint: 'confirm',
                  run: () => {
                    activate(armed);
                  },
                },
              ]
            : []),
          {
            phrases: ['cancel', 'stop'],
            hint: 'cancel',
            run: () => {
              setConnecting(null);
              cancel();
            },
          },
        ]
      : [],
  );

  return (
    <>
      <Toolbar title="Emergency (SOS)" />
      <div className={styles.screen}>
        <p className={styles.intro}>
          Tap a target once, then tap again to start a {COUNTDOWN_SECONDS}-second
          countdown. Cancel any time.
        </p>

        <div className={styles.targets}>
          <button
            type="button"
            className={`${styles.target} ${styles.emergency} ${armed === '911' ? styles.armed : ''}`}
            onClick={() => activate('911')}
            aria-label="Call emergency services — 911"
          >
            <Siren size={72} aria-hidden="true" />
            <span className={styles.targetTitle}>Call 911</span>
            <span className={styles.targetSub}>
              {armed === '911' ? 'Tap again to call 911' : 'Emergency dispatch'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.target} ${styles.caregiver} ${armed === 'caregiver' ? styles.armed : ''}`}
            onClick={() => activate('caregiver')}
            disabled={!caregiver}
            aria-label={
              caregiver ? `Call ${caregiver.name}, primary caregiver` : 'No caregiver set'
            }
          >
            <Phone size={72} aria-hidden="true" />
            <span className={styles.targetTitle}>
              {caregiver ? `Call ${caregiver.name}` : 'No caregiver set'}
            </span>
            <span className={styles.targetSub}>
              {caregiver
                ? armed === 'caregiver'
                  ? `Tap again to call ${caregiver.name}`
                  : caregiver.relationship
                : 'Add a contact to enable speed dial'}
            </span>
          </button>
        </div>

        {countdown && (
          <div className={styles.countdown} role="alertdialog" aria-label="Emergency countdown">
            <span className={styles.countText}>
              Calling {targetName(countdown.target)} in {countdown.left}…
            </span>
            <button ref={cancelRef} type="button" className={styles.cancel} onClick={cancel}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <ConnectingOverlay target={connecting} onDismiss={() => setConnecting(null)} />
    </>
  );
}
