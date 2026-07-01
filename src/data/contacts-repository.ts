import type { Contact } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'contacts';

/**
 * Access to the user's care-team contacts, ported from the mobile app.
 * Synchronous because contacts are tiny and realistically cached on-device;
 * persisted to localStorage so added contacts survive a restart.
 */
export interface ContactsRepository {
  getAll(): readonly Contact[];
  /** Appends a new contact. Throws if its name collides (case-insensitive). */
  add(contact: Contact): readonly Contact[];
}

// First entry is treated as the primary caregiver by the Emergency screen.
export const defaultContactsSeed: readonly Contact[] = [
  { name: 'Sarah Vance', relationship: 'Daughter · Caregiver', initials: 'SV' },
  { name: 'Dr. Park', relationship: 'Primary physician', initials: 'DP' },
  { name: 'Nurse', relationship: 'Clinic Nurse Desk', initials: 'N' },
  { name: 'Michael Kim', relationship: 'Son', initials: 'MK' },
];

export function createContactsRepository(
  seed: readonly Contact[] = loadJSON(STORAGE_KEY, defaultContactsSeed),
): ContactsRepository {
  const contacts: Contact[] = [...seed];
  const persist = () => saveJSON(STORAGE_KEY, contacts);
  const snapshot = () => Object.freeze([...contacts]);

  return {
    getAll: () => snapshot(),

    add(contact) {
      // Reject duplicates by name so the Add Contact form can surface an
      // inline error rather than silently creating a second tile.
      const name = contact.name.trim().toLowerCase();
      if (contacts.some((c) => c.name.trim().toLowerCase() === name)) {
        throw new Error(`Contact "${contact.name}" already exists`);
      }
      contacts.push(contact);
      persist();
      return snapshot();
    },
  };
}
