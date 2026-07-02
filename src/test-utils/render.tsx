/**
 * Render helpers for integration tests: mounts the real route tree inside a
 * MemoryRouter so tests can start on any screen without touching
 * window.location (which HashRouter would mutate and leak between tests).
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from '@/App';
import { useAuthStore } from '@/stores/auth-store';

/** Sign the demo user in directly (AppShell redirects to login otherwise). */
export function signIn(email = 'demo@careconnect.app'): void {
  useAuthStore.setState({ signedIn: true, email });
}

/** Render the full app route tree starting at `initialPath`. */
export function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}
