import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Check, AlarmClock, Mic } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog } from '@/components/Dialog';
import { TwoTapConfirm } from '@/components/TwoTapConfirm';
import { RecordingRadar } from '@/components/RecordingRadar';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { slugify } from '@/lib/format';
import { useMedicationsStore } from '@/stores/medications-store';
import { dataOrNull } from '@/stores/async';
import { useAnnouncer } from '@/stores/announcer-store';
import type { Medication } from '@/models/types';
import styles from './MedicationsScreen.module.css';

type Filter = 'all' | 'due' | 'taken';
const FILTERS: readonly Filter[] = ['all', 'due', 'taken'];

export function MedicationsScreen() {
  const meds = useMedicationsStore((s) => s.medications);
  const markTaken = useMedicationsStore((s) => s.markTaken);
  const add = useMedicationsStore((s) => s.add);
  const announce = useAnnouncer();

  const list = dataOrNull(meds) ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [voiceFor, setVoiceFor] = useState<Medication | null>(null);

  const matchesFilter = (m: Medication) =>
    filter === 'all' ||
    (filter === 'taken' ? m.status === 'taken' : m.status !== 'taken');

  const today = list.filter((m) => m.status !== 'taken' && matchesFilter(m));
  const completed = list.filter((m) => m.status === 'taken' && matchesFilter(m));
  const ordered = useMemo(() => [...today, ...completed], [today, completed]);

  const selected = useMemo(
    () => ordered.find((m) => m.id === selectedId) ?? ordered[0] ?? null,
    [ordered, selectedId],
  );

  const confirmTaken = (m: Medication) => {
    setSelectedId(m.id);
    void markTaken(m.id);
    announce(`${m.name} ${m.dose} logged as taken.`);
  };

  const snooze = (m: Medication) => {
    setSnoozed((s) => new Set(s).add(m.id));
    announce(`${m.name} snoozed 15 minutes.`);
  };

  const moveSelection = (dir: 1 | -1) => {
    if (ordered.length === 0) return;
    const idx = Math.max(0, ordered.findIndex((m) => m.id === selected?.id));
    const next = Math.min(ordered.length - 1, Math.max(0, idx + dir));
    setSelectedId(ordered[next].id);
    return `${ordered[next].name} ${ordered[next].dose} selected.`;
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    moveSelection(e.key === 'ArrowDown' ? 1 : -1);
  };

  useVoiceCommands('screen', [
    { phrases: ['next medication'], hint: 'next medication', run: () => moveSelection(1) },
    {
      phrases: ['previous medication'],
      hint: 'previous medication',
      run: () => moveSelection(-1),
    },
    ...FILTERS.map((f) => ({
      phrases: [`filter ${f}`],
      hint: `filter ${f}`,
      run: () => {
        setFilter(f);
        return `Filter ${f}.`;
      },
    })),
    {
      phrases: ['snooze', 'snooze medication'],
      hint: 'snooze',
      run: () => {
        if (!selected || selected.status === 'taken' || snoozed.has(selected.id))
          return 'Nothing to snooze.';
        snooze(selected);
      },
    },
    {
      phrases: ['voice note', 'leave a voice note'],
      hint: 'voice note',
      run: () => {
        if (selected) {
          setVoiceFor(selected);
          return `Voice note for ${selected.name}.`;
        }
      },
    },
    {
      phrases: ['add medication', 'new medication'],
      hint: 'add medication',
      run: () => {
        setAddOpen(true);
        return 'New medication. Say name, dose, schedule, then save.';
      },
    },
  ]);

  return (
    <>
      <Toolbar
        title="Medications"
        center={
          <div className={styles.segmented} role="tablist" aria-label="Filter">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`${styles.segment} ${filter === f ? styles.segmentActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'due' ? 'Due' : 'Taken'}
              </button>
            ))}
          </div>
        }
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
            Add medication
          </Button>
        }
      />

      <div className={styles.layout}>
        {/* Master list */}
        <div
          className={styles.master}
          role="listbox"
          aria-label="Medications"
          tabIndex={0}
          onKeyDown={onListKeyDown}
        >
          <Group label="TODAY — THURSDAY">
            {today.length === 0 && <Empty>Nothing due with this filter.</Empty>}
            {today.map((m) => (
              <MedRow
                key={m.id}
                med={m}
                snoozed={snoozed.has(m.id)}
                selected={selected?.id === m.id}
                onSelect={() => setSelectedId(m.id)}
              />
            ))}
          </Group>

          {completed.length > 0 && (
            <Group label="COMPLETED TODAY">
              {completed.map((m) => (
                <MedRow
                  key={m.id}
                  med={m}
                  snoozed={false}
                  selected={selected?.id === m.id}
                  onSelect={() => setSelectedId(m.id)}
                />
              ))}
            </Group>
          )}
        </div>

        {/* Detail panel */}
        <div className={styles.detail}>
          {selected == null ? (
            <p className={styles.detailEmpty}>Select a medication to see details.</p>
          ) : (
            <>
              <div className={styles.detailHead}>
                <div>
                  <h2 className={styles.detailName}>
                    {selected.name} {selected.dose}
                  </h2>
                  <p className={styles.detailSub}>
                    {[selected.category, selected.schedule].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className={styles.tiles}>
                <Tile label="SCHEDULE" value={selected.timeLabel ?? selected.schedule} />
                <Tile label="REFILL" value={selected.refill ?? '—'} />
                <Tile
                  label="ADHERENCE 7D"
                  value={selected.adherence ? `${selected.adherence} ✓` : '—'}
                  tone="success"
                />
                <Tile label="PRESCRIBER" value={selected.prescriber ?? '—'} />
              </div>

              <div className={styles.actions}>
                {selected.status === 'taken' ? (
                  <Button icon={<Check size={18} />} disabled>
                    Taken
                  </Button>
                ) : (
                  <TwoTapConfirm
                    idleLabel="Confirm taken"
                    confirmLabel="Tap again to confirm"
                    icon={<Check size={18} />}
                    onConfirmed={() => confirmTaken(selected)}
                    voicePhrases={['confirm taken', 'take medication']}
                  />
                )}
                <Button
                  variant="secondary"
                  icon={<AlarmClock size={18} />}
                  disabled={selected.status === 'taken' || snoozed.has(selected.id)}
                  onClick={() => snooze(selected)}
                >
                  {snoozed.has(selected.id) ? 'Snoozed' : 'Snooze 15 min'}
                </Button>
                <Button
                  variant="outline"
                  icon={<Mic size={16} />}
                  onClick={() => setVoiceFor(selected)}
                >
                  Voice note
                </Button>
              </div>

              <p className={styles.instructions}>{selected.instructions}</p>
            </>
          )}
        </div>
      </div>

      {addOpen && (
        <AddMedicationDialog
          onClose={() => setAddOpen(false)}
          onSave={async (draft) => {
            const id = slugify(`${draft.name} ${draft.dose}`);
            try {
              await add({
                id,
                name: draft.name,
                dose: draft.dose,
                schedule: draft.schedule || 'As needed',
                instructions: draft.instructions,
                status: 'dueSoon',
                lastTakenAt: null,
                timeLabel: draft.schedule || 'As needed',
              });
              announce(`${draft.name} added to your medications.`);
              setAddOpen(false);
              return null;
            } catch (e) {
              return e instanceof Error ? e.message : String(e);
            }
          }}
        />
      )}

      {voiceFor && (
        <Dialog
          title={`Voice note — ${voiceFor.name}`}
          description="Record a spoken note for this medication."
          onClose={() => setVoiceFor(null)}
        >
          <div className={styles.voiceBody}>
            <RecordingRadar label="Voice note" />
          </div>
        </Dialog>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

function MedRow({
  med,
  selected,
  snoozed,
  onSelect,
}: {
  med: Medication;
  selected: boolean;
  snoozed: boolean;
  onSelect: () => void;
}) {
  const done = med.status === 'taken';
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`${styles.medRow} ${selected ? styles.medRowSelected : ''} ${
        done ? styles.medRowDone : ''
      }`}
      onClick={onSelect}
    >
      <span className={`${styles.dot} ${done ? styles.dotDone : ''}`} aria-hidden="true" />
      <span className={styles.medText}>
        <span className={styles.medName}>
          {med.name} {med.dose}
        </span>
        <span className={styles.medMeta}>
          {snoozed ? 'Snoozed 15 min' : med.timeLabel ?? med.schedule}
        </span>
      </span>
      <StatusBadge status={med.status} />
    </button>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={`${styles.tileValue} ${tone === 'success' ? styles.tileSuccess : ''}`}>
        {value}
      </div>
    </div>
  );
}

interface MedDraft {
  name: string;
  dose: string;
  schedule: string;
  instructions: string;
}

function AddMedicationDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: MedDraft) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [schedule, setSchedule] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { listening, available, start, stop } = useSpeechRecognition((final) =>
    setName((prev) => (prev ? `${prev} ${final}` : final)),
  );

  const submit = async () => {
    if (name.trim().length === 0 || dose.trim().length === 0) {
      setError('Name and dose are both required.');
      return;
    }
    const err = await onSave({
      name: name.trim(),
      dose: dose.trim(),
      schedule: schedule.trim(),
      instructions: instructions.trim(),
    });
    if (err) setError(err);
  };

  useVoiceCommands('dialog', [
    {
      phrases: ['name *'],
      hint: 'name <medication>',
      run: (v) => {
        setName(v ?? '');
        return `Name ${v}.`;
      },
    },
    {
      phrases: ['dose *'],
      hint: 'dose <amount>',
      run: (v) => {
        setDose(v ?? '');
        return `Dose ${v}.`;
      },
    },
    {
      phrases: ['schedule *'],
      hint: 'schedule <when>',
      run: (v) => {
        setSchedule(v ?? '');
        return `Schedule ${v}.`;
      },
    },
    {
      phrases: ['instructions *'],
      hint: 'instructions <text>',
      run: (v) => {
        setInstructions(v ?? '');
        return 'Instructions set.';
      },
    },
    {
      phrases: ['save', 'save medication'],
      hint: 'save',
      run: () => {
        if (name.trim().length === 0 || dose.trim().length === 0) {
          return 'Name and dose are both required.';
        }
        void submit();
        return 'Saving.';
      },
    },
  ]);

  return (
    <Dialog
      title="New medication"
      description="Name and dose are required. Use the mic to dictate the name."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save medication</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="med-name">
          Name
        </label>
        <div className={styles.inputRow}>
          <input
            id="med-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lisinopril"
            aria-describedby={error ? 'med-err' : undefined}
          />
          <button
            type="button"
            className={`${styles.mic} ${listening ? styles.micOn : ''}`}
            onClick={() => (listening ? stop() : available && void start())}
            aria-label={listening ? 'Stop dictation' : 'Dictate name'}
          >
            <Mic size={18} />
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="med-dose">
          Dose
        </label>
        <input
          id="med-dose"
          className={styles.input}
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="e.g. 10 mg"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="med-schedule">
          Schedule
        </label>
        <input
          id="med-schedule"
          className={styles.input}
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="e.g. 8:00 AM · Daily"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="med-instructions">
          Instructions
        </label>
        <textarea
          id="med-instructions"
          className={styles.textarea}
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="How and when to take it."
        />
      </div>

      {error && (
        <p id="med-err" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
