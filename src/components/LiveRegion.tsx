import { useAnnouncerStore } from '@/stores/announcer-store';

/**
 * The app's two visually-hidden aria-live regions. Mounted once in AppShell so
 * every screen's `announce(...)` calls are read out. `aria-atomic` re-reads the
 * full message on each update (SRS 6.).
 */
export function LiveRegion() {
  const polite = useAnnouncerStore((s) => s.polite);
  const assertive = useAnnouncerStore((s) => s.assertive);

  return (
    <>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="visually-hidden" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}
