import { createMedicationsRepository } from '@/data/medications-repository';
import { failingMedicationsRepo } from '@/test-utils/mocks';
import type { Medication } from '@/models/types';
import { useMedicationsStore } from './medications-store';
import { dataOrNull } from './async';

const med = (id: string): Medication => ({
  id,
  name: id,
  dose: '10 mg',
  schedule: 'Once daily',
  instructions: '',
  status: 'scheduled',
  lastTakenAt: null,
});

const store = () => useMedicationsStore.getState();

describe('useMedicationsStore', () => {
  it('load succeeds with data from the injected repository', async () => {
    store().reset(createMedicationsRepository([med('a'), med('b')]));
    expect(store().medications.status).toBe('loading');
    await store().load();
    expect(dataOrNull(store().medications)?.map((m) => m.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('load folds repository failures into an error state', async () => {
    store().reset(failingMedicationsRepo('db offline'));
    await store().load();
    expect(store().medications).toEqual({ status: 'error', error: 'db offline' });
  });

  it('markTaken updates the snapshot', async () => {
    store().reset(createMedicationsRepository([med('a')]));
    await store().load();
    await store().markTaken('a');
    expect(store().byId('a')?.status).toBe('taken');
  });

  it('add appends new medications', async () => {
    store().reset(createMedicationsRepository([med('a')]));
    await store().load();
    await store().add(med('b'));
    expect(dataOrNull(store().medications)).toHaveLength(2);
  });

  it('add rejects on duplicates and keeps the current snapshot intact', async () => {
    store().reset(createMedicationsRepository([med('a')]));
    await store().load();
    await expect(store().add(med('a'))).rejects.toThrow('already exists');
    // The ledger is untouched — the form surfaces the error inline instead.
    expect(dataOrNull(store().medications)).toHaveLength(1);
  });

  it('byId returns null before load and for unknown ids', async () => {
    store().reset(createMedicationsRepository([med('a')]));
    expect(store().byId('a')).toBeNull(); // still loading
    await store().load();
    expect(store().byId('a')?.id).toBe('a');
    expect(store().byId('zzz')).toBeNull();
  });
});
