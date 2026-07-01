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
import { displayName, initialsOf } from '@/lib/format';
import { routes } from '@/lib/routes';
import styles from './Sidebar.module.css';

interface NavItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to: string;
  readonly kbd: string;
  readonly badge?: number;
}

// Every route is now live and reachable by mouse, keyboard shortcut (1-5), or
// Tab focus.
const NAV: readonly NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: routes.dashboard, kbd: '1' },
  { label: 'Medications', icon: Pill, to: routes.medications, kbd: '2', badge: 2 },
  { label: 'Schedule', icon: CalendarDays, to: routes.appointments, kbd: '3' },
  { label: 'Messages', icon: MessageSquare, to: routes.messages, kbd: '4', badge: 1 },
  { label: 'Health Log', icon: HeartPulse, to: routes.healthLog, kbd: '5' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const prefix = email?.split('@')[0] ?? 'guest';
  const name = email ? displayName(prefix) : 'Guest';
  const initials = email ? initialsOf(prefix) : 'G';

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
              {item.badge != null && <span className={styles.badge}>{item.badge}</span>}
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
