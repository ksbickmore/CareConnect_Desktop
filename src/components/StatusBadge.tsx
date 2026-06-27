import type { CareStatus } from '@/models/types';
import styles from './StatusBadge.module.css';

interface BadgeStyle {
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
}

// Status → pill label + colors, following the Figma medication list/badges.
const statusStyles: Record<CareStatus, BadgeStyle> = {
  dueSoon: { label: 'DUE', fg: 'var(--amber-900)', bg: 'var(--amber-50)' },
  reminderSet: { label: 'PENDING', fg: 'var(--muted)', bg: 'var(--bg)' },
  scheduled: { label: 'LATER', fg: 'var(--muted)', bg: 'var(--bg)' },
  taken: { label: 'TAKEN', fg: 'var(--success-fg)', bg: 'var(--success-bg)' },
  confirmed: { label: 'CONFIRMED', fg: 'var(--success-fg)', bg: 'var(--success-bg)' },
  missed: { label: 'MISSED', fg: 'var(--emergency)', bg: 'var(--emergency-bg)' },
};

export function StatusBadge({ status }: { status: CareStatus }) {
  const s = statusStyles[status];
  return (
    <span className={styles.badge} style={{ color: s.fg, background: s.bg }}>
      {s.label}
    </span>
  );
}
