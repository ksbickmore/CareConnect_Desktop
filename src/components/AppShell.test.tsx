jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

/**
 * Keyboard-navigation integration suite: mounts the real route tree (screens
 * included) and drives the global shortcuts owned by AppShell. This is the
 * executable form of the project's accessibility requirement that every
 * primary action be reachable and operable by keyboard alone.
 */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderAt, signIn } from '@/test-utils/render';
import { installCareconnectMock } from '@/test-utils/mocks';
import { useAuthStore } from '@/stores/auth-store';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { fakeSpeech } from '@/test-utils/fake-speech';

const heading = (name: string) =>
  screen.findByRole('heading', { level: 1, name });

/**
 * Dispatch a keydown on the currently focused element (or body) so it
 * bubbles through document (Dialog's trap) up to window (AppShell's handler),
 * exactly like a real key press.
 */
const press = (key: string, init: KeyboardEventInit = {}) => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
};

beforeEach(() => {
  signIn();
});

afterEach(() => {
  fakeSpeech.reset();
});

describe('AppShell auth gate', () => {
  it('redirects to the login screen when signed out', async () => {
    useAuthStore.setState({ signedIn: false, email: null });
    renderAt('/dashboard');
    expect(await heading('Welcome back')).toBeInTheDocument();
  });
});

describe('number-key navigation (1-5)', () => {
  it('navigates to each primary screen', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('2');
    expect(await heading('Medications')).toBeInTheDocument();
    press('3');
    expect(await heading('Schedule')).toBeInTheDocument();
    press('4');
    expect(await heading('Messages')).toBeInTheDocument();
    press('5');
    expect(await heading('Health Log')).toBeInTheDocument();
    press('1');
    expect(await heading('Dashboard')).toBeInTheDocument();
  });

  it('moves focus to the new page heading after navigating', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('2');
    const h1 = await heading('Medications');
    expect(h1).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(h1).toHaveFocus());
  });

  it('is suppressed while the user is typing in a field', async () => {
    renderAt('/messages');
    await heading('Messages');

    screen.getByRole('searchbox', { name: 'Search messages' }).focus();
    press('2');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Messages' }),
    ).toBeInTheDocument();
  });

  it('is suppressed when a modifier is held', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('2', { ctrlKey: true });
    press('2', { altKey: true });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
  });
});

describe('shortcut reference overlay (F1 / ?)', () => {
  it('toggles with F1', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('F1');
    expect(
      screen.getByRole('dialog', { name: 'Keyboard Shortcut Reference' }),
    ).toBeInTheDocument();
    press('F1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with ? and closes with Escape', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('?');
    expect(
      screen.getByRole('dialog', { name: 'Keyboard Shortcut Reference' }),
    ).toBeInTheDocument();
    press('Escape');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('emergency shortcut (Ctrl+Shift+E)', () => {
  it('navigates to the Emergency screen', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('E', { ctrlKey: true, shiftKey: true });
    expect(await heading('Emergency (SOS)')).toBeInTheDocument();
  });

  it('works even while typing (life-safety exemption)', async () => {
    renderAt('/messages');
    await heading('Messages');

    screen.getByRole('searchbox', { name: 'Search messages' }).focus();
    press('e', { ctrlKey: true, shiftKey: true });
    expect(await heading('Emergency (SOS)')).toBeInTheDocument();
  });
});

describe('settings shortcut (Ctrl+,)', () => {
  it('navigates to the Settings screen', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press(',', { ctrlKey: true });
    expect(await heading('Settings')).toBeInTheDocument();
  });

  it('works while typing in a field', async () => {
    renderAt('/messages');
    await heading('Messages');

    screen.getByRole('searchbox', { name: 'Search messages' }).focus();
    press(',', { ctrlKey: true });
    expect(await heading('Settings')).toBeInTheDocument();
  });
});

describe('save shortcut (Ctrl+S)', () => {
  it('announces "Nothing to save." on screens without a save action', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('s', { ctrlKey: true });
    expect(useAnnouncerStore.getState().polite).toBe('Nothing to save.');
  });

  it('saves the health log entry, even while typing in the note field', async () => {
    renderAt('/healthlog');
    await heading('Health Log');

    fireEvent.click(screen.getByRole('button', { name: 'Manual entry' }));
    const note = screen.getByLabelText('Note for today');
    fireEvent.change(note, { target: { value: 'Saved via Ctrl+S' } });
    note.focus();

    press('s', { ctrlKey: true });
    expect(useAnnouncerStore.getState().polite).toBe('Entry saved.');
    expect(
      screen.getByRole('region', { name: 'Recent entries' }),
    ).toHaveTextContent('Saved via Ctrl+S');
  });

  it('submits an open add-dialog instead of the screen action', async () => {
    renderAt('/medications');
    await heading('Medications');

    fireEvent.click(screen.getByRole('button', { name: 'Add medication' }));
    const dialog = screen.getByRole('dialog', { name: 'New medication' });

    press('s', { ctrlKey: true });
    // Empty form: the dialog's submit ran and surfaced its validation error.
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Name and dose are both required.',
    );
  });
});

describe('voice command shortcut (Ctrl+Space)', () => {
  // No SpeechRecognition in jsdom, so mic activation surfaces the fallback
  // hint — proving the mic button actually received the click.
  const unavailableHint = () =>
    screen.findByText('Voice input is not available in this environment.');

  it('activates the voice bar mic on the dashboard', async () => {
    fakeSpeech.setAvailable(false);
    renderAt('/dashboard');
    await heading('Dashboard');

    press(' ', { code: 'Space', ctrlKey: true });
    expect(await unavailableHint()).toBeInTheDocument();
  });

  it('activates the voice bar mic on other screens', async () => {
    fakeSpeech.setAvailable(false);
    renderAt('/medications');
    await heading('Medications');

    press(' ', { code: 'Space', ctrlKey: true });
    expect(await unavailableHint()).toBeInTheDocument();
    // Still on Medications — no dashboard redirect.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Medications' }),
    ).toBeInTheDocument();
  });

  it('works while a modal dialog is open', async () => {
    fakeSpeech.setAvailable(false);
    renderAt('/medications');
    await heading('Medications');

    fireEvent.click(screen.getByRole('button', { name: 'Add medication' }));
    expect(
      screen.getByRole('dialog', { name: 'New medication' }),
    ).toBeInTheDocument();

    press(' ', { code: 'Space', ctrlKey: true });
    expect(await unavailableHint()).toBeInTheDocument();
  });
});

describe('continuous voice session', () => {
  it('keeps listening across multiple commands and stops on "stop listening"', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press(' ', { code: 'Space', ctrlKey: true });
    await waitFor(() => expect(fakeSpeech.listening()).toBe(true));

    await act(async () => {
      fakeSpeech.emitFinal('open medications');
      await Promise.resolve();
    });
    expect(await heading('Medications')).toBeInTheDocument();
    expect(fakeSpeech.listening()).toBe(true);

    await act(async () => {
      fakeSpeech.emitFinal('stop listening');
      await Promise.resolve();
    });
    expect(fakeSpeech.listening()).toBe(false);
  });

  it('falls back to clicking a visible button by name', async () => {
    renderAt('/medications');
    await heading('Medications');

    press(' ', { code: 'Space', ctrlKey: true });
    await waitFor(() => expect(fakeSpeech.listening()).toBe(true));
    await act(async () => {
      fakeSpeech.emitFinal('add medication');
      await Promise.resolve();
    });
    expect(
      await screen.findByRole('dialog', { name: 'New medication' }),
    ).toBeInTheDocument();
  });

  it('announces when a nav keyword matches the current route', async () => {
    renderAt('/medications');
    await heading('Medications');

    press(' ', { code: 'Space', ctrlKey: true });
    await waitFor(() => expect(fakeSpeech.listening()).toBe(true));
    await act(async () => {
      fakeSpeech.emitFinal('open medications');
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe('Already on Medications.'),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Medications' }),
    ).toBeInTheDocument();
  });
});

describe('native menu action bridge', () => {
  it('handles shortcuts, emergency, and new-record actions', async () => {
    const bridge = installCareconnectMock();
    try {
      renderAt('/dashboard');
      await heading('Dashboard');

      act(() => bridge.fireMenuAction('shortcuts'));
      expect(
        screen.getByRole('dialog', { name: 'Keyboard Shortcut Reference' }),
      ).toBeInTheDocument();
      press('Escape');

      act(() => bridge.fireMenuAction('emergency'));
      expect(await heading('Emergency (SOS)')).toBeInTheDocument();

      act(() => bridge.fireMenuAction('new-record'));
      expect(await heading('Medications')).toBeInTheDocument();
      expect(
        await screen.findByRole('dialog', { name: 'New medication' }),
      ).toBeInTheDocument();
    } finally {
      bridge.cleanup();
    }
  });

  it('new-appointment opens the add dialog on the Schedule screen', async () => {
    const bridge = installCareconnectMock();
    try {
      renderAt('/dashboard');
      await heading('Dashboard');

      act(() => bridge.fireMenuAction('new-appointment'));
      expect(await heading('Schedule')).toBeInTheDocument();
      expect(
        await screen.findByRole('dialog', { name: 'New appointment' }),
      ).toBeInTheDocument();
    } finally {
      bridge.cleanup();
    }
  });

  it('opens the add dialog even when already on the target screen, and stays closed after Escape', async () => {
    const bridge = installCareconnectMock();
    try {
      renderAt('/medications');
      await heading('Medications');

      act(() => bridge.fireMenuAction('new-record'));
      expect(
        await screen.findByRole('dialog', { name: 'New medication' }),
      ).toBeInTheDocument();

      press('Escape');
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
    } finally {
      bridge.cleanup();
    }
  });

  it('find opens the search overlay and settings navigates to Settings', async () => {
    const bridge = installCareconnectMock();
    try {
      renderAt('/dashboard');
      await heading('Dashboard');

      act(() => bridge.fireMenuAction('find'));
      expect(
        screen.getByRole('dialog', { name: 'Search' }),
      ).toBeInTheDocument();
      press('Escape');

      act(() => bridge.fireMenuAction('settings'));
      expect(await heading('Settings')).toBeInTheDocument();
    } finally {
      bridge.cleanup();
    }
  });

  it('unsubscribes from menu actions on unmount', async () => {
    const bridge = installCareconnectMock();
    try {
      const { unmount } = renderAt('/dashboard');
      await heading('Dashboard');
      unmount();
      expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      bridge.cleanup();
    }
  });
});
