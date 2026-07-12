import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from './Dialog';
import { useMedicationsStore } from '@/stores/medications-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useMessagesStore } from '@/stores/messages-store';
import { useAnnouncer } from '@/stores/announcer-store';
import { useSearchStore } from '@/stores/search-store';
import { dataOrNull } from '@/stores/async';
import { routes } from '@/lib/routes';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { normalize } from '@/lib/voice/spoken-words';
import styles from './GlobalSearchOverlay.module.css';

interface SearchResult {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
  readonly route: string;
  /** Item to select on the target screen, when it has an id. */
  readonly selectId?: string;
}

interface ResultGroup {
  readonly label: string;
  readonly results: readonly SearchResult[];
}

const MAX_PER_GROUP = 5;

// Punctuation-insensitive on both sides: dictated queries can carry Whisper's
// trailing period ("Aspirin.") and data can contain dots ("Dr. Park").
const matches = (query: string, ...haystack: ReadonlyArray<string | undefined>) =>
  haystack.some((h) => h != null && normalize(h).includes(query));

/**
 * Global search (Ctrl+F): one query across medications, appointments, health
 * log entries, and messages. Results are plain buttons — real focus is the
 * most reliable pattern for screen readers — and activating one navigates to
 * the owning screen, selecting the item where the screen supports it.
 */
export function GlobalSearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const announce = useAnnouncer();
  // Voice ("search aspirin") opens the overlay with the query pre-filled.
  const [query, setQuery] = useState(() => useSearchStore.getState().initialQuery);
  const listRef = useRef<HTMLDivElement>(null);

  // Dialog focuses its first focusable (the close button); the search box is
  // the useful target. Runs after Dialog's effect (parent effects run last).
  useEffect(() => {
    document.getElementById('global-search-input')?.focus();
  }, []);

  const meds = useMedicationsStore((s) => s.medications);
  const appointments = useAppointmentsStore((s) => s.appointments);
  const history = useHealthLogStore((s) => s.history);
  const conversations = useMessagesStore((s) => s.conversations);

  const groups = useMemo<readonly ResultGroup[]>(() => {
    const q = normalize(query);
    if (q === '') return [];

    const medResults = (dataOrNull(meds) ?? [])
      .filter((m) =>
        matches(q, m.name, m.dose, m.schedule, m.instructions, m.category),
      )
      .slice(0, MAX_PER_GROUP)
      .map((m) => ({
        key: `med-${m.id}`,
        title: m.name,
        detail: `${m.dose} · ${m.schedule}`,
        route: routes.medications,
        selectId: m.id,
      }));

    const apptResults = (dataOrNull(appointments) ?? [])
      .filter((a) => matches(q, a.title, a.clinician, a.location))
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({
        key: `appt-${a.id}`,
        title: a.title,
        detail: `${a.clinician} · ${a.location}`,
        route: routes.appointments,
        selectId: a.id,
      }));

    const logResults = history
      .filter((e) => matches(q, e.note, e.date, e.mood))
      .slice(0, MAX_PER_GROUP)
      .map((e, i) => ({
        key: `log-${e.date}-${i}`,
        title: e.note,
        detail: `${e.date} · Pain ${e.painLevel}/10`,
        route: routes.healthLog,
      }));

    const messageResults = (dataOrNull(conversations) ?? [])
      .filter((c) =>
        matches(q, c.contactName, c.subtitle, ...c.messages.map((m) => m.body)),
      )
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({
        key: `msg-${c.id}`,
        title: c.contactName,
        detail: c.subtitle,
        route: routes.messages,
        selectId: c.id,
      }));

    return [
      { label: 'Medications', results: medResults },
      { label: 'Appointments', results: apptResults },
      { label: 'Health log', results: logResults },
      { label: 'Messages', results: messageResults },
    ].filter((g) => g.results.length > 0);
  }, [query, meds, appointments, history, conversations]);

  const count = groups.reduce((n, g) => n + g.results.length, 0);

  // Announce the result count once the user pauses typing.
  useEffect(() => {
    const q = normalize(query);
    if (q === '') return;
    const t = setTimeout(() => {
      announce(
        count === 1 ? `1 result for ${q}.` : `${count} results for ${q}.`,
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query, count, announce]);

  const open = (result: SearchResult) => {
    onClose();
    void navigate(
      result.route,
      result.selectId != null ? { state: { selectId: result.selectId } } : undefined,
    );
  };

  // Voice: set/clear the query and open a result by name. Unmatched speech
  // still dictates into the focused search box (the dispatcher's dialog
  // fallback), and "close" comes from Dialog's own commands.
  useVoiceCommands('dialog', [
    {
      phrases: ['search *', 'find *'],
      hint: 'search <text>',
      run: (value) => {
        setQuery(value ?? '');
      },
    },
    {
      phrases: ['clear search', 'clear'],
      hint: 'clear search',
      run: () => {
        setQuery('');
        return 'Search cleared.';
      },
    },
    {
      phrases: ['open *'],
      hint: 'open <result>',
      run: (value) => {
        const spoken = normalize(value ?? '');
        const result = groups
          .flatMap((g) => g.results)
          .find((r) => normalize(r.title).includes(spoken));
        if (!result) return `No result matching ${value}.`;
        open(result);
        return `Opening ${result.title}.`;
      },
    },
  ]);

  // Arrow keys walk the result buttons; ArrowDown from the input enters the
  // list. Tab still works — this is a convenience, not a focus prison.
  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    );
    if (buttons.length === 0) return;
    e.preventDefault();
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === 'ArrowDown'
        ? buttons[Math.min(idx + 1, buttons.length - 1)]
        : idx <= 0
          ? null
          : buttons[idx - 1];
    if (next) next.focus();
    else document.getElementById('global-search-input')?.focus();
  };

  return (
    <Dialog title="Search" onClose={onClose} wide>
      <div>
        <label className={styles.label} htmlFor="global-search-input">
          Search records, medications, appointments, and messages
        </label>
        <input
          id="global-search-input"
          type="search"
          className={styles.input}
          placeholder="Start typing…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onListKeyDown}
          autoComplete="off"
        />

        {query.trim() !== '' && (
          <p className={styles.count}>
            {count === 1 ? '1 result' : `${count} results`}
          </p>
        )}

        <div ref={listRef}>
          {groups.map((group) => (
            <section key={group.label} className={styles.group}>
              <h3 className={styles.groupLabel}>{group.label}</h3>
              {group.results.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={styles.result}
                  onClick={() => open(r)}
                  onKeyDown={onListKeyDown}
                >
                  <span className={styles.resultTitle}>{r.title}</span>
                  <span className={styles.resultDetail}>{r.detail}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
