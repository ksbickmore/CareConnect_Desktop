import { Search, Plus, Check, Mic, Pencil, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { TwoTapConfirm } from '@/components/TwoTapConfirm';
import { VoiceInputBar } from '@/components/VoiceInputBar';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useMessagesStore } from '@/stores/messages-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { dataOrNull } from '@/stores/async';
import { useAnnouncer } from '@/stores/announcer-store';
import { whenLabel } from '@/lib/format';
import { routes } from '@/lib/routes';
import styles from './DashboardScreen.module.css';

const HOUR = 60 * 60 * 1000;

export function DashboardScreen() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const meds = useMedicationsStore((s) => s.medications);
  const markTaken = useMedicationsStore((s) => s.markTaken);
  const appts = useAppointmentsStore((s) => s.appointments);
  const conversations = useMessagesStore((s) => s.conversations);
  const history = useHealthLogStore((s) => s.history);
  const announce = useAnnouncer();

  const medList = dataOrNull(meds) ?? [];
  const takenCount = medList.filter((m) => m.status === 'taken').length;
  const nextMed =
    medList.find((m) => m.status === 'dueSoon') ??
    medList.find((m) => m.status !== 'taken') ??
    null;

  const latest = history[0];
  const stats = [
    {
      label: 'PAIN LEVEL',
      value: latest ? `${latest.painLevel}/10` : '—',
      hint: 'From your last log',
      tone: 'amber' as const,
    },
    {
      label: 'MEDS TODAY',
      value: `${takenCount}/${medList.length}`,
      hint: `${Math.max(0, medList.length - takenCount)} remaining`,
      tone: 'teal' as const,
    },
    {
      label: 'SLEEP',
      value: latest?.sleepHours != null ? `${latest.sleepHours}h` : '—',
      hint: 'Goal: 8h',
      tone: 'neutral' as const,
    },
  ];

  const now = Date.now();
  const upcoming = [...(dataOrNull(appts) ?? [])]
    .filter((a) => a.when >= now - HOUR)
    .sort((a, b) => a.when - b.when)
    .slice(0, 3);

  const threads = (dataOrNull(conversations) ?? []).slice(0, 2);

  const namePrefix = email?.split('@')[0] ?? 'Sung';
  const greeting = `Good morning, ${namePrefix} 👋`;

  const confirmNext = () => {
    if (!nextMed) return;
    void markTaken(nextMed.id);
    announce(`${nextMed.name} ${nextMed.dose} logged as taken.`);
  };

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
            <Button icon={<Plus size={18} />} onClick={() => navigate(routes.medications)}>
              New record
            </Button>
          </>
        }
      />

      <div className={styles.scroll}>
        <h2 className={styles.greeting}>{greeting}</h2>
        <p className={styles.dateLine}>
          {takenCount} of {medList.length} medications taken today
        </p>

        <section className={styles.stats} aria-label="Today's stats">
          {stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={`${styles.statValue} ${styles[s.tone]}`}>{s.value}</div>
              <div className={styles.statHint}>{s.hint}</div>
            </div>
          ))}
        </section>

        <div className={styles.grid}>
          {/* Next Medication — live, two-tap */}
          <section className={`${styles.card} ${styles.nextMed}`}>
            <div className={styles.nextMedHead}>
              <div className={styles.eyebrowTeal}>NEXT MEDICATION</div>
              {nextMed != null && <span className={styles.duePill}>DUE</span>}
            </div>
            {nextMed == null ? (
              <p className={styles.allDone}>All medications taken for now. Nice work!</p>
            ) : (
              <>
                <h3 className={styles.nextMedName}>
                  {nextMed.name} {nextMed.dose}
                </h3>
                <p className={styles.nextMedMeta}>{nextMed.timeLabel}</p>
                <TwoTapConfirm
                  idleLabel="Confirm taken"
                  confirmLabel="Tap again to confirm"
                  icon={<Check size={18} />}
                  fullWidth
                  onConfirmed={confirmNext}
                />
              </>
            )}
          </section>

          {/* Log symptoms — wired to Health Log */}
          <section className={`${styles.card} ${styles.symptom}`}>
            <div className={styles.eyebrowAmber}>LOG TODAY'S SYMPTOMS</div>
            <p className={styles.symptomMsg}>
              {history[0] ? `Last logged: ${history[0].date}` : 'Not logged yet today.'}
            </p>
            <div className={styles.symptomActions}>
              <Button
                variant="secondary"
                icon={<Mic size={18} />}
                onClick={() => navigate(routes.healthLog)}
              >
                Voice log
              </Button>
              <Button
                variant="outline"
                icon={<Pencil size={16} />}
                onClick={() => navigate(routes.healthLog)}
              >
                Manual log
              </Button>
            </div>
          </section>

          {/* Today's schedule — live */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Today's Schedule</h3>
              <button
                type="button"
                className={styles.link}
                onClick={() => navigate(routes.appointments)}
              >
                See all <ArrowRight size={14} />
              </button>
            </div>
            {upcoming.length === 0 && <p className={styles.symptomMsg}>Nothing upcoming.</p>}
            {upcoming.map((a) => {
              const soon = a.when - now <= 4 * HOUR;
              return (
                <div key={a.id} className={styles.row}>
                  <div>
                    <div className={styles.rowTitle}>{a.title}</div>
                    <div className={styles.rowDetail}>{whenLabel(a.when)}</div>
                  </div>
                  <span
                    className={`${styles.timePill} ${soon ? styles.pillSoon : styles.pillLater}`}
                  >
                    {soon ? 'SOON' : 'LATER'}
                  </span>
                </div>
              );
            })}
          </section>

          {/* Messages — live */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Messages</h3>
              <button
                type="button"
                className={styles.link}
                onClick={() => navigate(routes.messages)}
              >
                Open <ArrowRight size={14} />
              </button>
            </div>
            {threads.map((c) => (
              <div
                key={c.id}
                className={`${styles.row} ${c.unread ? styles.rowUnread : ''}`}
              >
                <div>
                  <div className={styles.rowTitle}>{c.contactName}</div>
                  <div className={styles.rowDetail}>
                    {c.messages[c.messages.length - 1]?.body ?? ''}
                  </div>
                </div>
                {c.unread && <span className={styles.unreadDot} aria-label="Unread" />}
              </div>
            ))}
          </section>
        </div>

        <div className={styles.voiceBar}>
          <VoiceInputBar />
        </div>
      </div>
    </>
  );
}
