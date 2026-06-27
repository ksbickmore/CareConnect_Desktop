import styles from './MenuBar.module.css';

const MENUS = ['File', 'Edit', 'View', 'Help'];

/**
 * Dark in-window chrome strip matching the Figma desktop header. The menu
 * labels are presentational here (the real Electron Menu handles OS-level
 * shortcuts); they exist so the desktop look matches the design.
 */
export function MenuBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.brandName}>CareConnect</span>
      </div>
      <nav className={styles.menus} aria-label="Application menu">
        {MENUS.map((m) => (
          <button key={m} type="button" className={styles.menuItem}>
            {m}
          </button>
        ))}
      </nav>
      <div className={styles.status}>
        <span className={styles.statusDot} aria-hidden="true" />
        All systems active&nbsp;&nbsp;Sung Y. · Caregiver-linked
      </div>
    </header>
  );
}
