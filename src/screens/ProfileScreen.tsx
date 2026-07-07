import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth-store';
import { displayName, initialsOf } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import styles from './ProfileScreen.module.css';

/**
 * Profile screen — the app's only sign-out path. Reached from the sidebar
 * profile chip. Details derive from the signed-in email (guest = "Guest").
 */
export function ProfileScreen() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);

  const prefix = email?.split('@')[0] ?? 'guest';
  const name = email ? displayName(prefix) : 'Guest';
  const initials = email ? initialsOf(prefix) : 'G';

  const doSignOut = () => {
    signOut();
    void navigate(routes.login, { replace: true });
  };

  useVoiceCommands('screen', [
    {
      phrases: ['sign out', 'log out'],
      hint: 'sign out',
      run: doSignOut,
    },
  ]);

  return (
    <>
      <Toolbar title="Profile" />
      <div className={styles.scroll}>
        <div className={styles.card}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <h2 className={styles.name}>{name}</h2>
          <p className={styles.email}>{email ?? 'Signed in as guest'}</p>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowIcon} aria-hidden="true">
                <User size={18} />
              </span>
              <div>
                <div className={styles.rowLabel}>ACCOUNT</div>
                <div className={styles.rowValue}>{name}</div>
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.rowIcon} aria-hidden="true">
                <Mail size={18} />
              </span>
              <div>
                <div className={styles.rowLabel}>EMAIL</div>
                <div className={styles.rowValue}>{email ?? '—'}</div>
              </div>
            </div>
          </div>

          <Button variant="danger" icon={<LogOut size={18} />} fullWidth onClick={doSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
