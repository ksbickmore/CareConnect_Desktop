import { useState } from 'react';
import { Mic, Pencil, Download } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { StepControl } from '@/components/StepControl';
import { PaginatedList } from '@/components/PaginatedList';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { parseSpokenNumber } from '@/lib/voice/spoken-words';
import {
  useHealthLogStore,
  PAIN_MIN,
  PAIN_MAX,
  SLEEP_MIN,
  SLEEP_MAX,
} from '@/stores/health-log-store';
import { useAnnouncer } from '@/stores/announcer-store';
import type { LogEntry } from '@/models/types';
import styles from './HealthLogScreen.module.css';

const MOODS = ['Good', 'OK', 'Low'] as const;

function painDescriptor(value: number): string {
  if (value <= 2) return 'Mild';
  if (value <= 5) return 'Moderate';
  if (value <= 8) return 'Moderate–severe';
  return 'Severe';
}

export function HealthLogScreen() {
  const painLevel = useHealthLogStore((s) => s.painLevel);
  const sleepHours = useHealthLogStore((s) => s.sleepHours);
  const mood = useHealthLogStore((s) => s.mood);
  const history = useHealthLogStore((s) => s.history);
  const incrementPain = useHealthLogStore((s) => s.incrementPain);
  const decrementPain = useHealthLogStore((s) => s.decrementPain);
  const incrementSleep = useHealthLogStore((s) => s.incrementSleep);
  const decrementSleep = useHealthLogStore((s) => s.decrementSleep);
  const setMood = useHealthLogStore((s) => s.setMood);
  const setPain = useHealthLogStore((s) => s.setPain);
  const setSleep = useHealthLogStore((s) => s.setSleep);
  const addEntry = useHealthLogStore((s) => s.addEntry);
  const announce = useAnnouncer();

  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const { listening, available, start, stop } = useSpeechRecognition((final) => {
    setNote((prev) => (prev ? `${prev} ${final}` : final));
    setShowNote(true);
  });

  const voiceLog = () => {
    if (!available) {
      setShowNote(true);
      announce('Voice input is not available; use manual entry.');
      return;
    }
    if (listening) stop();
    else void start();
  };

  const save = () => {
    addEntry({ note });
    setNote('');
    setShowNote(false);
    announce('Entry saved.');
  };

  const exportLog = () => {
    const text = history
      .map(
        (e) =>
          `${e.date} — Pain ${e.painLevel}/10` +
          (e.sleepHours != null ? `, Sleep ${e.sleepHours}h` : '') +
          (e.mood ? `, Mood ${e.mood}` : '') +
          (e.note ? ` — ${e.note}` : ''),
      )
      .join('\n');
    const blob = new Blob([`CareConnect Health Log\n\n${text}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'careconnect-health-log.txt';
    a.click();
    URL.revokeObjectURL(url);
    announce('Health log exported.');
  };

  useVoiceCommands('screen', [
    {
      phrases: ['pain up'],
      hint: 'pain up',
      run: () => {
        incrementPain();
        return `Pain ${useHealthLogStore.getState().painLevel} of 10.`;
      },
    },
    {
      phrases: ['pain down'],
      hint: 'pain down',
      run: () => {
        decrementPain();
        return `Pain ${useHealthLogStore.getState().painLevel} of 10.`;
      },
    },
    {
      phrases: ['sleep up'],
      hint: 'sleep up',
      run: () => {
        incrementSleep();
        return `Sleep ${useHealthLogStore.getState().sleepHours} hours.`;
      },
    },
    {
      phrases: ['sleep down'],
      hint: 'sleep down',
      run: () => {
        decrementSleep();
        return `Sleep ${useHealthLogStore.getState().sleepHours} hours.`;
      },
    },
    {
      phrases: ['set pain to *', 'pain *'],
      hint: 'set pain to <0-10>',
      run: (v) => {
        const n = v != null ? parseSpokenNumber(v) : null;
        if (n == null) return 'Say a number, like "set pain to five".';
        setPain(n);
        return `Pain ${useHealthLogStore.getState().painLevel} of 10.`;
      },
    },
    {
      phrases: ['set sleep to *', 'sleep *'],
      hint: 'set sleep to <0-14 hours>',
      run: (v) => {
        const n = v != null ? parseSpokenNumber(v) : null;
        if (n == null) return 'Say a number of hours.';
        setSleep(n);
        return `Sleep ${useHealthLogStore.getState().sleepHours} hours.`;
      },
    },
    ...MOODS.map((m) => ({
      phrases: [`mood ${m.toLowerCase()}`, ...(m === 'OK' ? ['mood okay'] : [])],
      hint: `mood ${m.toLowerCase()}`,
      run: () => {
        setMood(m);
        return `Mood ${m}.`;
      },
    })),
    {
      phrases: ['note *'],
      hint: 'note <text>',
      run: (v) => {
        setNote((prev) => (prev ? `${prev} ${v}` : v ?? ''));
        setShowNote(true);
        return 'Note added.';
      },
    },
    {
      phrases: ['save entry', 'save'],
      hint: 'save entry',
      run: () => {
        save();
      },
    },
    { phrases: ['export log'], hint: 'export log', run: () => { exportLog(); } },
    { phrases: ['manual entry'], run: () => { setShowNote((s) => !s); } },
  ]);

  const trackPct = (painLevel / PAIN_MAX) * 100;

  return (
    <>
      <Toolbar
        title="Health Log"
        actions={
          <>
            <Button variant="outline" icon={<Download size={18} />} onClick={exportLog}>
              Export log
            </Button>
            <Button variant="secondary" icon={<Mic size={18} />} onClick={voiceLog}>
              {listening ? 'Stop voice' : 'Voice log'}
            </Button>
          </>
        }
      />

      <div className={styles.scroll}>
        <div className={styles.headRow}>
          <h2 className={styles.h2}>Health Log</h2>
          <p className={styles.sub}>Track symptoms and review recent entries</p>
        </div>

        <div className={styles.grid}>
          {/* Log today */}
          <section className={styles.logCard} aria-label="Log today's symptoms">
            <div className={styles.eyebrow}>LOG TODAY'S SYMPTOMS</div>

            <div className={styles.logActions}>
              <Button
                variant="secondary"
                icon={<Mic size={18} />}
                fullWidth
                onClick={voiceLog}
              >
                {listening ? 'Recording… tap to stop' : 'Voice log'}
              </Button>
              <Button
                variant="outline"
                icon={<Pencil size={16} />}
                fullWidth
                onClick={() => setShowNote((v) => !v)}
              >
                Manual entry
              </Button>
            </div>

            {showNote && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="hl-note">
                  Note for today
                </label>
                <textarea
                  id="hl-note"
                  className={styles.textarea}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional — what mattered today?"
                />
              </div>
            )}

            <div className={styles.painBlock}>
              <StepControl
                label="Pain level"
                value={painLevel}
                min={PAIN_MIN}
                max={PAIN_MAX}
                unit="/ 10"
                onIncrement={incrementPain}
                onDecrement={decrementPain}
              />
              <div className={styles.track} aria-hidden="true">
                <span className={styles.trackKnob} style={{ left: `${trackPct}%` }} />
              </div>
              <div className={styles.painMeta}>
                {painDescriptor(painLevel)} · {painLevel}/10
              </div>
            </div>

            <div className={styles.eyebrow}>OTHER SYMPTOMS TODAY</div>
            <div className={styles.sleepRow}>
              <StepControl
                label="Sleep quality (hrs)"
                value={sleepHours}
                min={SLEEP_MIN}
                max={SLEEP_MAX}
                unit="hrs"
                onIncrement={incrementSleep}
                onDecrement={decrementSleep}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label} id="mood-label">
                Mood
              </div>
              <div className={styles.chips} role="group" aria-labelledby="mood-label">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.chip} ${mood === m ? styles.chipActive : ''}`}
                    aria-pressed={mood === m}
                    onClick={() => setMood(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <Button fullWidth onClick={save}>
              Save entry
            </Button>
          </section>

          {/* Recent entries */}
          <section className={styles.recentCard} aria-label="Recent entries">
            <h3 className={styles.recentTitle}>Recent Entries</h3>
            <PaginatedList<LogEntry>
              items={history}
              pageSize={4}
              keyOf={(e, i) => `${e.date}-${i}`}
              emptyMessage="No entries yet — save your first above."
              renderItem={(e) => (
                <div className={styles.entry}>
                  <div className={styles.entryDate}>{e.date}</div>
                  <div className={styles.entryChips}>
                    <span className={`${styles.pill} ${styles.pain}`}>
                      Pain {e.painLevel}/10
                    </span>
                    {e.sleepHours != null && (
                      <span className={`${styles.pill} ${styles.sleep}`}>
                        Sleep {e.sleepHours}h
                      </span>
                    )}
                    {e.mood && (
                      <span className={`${styles.pill} ${styles.mood}`}>Mood: {e.mood}</span>
                    )}
                  </div>
                  {e.note && <div className={styles.entryNote}>{e.note}</div>}
                </div>
              )}
            />
          </section>
        </div>
      </div>
    </>
  );
}
