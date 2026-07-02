import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Open a screen's "add" dialog when navigation arrives with
 * `state.openAdd` (set by AppShell for the File > New Record /
 * New Appointment accelerators). The state is cleared immediately so
 * back-navigation or a re-render doesn't reopen the dialog.
 */
export function useOpenAddOnNavigate(onOpenAdd: () => void): void {
  const location = useLocation();
  const navigate = useNavigate();
  const openAdd = (location.state as { openAdd?: boolean } | null)?.openAdd;

  useEffect(() => {
    if (!openAdd) return;
    onOpenAdd();
    navigate(location.pathname, { replace: true, state: null });
  }, [openAdd, onOpenAdd, navigate, location.pathname]);
}
