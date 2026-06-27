import styles from './MenuBar.module.css';

const MENUS: ReadonlyArray<readonly [label: string, id: string]> = [
  ['File', 'file'],
  ['Edit', 'edit'],
  ['View', 'view'],
  ['Help', 'help'],
];

/**
 * Dark in-window chrome strip matching the Figma desktop header. This is the
 * app's only menu bar: the OS menu bar is hidden, so each button pops the
 * real Electron submenu up beneath itself via the preload bridge. Buttons are
 * native <button>s, so they are fully keyboard-operable (Tab + Enter/Space).
 */
export function MenuBar() {
  const openMenu = (id: string, target: HTMLButtonElement) => {
    const rect = target.getBoundingClientRect();
    window.careconnect?.popupMenu(id, rect.left, rect.bottom);
  };

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.brandName}>CareConnect</span>
      </div>
      <nav className={styles.menus} aria-label="Application menu">
        {MENUS.map(([label, id]) => (
          <button
            key={id}
            type="button"
            className={styles.menuItem}
            onClick={(e) => openMenu(id, e.currentTarget)}
          >
            {label}
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
