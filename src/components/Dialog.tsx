import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import styles from './Dialog.module.css';

interface DialogProps {
  readonly title: string;
  /** Optional sub-line under the title. */
  readonly description?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Optional footer actions row (buttons). */
  readonly footer?: ReactNode;
  /** Widen the panel for calendar/detail content. */
  readonly wide?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Focus-trapped modal dialog. Per the SRS/accessibility notes: `role="dialog"`
 * + `aria-modal`, Tab is trapped inside, Esc closes, and focus returns to the
 * element that opened it. Used for every add-form and the shortcuts overlay.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  // Voice: every dialog is closable and focus-walkable by voice.
  const moveFocus = (dir: 1 | -1) => {
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const list = Array.from(nodes);
    const idx = list.indexOf(document.activeElement as HTMLElement);
    const next = (idx + dir + list.length) % list.length;
    list[next].focus();
  };

  useVoiceCommands('dialog', [
    {
      phrases: ['close', 'cancel', 'close dialog'],
      hint: 'close',
      run: () => {
        onClose();
        return 'Closed.';
      },
    },
    { phrases: ['next field'], hint: 'next field', run: () => moveFocus(1) },
    {
      phrases: ['previous field'],
      hint: 'previous field',
      run: () => moveFocus(-1),
    },
  ]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus the first focusable control inside the panel on open.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to the trigger on close.
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={`${styles.panel} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descId} className={styles.desc}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
