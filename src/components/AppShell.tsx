import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MenuBar } from './MenuBar';
import { Sidebar } from './Sidebar';
import { VoiceInputBar } from './VoiceInputBar';
import { LiveRegion } from './LiveRegion';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useAuthStore } from '@/stores/auth-store';
import { routes } from '@/lib/routes';
import styles from './AppShell.module.css';

// Number-key → route map for the primary nav (SRS/keyboard reference).
const NUMBER_ROUTES: Record<string, string> = {
  '1': routes.dashboard,
  '2': routes.medications,
  '3': routes.appointments,
  '4': routes.messages,
  '5': routes.healthLog,
};

/**
 * Authenticated frame: dark menu bar across the top, sidebar on the left, and
 * the active screen rendered into the content area via <Outlet />.
 *
 * Owns the app's global keyboard shortcuts and screen-reader plumbing:
 *   1-5              → primary navigation
 *   F1 / ?           → keyboard shortcut reference
 *   Ctrl+Space       → toggle the persistent voice command bar
 *   Ctrl+Shift+E     → Emergency (SOS)
 * Shortcuts are ignored while the user is typing. Also mounts the aria-live
 * regions and moves focus to each new page's <h1> on route change.
 */
export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = useAuthStore((s) => s.signedIn);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    };

    const onKey = (e: KeyboardEvent) => {
      // Emergency: works even while typing (life-safety), per SRS Feature E.
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        navigate(routes.emergency);
        return;
      }
      // Toggle the persistent voice command bar; works while typing and with
      // a modal open since the bar is always mounted in the shell.
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        document.getElementById('voice-command-mic')?.click();
        return;
      }

      if (isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'F1' || e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (NUMBER_ROUTES[e.key]) {
        navigate(NUMBER_ROUTES[e.key]);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Listen for native menu actions forwarded from the main process.
  useEffect(() => {
    const off = window.careconnect?.onMenuAction?.((action) => {
      if (action === 'shortcuts') setShortcutsOpen(true);
      else if (action === 'emergency') navigate(routes.emergency);
      else if (action === 'new-record')
        navigate(routes.medications, { state: { openAdd: true } });
      else if (action === 'new-appointment')
        navigate(routes.appointments, { state: { openAdd: true } });
    });
    return off;
  }, [navigate]);

  // Move focus to the new page's <h1> on route change so screen-reader users
  // are oriented when the view changes (SRS focus management).
  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus();
    }
  }, [location.pathname]);

  if (!signedIn) return <Navigate to={routes.login} replace />;

  return (
    <div className={styles.app}>
      <MenuBar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.content}>
          <Outlet />
          <div className={styles.voiceBar}>
            <VoiceInputBar />
          </div>
        </main>
      </div>
      <LiveRegion />
      {shortcutsOpen && (
        <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
