import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, AlarmClock, MapPin, Mic } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { TwoTapConfirm } from '@/components/TwoTapConfirm';
import { StatusBadge } from '@/components/StatusBadge';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { whenLabel, clockLabel, slugify, minuteStamp } from '@/lib/format';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { dataOrNull } from '@/stores/async';
import { useAnnouncer } from '@/stores/announcer-store';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import type { Appointment } from '@/models/types';
import styles from './AppointmentsScreen.module.css';

type View = 'day' | 'week' | 'month';
const VIEWS: readonly View[] = ['day', 'week', 'month'];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// Two-hour time bands, 8 AM – 8 PM, matching the Figma schedule rows.
const BANDS = [8, 10, 12, 14, 16, 18, 20];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const c = startOfDay(d);
  c.setDate(c.getDate() + n);
  return c;
};
const startOfWeek = (d: Date) => addDays(d, -startOfDay(d).getDay());
const sameDay = (a: number, b: Date) => {
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
};
const bandOf = (hour: number) => {
  let band = BANDS[0];
  for (const b of BANDS) if (hour >= b) band = b;
  return band;
};
const bandLabel = (b: number) => `${b > 12 ? b - 12 : b} ${b >= 12 ? 'PM' : 'AM'}`;

export function AppointmentsScreen() {
  const appointments = useAppointmentsStore((s) => s.appointments);
  const load = useAppointmentsStore((s) => s.load);
  const setReminder = useAppointmentsStore((s) => s.setReminder);
  const add = useAppointmentsStore((s) => s.add);
  const announce = useAnnouncer();

  const list = dataOrNull(appointments) ?? [];
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    if (view === 'week') {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [];
  }, [view, anchor]);

  const step = (dir: 1 | -1) => {
    const delta = view === 'day' ? dir : view === 'week' ? dir * 7 : dir * 30;
    setAnchor((a) => addDays(a, delta));
  };

  const rangeLabel = () => {
    if (view === 'day') return `${DAY_NAMES[anchor.getDay()]}, ${MONTHS[anchor.getMonth()]} ${anchor.getDate()}`;
    if (view === 'week') {
      const s = days[0];
      const e = days[6];
      return `Week of ${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
    }
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  };

  useVoiceCommands('screen', [
    ...VIEWS.map((v) => ({
      phrases: [`${v} view`, v === 'month' ? 'show month' : `show ${v}`],
      hint: `${v} view`,
      run: () => {
        setView(v);
        return `${v[0].toUpperCase() + v.slice(1)} view.`;
      },
    })),
    { phrases: ['next'], hint: 'next', run: () => { step(1); } },
    { phrases: ['previous', 'back'], hint: 'previous', run: () => { step(-1); } },
    {
      phrases: ['new appointment', 'add appointment'],
      hint: 'new appointment',
      run: () => {
        setAddOpen(true);
        return 'New appointment. Say title, then save.';
      },
    },
  ]);

  const apptsFor = (day: Date, band: number) =>
    list.filter((a) => sameDay(a.when, day) && bandOf(new Date(a.when).getHours()) === band);

  return (
    <>
      <Toolbar
        title="Schedule"
        center={
          <div className={styles.controls}>
            <div className={styles.segmented} role="tablist" aria-label="Calendar view">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  className={`${styles.segment} ${view === v ? styles.segmentActive : ''}`}
                  onClick={() => setView(v)}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.nav}
              onClick={() => step(-1)}
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={styles.nav}
              onClick={() => step(1)}
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
            New appointment
          </Button>
        }
      />

      <div className={styles.scroll}>
        <div className={styles.headRow}>
          <h2 className={styles.h2}>Schedule</h2>
          <p className={styles.range}>{rangeLabel()}</p>
        </div>

        {view === 'month' ? (
          <MonthGrid
            anchor={anchor}
            list={list}
            onPick={(d) => {
              setAnchor(d);
              setView('day');
            }}
          />
        ) : (
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className={styles.corner} />
            {days.map((d) => (
              <div key={d.getTime()} className={styles.dayHead}>
                <div className={styles.dayName}>{DAY_NAMES[d.getDay()]}</div>
                <div className={styles.dayNum}>{d.getDate()}</div>
              </div>
            ))}

            {BANDS.map((band) => (
              <div key={band} className={styles.bandRowContents}>
                <div className={styles.timeCell}>{bandLabel(band)}</div>
                {days.map((d) => (
                  <div key={d.getTime()} className={styles.cell}>
                    {apptsFor(d, band).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`${styles.block} ${
                          a.status === 'reminderSet' ? styles.blockAmber : styles.blockTeal
                        }`}
                        onClick={() => setSelected(a)}
                      >
                        <span className={styles.blockTitle}>{a.title}</span>
                        <span className={styles.blockTime}>{clockLabel(a.when)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DetailDialog
          appt={selected}
          onClose={() => setSelected(null)}
          onSetReminder={() => {
            void setReminder(selected.id);
            announce(`Reminder set for ${selected.title}.`);
            setSelected(null);
          }}
        />
      )}

      {addOpen && (
        <AddDialog
          onClose={() => setAddOpen(false)}
          onSave={async (draft) => {
            const id = `${slugify(draft.title)}-${minuteStamp(draft.when)}`;
            try {
              await add({ ...draft, id, status: 'scheduled' });
              announce(`${draft.title} added to your schedule.`);
              setAddOpen(false);
              return null;
            } catch (e) {
              return e instanceof Error ? e.message : String(e);
            }
          }}
        />
      )}
    </>
  );
}

function MonthGrid({
  anchor,
  list,
  onPick,
}: {
  anchor: Date;
  list: readonly Appointment[];
  onPick: (d: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div className={styles.monthGrid}>
      {DAY_NAMES.map((n) => (
        <div key={n} className={styles.monthDayName}>
          {n}
        </div>
      ))}
      {cells.map((d) => {
        const count = list.filter((a) => sameDay(a.when, d)).length;
        const dim = d.getMonth() !== anchor.getMonth();
        return (
          <button
            key={d.getTime()}
            type="button"
            className={`${styles.monthCell} ${dim ? styles.monthDim : ''}`}
            onClick={() => onPick(d)}
          >
            <span className={styles.monthNum}>{d.getDate()}</span>
            {count > 0 && <span className={styles.monthDot}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DetailDialog({
  appt,
  onClose,
  onSetReminder,
}: {
  appt: Appointment;
  onClose: () => void;
  onSetReminder: () => void;
}) {
  return (
    <Dialog title={appt.title} onClose={onClose}>
      <div className={styles.detailHead}>
        <StatusBadge status={appt.status} />
      </div>
      <dl className={styles.detailList}>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>When</dt>
          <dd className={styles.detailValue}>{whenLabel(appt.when)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>Clinician</dt>
          <dd className={styles.detailValue}>{appt.clinician}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>Location</dt>
          <dd className={styles.detailValue}>
            <MapPin size={14} aria-hidden="true" /> {appt.location}
          </dd>
        </div>
      </dl>
      <div className={styles.detailActions}>
        <TwoTapConfirm
          idleLabel="Set reminder"
          confirmLabel="Tap again to confirm"
          icon={<AlarmClock size={18} />}
          onConfirmed={onSetReminder}
          disabled={appt.status === 'reminderSet'}
          voicePhrases={['set reminder']}
        />
      </div>
    </Dialog>
  );
}

interface Draft {
  title: string;
  clinician: string;
  location: string;
  when: number;
}

function AddDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: Draft) => Promise<string | null>;
}) {
  const [title, setTitle] = useState('');
  const [clinician, setClinician] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);

  const { listening, available, start, stop } = useSpeechRecognition((final) =>
    setTitle((prev) => (prev ? `${prev} ${final}` : final)),
  );

  const submit = async () => {
    if (title.trim().length === 0) {
      setError('Title is required.');
      return;
    }
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const when = new Date(y, m - 1, d, hh, mm).getTime();
    const err = await onSave({ title: title.trim(), clinician, location, when });
    if (err) setError(err);
  };

  useVoiceCommands('dialog', [
    {
      phrases: ['title *'],
      hint: 'title <text>',
      run: (v) => {
        setTitle(v ?? '');
        return `Title ${v}.`;
      },
    },
    {
      phrases: ['clinician *', 'doctor *'],
      hint: 'clinician <name>',
      run: (v) => {
        setClinician(v ?? '');
      },
    },
    {
      phrases: ['location *'],
      hint: 'location <place>',
      run: (v) => {
        setLocation(v ?? '');
      },
    },
    {
      phrases: ['save', 'save appointment'],
      hint: 'save',
      run: () => {
        void submit();
        return 'Saving.';
      },
    },
  ]);

  return (
    <Dialog
      title="New appointment"
      description="Title is required. Use the mic to dictate the title."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save appointment</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="appt-title">
          Title
        </label>
        <div className={styles.inputRow}>
          <input
            id="appt-title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hand Therapy"
            aria-describedby={error ? 'appt-title-err' : undefined}
          />
          <button
            type="button"
            className={`${styles.mic} ${listening ? styles.micOn : ''}`}
            onClick={() => (listening ? stop() : available && void start())}
            aria-label={listening ? 'Stop dictation' : 'Dictate title'}
          >
            <Mic size={18} />
          </button>
        </div>
        {error && (
          <p id="appt-title-err" className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="appt-clinician">
          Clinician
        </label>
        <input
          id="appt-clinician"
          className={styles.input}
          value={clinician}
          onChange={(e) => setClinician(e.target.value)}
          placeholder="e.g. Dr. Park"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="appt-location">
          Location
        </label>
        <input
          id="appt-location"
          className={styles.input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. UMGC Medical Center"
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="appt-date">
            Date
          </label>
          <input
            id="appt-date"
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="appt-time">
            Time
          </label>
          <input
            id="appt-time"
            type="time"
            className={styles.input}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  );
}
