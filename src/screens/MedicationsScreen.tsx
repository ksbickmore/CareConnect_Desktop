import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Check, AlarmClock, Mic } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { useMedicationsStore } from '@/stores/medications-store';
import { dataOrNull } from '@/stores/async';
import type { Medication } from '@/models/types';
import styles from './MedicationsScreen.module.css';

type Filter = 'all' | 'due' | 'taken';
const FILTERS: readonly Filter[] = ['all', 'due', 'taken'];

export function MedicationsScreen() {
  const meds = useMedicationsStore((s) => s.medications);
  const markTaken = useMedicationsStore((s) => s.markTaken);

  const list = dataOrNull(meds) ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matchesFilter = (m: Medication) =>
    filter === 'all' ||
    (filter === 'taken' ? m.status === 'taken' : m.status !== 'taken');

  const today = list.filter((m) => m.status !== 'taken' && matchesFilter(m));
  const completed = list.filter((m) => m.status === 'taken' && matchesFilter(m));

  // Default selection: first visible row, preferring the active "today" group.
  const selected = useMemo(() => {
    const all = [...today, ...completed];
    return all.find((m) => m.id === selectedId) ?? all[0] ?? null;
  }, [today, completed, selectedId]);

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
        actions={<Button icon={<Plus size={18} />}>Add medication</Button>}
      />

      <div className={styles.layout}>
        {/* Master list */}
        <div className={styles.master}>
          <Group label="TODAY — THURSDAY">
            {today.length === 0 && <Empty>Nothing due with this filter.</Empty>}
            {today.map((m) => (
              <MedRow
                key={m.id}
                med={m}
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
                    {[selected.category, selected.schedule]
                      .filter(Boolean)
                      .join(' · ')}
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
                <Button
                  icon={<Check size={18} />}
                  disabled={selected.status === 'taken'}
                  onClick={() => void markTaken(selected.id)}
                >
                  {selected.status === 'taken' ? 'Taken' : 'Confirm taken'}
                </Button>
                <Button variant="secondary" icon={<AlarmClock size={18} />}>
                  Snooze 15 min
                </Button>
                <Button variant="outline" icon={<Mic size={16} />}>
                  Voice note
                </Button>
              </div>

              <p className={styles.instructions}>{selected.instructions}</p>
            </>
          )}
        </div>
      </div>
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
  onSelect,
}: {
  med: Medication;
  selected: boolean;
  onSelect: () => void;
}) {
  const done = med.status === 'taken';
  return (
    <button
      type="button"
      className={`${styles.medRow} ${selected ? styles.medRowSelected : ''} ${
        done ? styles.medRowDone : ''
      }`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span
        className={`${styles.dot} ${done ? styles.dotDone : ''}`}
        aria-hidden="true"
      />
      <span className={styles.medText}>
        <span className={styles.medName}>
          {med.name} {med.dose}
        </span>
        <span className={styles.medMeta}>{med.timeLabel ?? med.schedule}</span>
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
