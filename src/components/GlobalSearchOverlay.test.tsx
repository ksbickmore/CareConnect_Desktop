jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

/**
 * Global search (Ctrl+F) integration suite: mounts the real route tree so
 * activating a result exercises navigation + selection on the target screen.
 */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signIn } from '@/test-utils/render';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { fakeSpeech } from '@/test-utils/fake-speech';

const heading = (name: string) =>
  screen.findByRole('heading', { level: 1, name });

const press = (key: string, init: KeyboardEventInit = {}) => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
};

const searchDialog = () => screen.findByRole('dialog', { name: 'Search' });
const searchBox = () =>
  screen.getByRole('searchbox', {
    name: 'Search records, medications, appointments, and messages',
  });

beforeEach(() => {
  signIn();
});

afterEach(() => {
  fakeSpeech.reset();
});

/** Start the continuous voice session and speak one utterance. */
const speak = async (utterance: string) => {
  if (!fakeSpeech.listening()) {
    press(' ', { code: 'Space', ctrlKey: true });
    await waitFor(() => expect(fakeSpeech.listening()).toBe(true));
  }
  await act(async () => {
    fakeSpeech.emitFinal(utterance);
    await Promise.resolve();
  });
};

describe('GlobalSearchOverlay', () => {
  it('opens with Ctrl+F, focuses the input, and closes with Escape', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    press('f', { ctrlKey: true });
    expect(await searchDialog()).toBeInTheDocument();
    await waitFor(() => expect(searchBox()).toHaveFocus());

    press('Escape');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens even while typing in a field', async () => {
    renderAt('/messages');
    await heading('Messages');

    screen.getByRole('searchbox', { name: 'Search messages' }).focus();
    press('F', { ctrlKey: true });
    expect(await searchDialog()).toBeInTheDocument();
  });

  it('opens from the Dashboard search button', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await heading('Dashboard');

    await user.click(
      screen.getByRole('button', { name: /Search records, meds/ }),
    );
    expect(await searchDialog()).toBeInTheDocument();
  });

  it('finds matches across categories and announces the count', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAt('/dashboard');
    await heading('Dashboard');

    press('f', { ctrlKey: true });
    const dialog = within(await searchDialog());
    await user.type(searchBox(), 'park');

    // Lisinopril (instructions mention Dr. Park) + the "Dr. Park follow-up"
    // appointment + the "Dr. Park" conversation.
    expect(dialog.getByText('Medications')).toBeInTheDocument();
    expect(dialog.getByText('Appointments')).toBeInTheDocument();
    expect(dialog.getByText('Dr. Park follow-up')).toBeInTheDocument();
    expect(dialog.getByText('Messages')).toBeInTheDocument();
    expect(dialog.getByText('3 results')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(350));
    expect(useAnnouncerStore.getState().polite).toBe('3 results for park.');
    jest.useRealTimers();
  });

  it('navigates to Medications with the matching item selected', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await heading('Dashboard');

    press('f', { ctrlKey: true });
    const dialog = within(await searchDialog());
    await user.type(searchBox(), 'aspirin');
    await user.click(await dialog.findByRole('button', { name: /Aspirin/ }));

    expect(await heading('Medications')).toBeInTheDocument();
    // The detail panel shows the selected medication ("Aspirin 81mg …").
    expect(
      await screen.findByRole('heading', { level: 2, name: /Aspirin/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens by voice with the spoken query pre-filled', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    await speak('search aspirin');
    const dialog = within(await searchDialog());
    expect(searchBox()).toHaveValue('aspirin');
    expect(dialog.getByText(/Aspirin/)).toBeInTheDocument();
  });

  it('opens by voice with the bare word "search"', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    await speak('search');
    expect(await searchDialog()).toBeInTheDocument();
    expect(searchBox()).toHaveValue('');
  });

  it('supports voice inside the overlay: search, open result, clear', async () => {
    renderAt('/dashboard');
    await heading('Dashboard');

    await speak('find');
    await searchDialog();

    await speak('search park');
    expect(searchBox()).toHaveValue('park');

    await speak('clear search');
    expect(searchBox()).toHaveValue('');

    await speak('search aspirin');
    await speak('open aspirin');
    expect(await heading('Medications')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: /Aspirin/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports arrow-key navigation from the input into the results', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await heading('Dashboard');

    press('f', { ctrlKey: true });
    const dialog = within(await searchDialog());
    await user.type(searchBox(), 'aspirin');
    const result = await dialog.findByRole('button', { name: /Aspirin/ });

    fireEvent.keyDown(searchBox(), { key: 'ArrowDown' });
    expect(result).toHaveFocus();
    fireEvent.keyDown(result, { key: 'ArrowUp' });
    expect(searchBox()).toHaveFocus();
  });
});
