import { Dialog } from './Dialog';
import styles from './KeyboardShortcutsOverlay.module.css';

interface KeyboardShortcutsOverlayProps {
  readonly onClose: () => void;
}

// Two columns, mirroring .figma/keyboard_shortcuts.png.
const LEFT: ReadonlyArray<readonly [string, string]> = [
  ['New record / appointment', 'Ctrl + N'],
  ['Save', 'Ctrl + S'],
  ['Search / Find', 'Ctrl + F'],
  ['Open settings', 'Ctrl + ,'],
  ['Dashboard / Meds / Schedule / Messages / Health', '1 2 3 4 5'],
];
const RIGHT: ReadonlyArray<readonly [string, string]> = [
  ['Navigate panels', 'Tab / Shift+Tab'],
  ['Close dialog / menu', 'Esc'],
  ['Keyboard shortcuts help', 'F1 or ?'],
  ['Voice command / dictation', 'Ctrl + Space'],
  ['Emergency SOS', 'Ctrl + Shift + E'],
];

/** Keyboard shortcut reference overlay, opened by F1 / ? or the Help menu. */
export function KeyboardShortcutsOverlay({ onClose }: KeyboardShortcutsOverlayProps) {
  return (
    <Dialog title="Keyboard Shortcut Reference" onClose={onClose} wide>
      <div className={styles.grid}>
        <dl className={styles.col}>
          {LEFT.map(([label, keys]) => (
            <Row key={label} label={label} keys={keys} />
          ))}
        </dl>
        <dl className={styles.col}>
          {RIGHT.map(([label, keys]) => (
            <Row key={label} label={label} keys={keys} />
          ))}
        </dl>
      </div>
    </Dialog>
  );
}

function Row({ label, keys }: { label: string; keys: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.keys}>
        <kbd className={styles.kbd}>{keys}</kbd>
      </dd>
    </div>
  );
}
