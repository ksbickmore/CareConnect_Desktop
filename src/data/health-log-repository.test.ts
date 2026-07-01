import {
  createHealthLogRepository,
  defaultHealthLogSeed,
} from './health-log-repository';
import type { LogEntry } from '@/models/types';

const entry = (note: string): LogEntry => ({
  date: 'Today 10:00',
  painLevel: 4,
  sleepHours: 7,
  mood: 'OK',
  note,
});

describe('createHealthLogRepository', () => {
  it('hydrates from the default seed on first run', () => {
    const repo = createHealthLogRepository();
    expect(repo.getHistory()).toEqual(defaultHealthLogSeed);
  });

  it('append prepends (newest first) and returns the snapshot', () => {
    const repo = createHealthLogRepository([entry('old')]);
    const history = repo.append(entry('new'));
    expect(history.map((e) => e.note)).toEqual(['new', 'old']);
    expect(Object.isFrozen(history)).toBe(true);
  });

  it('persists appends so a new repository rehydrates them', () => {
    const repo = createHealthLogRepository([]);
    repo.append(entry('kept'));
    const rehydrated = createHealthLogRepository();
    expect(rehydrated.getHistory().map((e) => e.note)).toEqual(['kept']);
  });
});
