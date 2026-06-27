import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  readonly title: string;
  /** Optional centered control, e.g. a segmented filter. */
  readonly center?: ReactNode;
  /** Optional right-aligned actions, e.g. search + primary button. */
  readonly actions?: ReactNode;
}

/** White screen-header bar matching the Figma toolbar row. */
export function Toolbar({ title, center, actions }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <h1 className={styles.title}>{title}</h1>
      {center != null && <div className={styles.center}>{center}</div>}
      {actions != null && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
