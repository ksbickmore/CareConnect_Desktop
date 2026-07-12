import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Select an item when navigation arrives with `state.selectId` (set by the
 * global search overlay). The state is cleared immediately so back-navigation
 * or a re-render doesn't re-select. Sibling of `useOpenAddOnNavigate`.
 */
export function useSelectOnNavigate(onSelect: (id: string) => void): void {
  const location = useLocation();
  const navigate = useNavigate();
  const selectId = (location.state as { selectId?: string } | null)?.selectId;

  useEffect(() => {
    if (selectId == null) return;
    onSelect(selectId);
    void navigate(location.pathname, { replace: true, state: null });
  }, [selectId, onSelect, navigate, location.pathname]);
}
