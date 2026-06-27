import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoginScreen } from '@/screens/LoginScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { MedicationsScreen } from '@/screens/MedicationsScreen';
import { useMedicationsStore } from '@/stores/medications-store';
import { routes } from '@/lib/routes';

export function App() {
  // Load medications once on startup so both the dashboard banner and the
  // medications screen share a single live snapshot.
  const load = useMedicationsStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <HashRouter>
      <Routes>
        <Route path={routes.login} element={<LoginScreen />} />
        <Route element={<AppShell />}>
          <Route path={routes.dashboard} element={<DashboardScreen />} />
          <Route path={routes.medications} element={<MedicationsScreen />} />
        </Route>
        <Route path="*" element={<Navigate to={routes.login} replace />} />
      </Routes>
    </HashRouter>
  );
}
