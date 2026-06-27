import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  MessageSquare,
  HeartPulse,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import styles from './Sidebar.module.css';

interface NavItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to?: string;
  readonly kbd?: string;
  readonly badge?: number;
}

// Dashboard + Medications are live routes; the rest are present-but-inert to
// match the Figma without expanding scope beyond the three screens.
const NAV: readonly NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: routes.dashboard, kbd: '1' },
  { label: 'Medications', icon: Pill, to: routes.medications, kbd: '2', badge: 2 },
  { label: 'Schedule', icon: CalendarDays, kbd: '3' },
  { label: 'Messages', icon: MessageSquare, kbd: '4', badge: 4 },
  { label: 'Health Log', icon: HeartPulse },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          SY
        </span>
        <div>
          <div className={styles.profileName}>Sung Yoon</div>
          <div className={styles.profilePlan}>SEVERE CTS CARE PLAN</div>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Primary">
        <div className={styles.groupLabel}>CARE</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon size={18} />
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge != null && (
                <span className={styles.badge}>{item.badge}</span>
              )}
              {item.kbd != null && <span className={styles.kbd}>{item.kbd}</span>}
            </>
          );

          return item.to != null ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              {content}
            </NavLink>
          ) : (
            <button
              key={item.label}
              type="button"
              className={styles.navItem}
              aria-disabled="true"
              title="Coming soon"
            >
              {content}
            </button>
          );
        })}
      </nav>

      <button type="button" className={styles.emergency}>
        <TriangleAlert size={18} />
        <span className={styles.navLabel}>Emergency (SOS)</span>
      </button>
    </aside>
  );
}
