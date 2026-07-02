jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signIn } from '@/test-utils/render';
import { fakeSpeech } from '@/test-utils/fake-speech';

beforeEach(() => {
  signIn();
});

afterEach(() => {
  fakeSpeech.reset();
});

describe('DashboardScreen', () => {
  it('renders the summary widgets from the seeded stores', async () => {
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(screen.getByText('Good morning, demo 👋')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: "Today's stats" }),
    ).toBeInTheDocument();
    // Default medications seed: Lisinopril is the next due medication.
    expect(await screen.findByText('Lisinopril 10 mg')).toBeInTheDocument();
    expect(screen.getByText('MEDS TODAY')).toBeInTheDocument();
  });

  it('shows the unavailable hint when voice input is missing', async () => {
    fakeSpeech.setAvailable(false);
    const user = userEvent.setup();
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Start voice command' }));
    expect(
      screen.getByText('Voice input is not available in this environment.'),
    ).toBeInTheDocument();
  });

  it('navigates when a recognized command is spoken', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Start voice command' }));
    act(() => {
      fakeSpeech.emitFinal('open medications');
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Medications' }),
    ).toBeInTheDocument();
  });

  it('surfaces a hint for unrecognized commands and stays put', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Start voice command' }));
    act(() => {
      fakeSpeech.emitFinal('sing a song');
      fakeSpeech.emitEnd();
    });

    expect(
      await screen.findByText('Heard: "sing a song" — try saying a screen name.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
  });
});
