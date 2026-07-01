import { createMedicationsRepository } from './medications-repository';
import type { Medication } from '@/models/types';

const med = (id: string, status: Medication['status'] = 'scheduled'): Medication => ({
  id,
  name: id,
  dose: '10 mg',
  schedule: 'Once daily',
  instructions: 'With water.',
  status,
  lastTakenAt: null,
});

describe('createMedicationsRepository', () => {
  it('returns a frozen snapshot of the seed', async () => {
    const repo = createMedicationsRepository([med('a'), med('b')]);
    const all = await repo.getAll();
    expect(all.map((m) => m.id)).toEqual(['a', 'b']);
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('markTaken stamps status, lastTakenAt, and labels', async () => {
    const repo = createMedicationsRepository([med('a')]);
    const [taken] = await repo.markTaken('a');
    expect(taken.status).toBe('taken');
    expect(typeof taken.lastTakenAt).toBe('number');
    expect(taken.takenAtLabel).toBeDefined();
    expect(taken.timeLabel).toBe(`Taken at ${taken.takenAtLabel}`);
  });

  it('markTaken rejects for an unknown id', async () => {
    const repo = createMedicationsRepository([med('a')]);
    await expect(repo.markTaken('nope')).rejects.toThrow(
      'No medication with id "nope"',
    );
  });

  it('add appends a new medication', async () => {
    const repo = createMedicationsRepository([med('a')]);
    const all = await repo.add(med('b'));
    expect(all.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('add rejects on a duplicate id', async () => {
    const repo = createMedicationsRepository([med('a')]);
    await expect(repo.add(med('a'))).rejects.toThrow('already exists');
  });

  it('persists mutations so a new repository rehydrates them', async () => {
    const repo = createMedicationsRepository([med('a')]);
    await repo.add(med('b'));
    const rehydrated = createMedicationsRepository(); // reads localStorage
    const all = await rehydrated.getAll();
    expect(all.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
