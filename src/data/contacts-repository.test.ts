import {
  createContactsRepository,
  defaultContactsSeed,
} from './contacts-repository';
import type { Contact } from '@/models/types';

const contact = (name: string): Contact => ({
  name,
  relationship: 'Friend',
  initials: name[0].toUpperCase(),
});

describe('createContactsRepository', () => {
  it('hydrates from the default seed on first run', () => {
    const repo = createContactsRepository();
    expect(repo.getAll()).toEqual(defaultContactsSeed);
  });

  it('add appends a new contact', () => {
    const repo = createContactsRepository([contact('Ann')]);
    const all = repo.add(contact('Ben'));
    expect(all.map((c) => c.name)).toEqual(['Ann', 'Ben']);
  });

  it('add rejects duplicate names case-insensitively', () => {
    const repo = createContactsRepository([contact('Ann')]);
    expect(() => repo.add(contact('ann'))).toThrow(
      'Contact "ann" already exists',
    );
  });

  it('persists adds so a new repository rehydrates them', () => {
    const repo = createContactsRepository([contact('Ann')]);
    repo.add(contact('Ben'));
    const rehydrated = createContactsRepository();
    expect(rehydrated.getAll().map((c) => c.name)).toEqual(['Ann', 'Ben']);
  });
});
