import { create } from 'zustand';

import {
  createContactsRepository,
  type ContactsRepository,
} from '@/data/contacts-repository';
import type { Contact } from '@/models/types';

/**
 * Care-team contacts store, ported from the mobile app. Synchronous (no Async
 * wrapper) because the repository is synchronous. Messages and Emergency
 * screens read this store — the first contact is the primary caregiver.
 */
interface ContactsStore {
  readonly contacts: readonly Contact[];
  /**
   * Append a new contact. Throws if the name collides (the form catches it and
   * shows an inline error); on success the grid updates immediately.
   */
  add(contact: Contact): void;
  /** Replace the backing repository and reset state. Used by tests. */
  reset(repo?: ContactsRepository): void;
}

let repository = createContactsRepository();

export const useContactsStore = create<ContactsStore>()((set) => ({
  contacts: repository.getAll(),

  add(contact) {
    set({ contacts: repository.add(contact) });
  },

  reset(repo) {
    repository = repo ?? createContactsRepository();
    set({ contacts: repository.getAll() });
  },
}));
