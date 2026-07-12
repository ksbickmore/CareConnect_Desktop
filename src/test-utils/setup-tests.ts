/**
 * Global Jest setup (registered via setupFilesAfterEnv). Fills the jsdom gaps
 * the renderer actually hits and resets all singleton zustand stores between
 * tests so state never leaks across test cases.
 *
 * Deliberately NOT stubbed here: `window.careconnect` and `SpeechRecognition`.
 * Their absence is a real production code path (plain browser / no speech
 * support); tests that need them install mocks from `./mocks`.
 */
import '@testing-library/jest-dom';

import { useAnnouncerStore } from '@/stores/announcer-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useAuthStore } from '@/stores/auth-store';
import { useContactsStore } from '@/stores/contacts-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useVoiceNotesStore } from '@/stores/voice-notes-store';
import { useSearchStore } from '@/stores/search-store';
import { useSaveActionsStore } from '@/lib/save-actions';

// jsdom does not implement object URLs; the Health Log export path needs them.
if (typeof URL.createObjectURL === 'undefined') {
  Object.assign(URL, {
    createObjectURL: jest.fn(() => 'blob:mock'),
    revokeObjectURL: jest.fn(),
  });
}

// jsdom lacks speechSynthesis; MessagesScreen guards on typeof, so provide a
// spy-able mock so the read-aloud action can be asserted.
Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  value: { speak: jest.fn(), cancel: jest.fn() },
});

// jsdom also lacks the utterance constructor the read-aloud path news up.
class FakeUtterance {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: FakeUtterance,
});

beforeEach(() => {
  localStorage.clear();
  useMedicationsStore.getState().reset();
  useAppointmentsStore.getState().reset();
  useMessagesStore.getState().reset();
  useHealthLogStore.getState().reset();
  useContactsStore.getState().reset();
  useVoiceNotesStore.getState().reset();
  useSettingsStore.getState().reset();
  useSearchStore.setState({ open: false });
  useSaveActionsStore.setState({ entries: [] });
  document.body.style.zoom = '';
  delete document.documentElement.dataset.reducedMotion;
  // auth-store has no reset(); announcer keeps only live-region text.
  useAuthStore.setState({ signedIn: false, email: null });
  useAnnouncerStore.setState({
    polite: '',
    politeNonce: 0,
    assertive: '',
    assertiveNonce: 0,
  });
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});
