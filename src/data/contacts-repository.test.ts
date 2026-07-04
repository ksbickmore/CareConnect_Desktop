import {
  createContactsRepository,
  defaultContactsSeed,
} from './contacts-repository';

describe('createContactsRepository', () => {
  it('hydrates from the default seed on first run', () => {
    const repo = createContactsRepository();
    expect(repo.getAll()).toEqual(defaultContactsSeed);
  });

  it('returns a frozen snapshot', () => {
    const repo = createContactsRepository();
    expect(Object.isFrozen(repo.getAll())).toBe(true);
  });
});
