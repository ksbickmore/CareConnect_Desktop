import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Applies the persisted preferences to the document. Mounted once in AppShell
 * so they take effect on every authenticated screen (and on startup, since
 * the store hydrates from localStorage synchronously).
 */
export function useApplySettings(): void {
  const textZoom = useSettingsStore((s) => s.textZoom);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  useEffect(() => {
    // Chromium-only app: body zoom scales text AND layout together, which the
    // px-based design tokens require.
    document.body.style.zoom = String(textZoom);
    return () => {
      document.body.style.zoom = '';
    };
  }, [textZoom]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    return () => {
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [reducedMotion]);
}
