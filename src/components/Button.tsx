import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly icon?: ReactNode;
  readonly fullWidth?: boolean;
}

/**
 * Shared action button. All variants are real, focusable `<button>`s so the
 * keyboard-operability requirement holds everywhere.
 */
export function Button({
  variant = 'primary',
  icon,
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon != null && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}
