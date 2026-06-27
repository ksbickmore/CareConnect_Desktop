import { Search, Plus, Check, Mic, Pencil, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { dataOrNull } from '@/stores/async';
import {
  dashboardDateLine,
  statCards,
  todaysSchedule,
  messagePreviews,
} from '@/data/mock';
import { routes } from '@/lib/routes';
import styles from './DashboardScreen.module.css';

export function DashboardScreen() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const meds = useMedicationsStore((s) => s.medications);
  const markTaken = useMedicationsStore((s) => s.markTaken);

  const list = dataOrNull(meds) ?? [];
  const nextMed =
    list.find((m) => m.status === 'dueSoon') ??
    list.find((m) => m.status !== 'taken') ??
    null;

  const namePrefix = email?.split('@')[0] ?? 'Sung';
  const greeting = `Good morning, ${namePrefix} 👋`;

  return (
    <>
      <Toolbar
        title="Dashboard"
        actions={
          <>
            <div className={styles.search}>
              <Search size={16} />
              <span>Search records, meds…</span>
              <kbd className={styles.searchKbd}>Ctrl F</kbd>
            </div>
            <Button icon={<Plus size={18} />}>New record</Button>
          </>
        }
      />

      <div className={styles.scroll}>
        <h2 className={styles.greeting}>{greeting}</h2>
        <p className={styles.dateLine}>{dashboardDateLine}</p>

        <section className={styles.stats} aria-label="Today's stats">
          {statCards.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={`${styles.statValue} ${styles[s.tone]}`}>
                {s.value}
              </div>
              <div className={styles.statHint}>{s.hint}</div>
            </div>
          ))}
        </section>

        <div className={styles.grid}>
          {/* Next Medication — live */}
          <section className={`${styles.card} ${styles.nextMed}`}>
            <div className={styles.nextMedHead}>
              <div className={styles.eyebrowTeal}>NEXT MEDICATION</div>
              {nextMed != null && <span className={styles.duePill}>DUE</span>}
            </div>
            {nextMed == null ? (
              <p className={styles.allDone}>
                All medications taken for now. Nice work!
              </p>
            ) : (
              <>
                <h3 className={styles.nextMedName}>
                  {nextMed.name} {nextMed.dose}
                </h3>
                <p className={styles.nextMedMeta}>{nextMed.timeLabel}</p>
                <Button
                  icon={<Check size={18} />}
                  fullWidth
                  onClick={() => void markTaken(nextMed.id)}
                >
                  Confirm taken
                </Button>
              </>
            )}
          </section>

          {/* Log symptoms — stubbed */}
          <section className={`${styles.card} ${styles.symptom}`}>
            <div className={styles.eyebrowAmber}>LOG TODAY'S SYMPTOMS</div>
            <p className={styles.symptomMsg}>Not logged yet today.</p>
            <div className={styles.symptomActions}>
              <Button variant="secondary" icon={<Mic size={18} />}>
                Voice log
              </Button>
              <Button variant="outline" icon={<Pencil size={16} />}>
                Manual log
              </Button>
            </div>
          </section>

          {/* Today's schedule — mock */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Today's Schedule</h3>
              <button type="button" className={styles.link}>
                See all <ArrowRight size={14} />
              </button>
            </div>
            {todaysSchedule.map((a) => (
              <div key={a.id} className={styles.row}>
                <div>
                  <div className={styles.rowTitle}>{a.title}</div>
                  <div className={styles.rowDetail}>{a.detail}</div>
                </div>
                <span
                  className={`${styles.timePill} ${
                    a.badgeTone === 'soon' ? styles.pillSoon : styles.pillLater
                  }`}
                >
                  {a.badge}
                </span>
              </div>
            ))}
          </section>

          {/* Messages — mock */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Messages</h3>
              <button
                type="button"
                className={styles.link}
                onClick={() => navigate(routes.medications)}
              >
                Open <ArrowRight size={14} />
              </button>
            </div>
            {messagePreviews.map((m) => (
              <div
                key={m.id}
                className={`${styles.row} ${m.unread ? styles.rowUnread : ''}`}
              >
                <div>
                  <div className={styles.rowTitle}>{m.from}</div>
                  <div className={styles.rowDetail}>{m.preview}</div>
                </div>
                {m.unread && <span className={styles.unreadDot} aria-label="Unread" />}
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
