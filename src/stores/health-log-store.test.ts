import { createHealthLogRepository } from '@/data/health-log-repository';
import {
  PAIN_MAX,
  PAIN_MIN,
  SLEEP_MAX,
  SLEEP_MIN,
  useHealthLogStore,
} from './health-log-store';

const store = () => useHealthLogStore.getState();

beforeEach(() => {
  store().reset(createHealthLogRepository([]));
});

describe('useHealthLogStore', () => {
  it('starts from the neutral defaults', () => {
    expect(store().painLevel).toBe(6);
    expect(store().sleepHours).toBe(7);
    expect(store().mood).toBe('OK');
    expect(store().history).toEqual([]);
  });

  it('clamps pain to its bounds', () => {
    for (let i = 0; i < 20; i++) store().incrementPain();
    expect(store().painLevel).toBe(PAIN_MAX);
    for (let i = 0; i < 30; i++) store().decrementPain();
    expect(store().painLevel).toBe(PAIN_MIN);
  });

  it('clamps sleep to its bounds', () => {
    for (let i = 0; i < 20; i++) store().incrementSleep();
    expect(store().sleepHours).toBe(SLEEP_MAX);
    for (let i = 0; i < 30; i++) store().decrementSleep();
    expect(store().sleepHours).toBe(SLEEP_MIN);
  });

  it('setMood replaces the mood label', () => {
    store().setMood('Good');
    expect(store().mood).toBe('Good');
  });

  it('addEntry captures the current reading and resets the controls', () => {
    store().incrementPain(); // 7
    store().setMood('Low');
    const now = new Date(2026, 5, 9, 14, 32).getTime();
    store().addEntry({ note: '  Sore wrist.  ', now });

    expect(store().history).toHaveLength(1);
    expect(store().history[0]).toEqual({
      date: 'Today 14:32',
      painLevel: 7,
      sleepHours: 7,
      mood: 'Low',
      note: 'Sore wrist.',
    });
    // Controls reset to defaults.
    expect(store().painLevel).toBe(6);
    expect(store().mood).toBe('OK');
  });

  it('addEntry substitutes a default note for blank input', () => {
    store().addEntry({ note: '   ', now: Date.now() });
    expect(store().history[0].note).toBe('Logged from desktop.');
  });

  it('prepends newer entries', () => {
    store().addEntry({ note: 'first', now: Date.now() });
    store().addEntry({ note: 'second', now: Date.now() });
    expect(store().history.map((e) => e.note)).toEqual(['second', 'first']);
  });

  it('setPain and setSleep clamp to bounds', () => {
    const store = useHealthLogStore.getState();
    store.setPain(4);
    expect(useHealthLogStore.getState().painLevel).toBe(4);
    store.setPain(99);
    expect(useHealthLogStore.getState().painLevel).toBe(PAIN_MAX);
    store.setSleep(-3);
    expect(useHealthLogStore.getState().sleepHours).toBe(SLEEP_MIN);
  });
});
