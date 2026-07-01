import { create } from 'zustand';

import type { VoiceNote } from '@/models/types';

/**
 * In-memory store of voice notes captured on the Health Log / Medications
 * screens, ported from the mobile app. Stores the duration + timestamp of each
 * recording so the UI can confirm the start/stop action took effect — every
 * button must produce a visible change, and an entry here is what changes.
 */
interface VoiceNotesStore {
  readonly notes: readonly VoiceNote[];

  /** Prepend so the most recent recording shows at the top of the list. */
  add(note: VoiceNote): void;
  /** Clear all notes. Used by tests. */
  reset(): void;
}

export const useVoiceNotesStore = create<VoiceNotesStore>()((set, get) => ({
  notes: [],

  add(note) {
    set({ notes: [note, ...get().notes] });
  },

  reset() {
    set({ notes: [] });
  },
}));
