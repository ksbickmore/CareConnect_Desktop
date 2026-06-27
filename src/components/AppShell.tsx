import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { MenuBar } from './MenuBar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/auth-store';
import { routes } from '@/lib/routes';
import styles from './AppShell.module.css';

/**
 * Authenticated frame: dark menu bar across the top, sidebar on the left,
 * and the active screen rendered into the content area via <Outlet />.
 *
 * Registers global number-key shortcuts (1 → Dashboard, 2 → Medications) so
 * primary navigation is reachable by keyboard alone. Shortcuts are ignored
 * while the user is typing in a field.
 */
export function AppShell() {
  const navigate = useNavigate();
  const signedIn = useAuthStore((s) => s.signedIn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '1') navigate(routes.dashboard);
      else if (e.key === '2') navigate(routes.medications);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (!signedIn) return <Navigate to={routes.login} replace />;

  return (
    <div className={styles.app}>
      <MenuBar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
