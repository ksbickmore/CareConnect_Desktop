import type { Contact } from '@/models/types';

/**
 * Access to the user's care-team contacts, ported from the mobile app.
 * Synchronous because contacts are tiny and realistically cached on-device.
 * Read-only: the desktop build has no add/edit contact flow, so the list is
 * the seed (or an injected test seed).
 */
export interface ContactsRepository {
  getAll(): readonly Contact[];
}

// First entry is treated as the primary caregiver by the Emergency screen.
export const defaultContactsSeed: readonly Contact[] = [
  { name: 'Sarah Vance', relationship: 'Daughter · Caregiver', initials: 'SV' },
  { name: 'Dr. Park', relationship: 'Primary physician', initials: 'DP' },
  { name: 'Nurse', relationship: 'Clinic Nurse Desk', initials: 'N' },
  { name: 'Michael Kim', relationship: 'Son', initials: 'MK' },
];

export function createContactsRepository(
  seed: readonly Contact[] = defaultContactsSeed,
): ContactsRepository {
  const snapshot = Object.freeze([...seed]);
  return { getAll: () => snapshot };
}
