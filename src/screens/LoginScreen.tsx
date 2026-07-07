import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { MenuBar } from '@/components/MenuBar';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth-store';
import { routes } from '@/lib/routes';
import styles from './LoginScreen.module.css';

/**
 * Sign-in screen. Not present in the Figma, so it is designed in the same
 * system (dark menu bar + centered surface card). Demo credentials are
 * pre-filled so the app is one click from the dashboard, matching the
 * mobile app's grading-friendly behavior.
 */
export function LoginScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [email, setEmail] = useState('demo@careconnect.app');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!signIn(email, password)) {
      setError('Email and password are both required.');
      return;
    }
    void navigate(routes.dashboard, { replace: true });
  };

  const guest = () => {
    continueAsGuest();
    void navigate(routes.dashboard, { replace: true });
  };

  return (
    <div className={styles.page}>
      <MenuBar />
      <div className={styles.center}>
        <form className={styles.card} onSubmit={submit}>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.intro}>
            Demo credentials are pre-filled — just select Sign In to continue.
          </p>

          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error != null && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <Button type="submit" icon={<LogIn size={18} />} fullWidth>
              Sign In
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={guest}>
              Continue as Guest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
