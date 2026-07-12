import { useEffect, useState } from 'react';
import { useAnnouncerStore } from '@/stores/announcer-store';

/**
 * The app's two visually-hidden aria-live regions. Mounted once in AppShell so
 * every screen's `announce(...)` calls are read out. `aria-atomic` re-reads the
 * full message on each update (SRS 6.).
 *
 * Each region clears immediately and shows the message on a short delay. The
 * delay puts the live-region mutation in its own commit, after whatever DOM
 * churn accompanied the announcement (e.g. a form collapsing on save) — NVDA
 * drops polite updates that land mid-churn. The clear-then-set cycle also
 * makes repeated identical messages re-fire, and a newer announcement cancels
 * an in-flight one via the timeout cleanup.
 */
const ANNOUNCE_DELAY_MS = 120;

function Region({
  role,
  live,
  text,
  nonce,
}: {
  role: 'status' | 'alert';
  live: 'polite' | 'assertive';
  text: string;
  nonce: number;
}) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    // Clear on the next tick, then show after the settle delay. Both writes
    // happen from timer callbacks so each lands in its own commit.
    const timers = [setTimeout(() => setDisplayed(''), 0)];
    if (text !== '') {
      timers.push(setTimeout(() => setDisplayed(text), ANNOUNCE_DELAY_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [text, nonce]);

  return (
    <div className="visually-hidden" role={role} aria-live={live} aria-atomic="true">
      {displayed}
    </div>
  );
}

export function LiveRegion() {
  const polite = useAnnouncerStore((s) => s.polite);
  const politeNonce = useAnnouncerStore((s) => s.politeNonce);
  const assertive = useAnnouncerStore((s) => s.assertive);
  const assertiveNonce = useAnnouncerStore((s) => s.assertiveNonce);

  return (
    <>
      <Region role="status" live="polite" text={polite} nonce={politeNonce} />
      <Region role="alert" live="assertive" text={assertive} nonce={assertiveNonce} />
    </>
  );
}
