import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  MessageSquare,
  HeartPulse,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import { dataOrNull } from '@/stores/async';
import { displayName, initialsOf } from '@/lib/format';
import { routes } from '@/lib/routes';
import styles from './Sidebar.module.css';

interface NavItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to: string;
  readonly kbd: string;
}

// Every route is now live and reachable by mouse, keyboard shortcut (1-5), or
// Tab focus.
const NAV: readonly NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: routes.dashboard, kbd: '1' },
  { label: 'Medications', icon: Pill, to: routes.medications, kbd: '2' },
  { label: 'Schedule', icon: CalendarDays, to: routes.appointments, kbd: '3' },
  { label: 'Messages', icon: MessageSquare, to: routes.messages, kbd: '4' },
  { label: 'Health Log', icon: HeartPulse, to: routes.healthLog, kbd: '5' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const meds = useMedicationsStore((s) => s.medications);
  const conversations = useMessagesStore((s) => s.conversations);
  const prefix = email?.split('@')[0] ?? 'guest';
  const name = email ? displayName(prefix) : 'Guest';
  const initials = email ? initialsOf(prefix) : 'G';

  // Live nav badges: medications still to take, unread message threads.
  const badges: Record<string, number> = {
    [routes.medications]: (dataOrNull(meds) ?? []).filter(
      (m) => m.status !== 'taken',
    ).length,
    [routes.messages]: (dataOrNull(conversations) ?? []).filter((c) => c.unread)
      .length,
  };

  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.profile}
        onClick={() => navigate(routes.profile)}
        aria-label="Open profile"
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials}
        </span>
        <div>
          <div className={styles.profileName}>{name}</div>
          <div className={styles.profilePlan}>SEVERE CTS CARE PLAN</div>
        </div>
      </button>

      <nav className={styles.nav} aria-label="Primary">
        <div className={styles.groupLabel}>CARE</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const badge = badges[item.to] ?? 0;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              <span className={styles.navLabel}>{item.label}</span>
              {badge > 0 && <span className={styles.badge}>{badge}</span>}
              <span className={styles.kbd}>{item.kbd}</span>
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        className={styles.emergency}
        onClick={() => navigate(routes.emergency)}
      >
        <TriangleAlert size={18} />
        <span className={styles.navLabel}>Emergency (SOS)</span>
      </button>
    </aside>
  );
}
