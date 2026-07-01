import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoginScreen } from '@/screens/LoginScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { MedicationsScreen } from '@/screens/MedicationsScreen';
import { AppointmentsScreen } from '@/screens/AppointmentsScreen';
import { HealthLogScreen } from '@/screens/HealthLogScreen';
import { MessagesScreen } from '@/screens/MessagesScreen';
import { EmergencyScreen } from '@/screens/EmergencyScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { useMedicationsStore } from '@/stores/medications-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useMessagesStore } from '@/stores/messages-store';
import { routes } from '@/lib/routes';

/**
 * Route tree + startup data loading, separate from the router so tests can
 * mount it inside a MemoryRouter (the production shell uses HashRouter).
 */
export function AppRoutes() {
  // Load the async stores once on startup so every screen shares a single live
  // snapshot (the dashboard reads all three for its summary widgets).
  const loadMeds = useMedicationsStore((s) => s.load);
  const loadAppts = useAppointmentsStore((s) => s.load);
  const loadMessages = useMessagesStore((s) => s.load);
  useEffect(() => {
    void loadMeds();
    void loadAppts();
    void loadMessages();
  }, [loadMeds, loadAppts, loadMessages]);

  return (
    <Routes>
      <Route path={routes.login} element={<LoginScreen />} />
      <Route element={<AppShell />}>
        <Route path={routes.dashboard} element={<DashboardScreen />} />
        <Route path={routes.medications} element={<MedicationsScreen />} />
        <Route path={routes.appointments} element={<AppointmentsScreen />} />
        <Route path={routes.healthLog} element={<HealthLogScreen />} />
        <Route path={routes.messages} element={<MessagesScreen />} />
        <Route path={routes.emergency} element={<EmergencyScreen />} />
        <Route path={routes.profile} element={<ProfileScreen />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
