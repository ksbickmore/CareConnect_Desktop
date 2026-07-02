jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthLogScreen } from './HealthLogScreen';
import { dispatchVoiceCommand } from '@/lib/voice/voice-registry';
import { createHealthLogRepository } from '@/data/health-log-repository';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { renderAt, signIn } from '@/test-utils/render';
import { fakeSpeech } from '@/test-utils/fake-speech';

beforeEach(() => {
  useHealthLogStore.getState().reset(createHealthLogRepository([]));
});

describe('HealthLogScreen', () => {
  it('adjusts pain via the stepper and updates the descriptor', async () => {
    const user = userEvent.setup();
    render(<HealthLogScreen />);

    expect(screen.getByText('Moderate–severe · 6/10')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Increase Wrist pain level' }),
    );
    expect(
      screen.getByRole('spinbutton', { name: 'Wrist pain level' }),
    ).toHaveAttribute('aria-valuenow', '7');
    expect(screen.getByText('Moderate–severe · 7/10')).toBeInTheDocument();
  });

  it('selects a mood chip with aria-pressed feedback', async () => {
    const user = userEvent.setup();
    render(<HealthLogScreen />);

    expect(screen.getByRole('button', { name: 'OK' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(screen.getByRole('button', { name: 'Good' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'OK' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('saves a manual entry into Recent Entries and resets the controls', async () => {
    const user = userEvent.setup();
    render(<HealthLogScreen />);

    expect(
      screen.getByText('No entries yet — save your first above.'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Increase Wrist pain level' }),
    ); // 7
    await user.click(screen.getByRole('button', { name: 'Manual entry' }));
    await user.type(
      screen.getByLabelText('Note for today'),
      'Wrist ache after typing',
    );
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    const recent = screen.getByRole('region', { name: 'Recent entries' });
    expect(recent).toHaveTextContent('Pain 7/10');
    expect(recent).toHaveTextContent('Wrist ache after typing');
    // Controls reset to defaults after saving.
    expect(
      screen.getByRole('spinbutton', { name: 'Wrist pain level' }),
    ).toHaveAttribute('aria-valuenow', '6');
    expect(screen.queryByLabelText('Note for today')).not.toBeInTheDocument();
  });

  it('exports the log as a text file download', async () => {
    const user = userEvent.setup();
    let anchor: HTMLAnchorElement | null = null;
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        anchor = this;
      });

    render(<HealthLogScreen />);
    await user.click(screen.getByRole('button', { name: 'Manual entry' }));
    await user.type(screen.getByLabelText('Note for today'), 'Exported note');
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    await user.click(screen.getByRole('button', { name: 'Export log' }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain');
    expect(anchor).not.toBeNull();
    expect(anchor!.download).toBe('careconnect-health-log.txt');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe('Health log exported.'),
    );

    clickSpy.mockRestore();
  });
});

describe('voice commands', () => {
  beforeEach(() => {
    signIn();
  });

  afterEach(() => {
    fakeSpeech.reset();
  });

  it('sets pain by voice with a word number', async () => {
    const user = userEvent.setup();
    renderAt('/healthlog');
    await screen.findByRole('heading', { level: 1, name: 'Health Log' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('set pain to five'));
    expect(
      screen.getByRole('spinbutton', { name: 'Wrist pain level' }),
    ).toHaveAttribute('aria-valuenow', '5');
  });

  it('steps values and picks mood', async () => {
    const user = userEvent.setup();
    renderAt('/healthlog');
    await screen.findByRole('heading', { level: 1, name: 'Health Log' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('pain up'));
    expect(
      screen.getByRole('spinbutton', { name: 'Wrist pain level' }),
    ).toHaveAttribute('aria-valuenow', '7'); // default 6 + 1
    act(() => fakeSpeech.emitFinal('mood good'));
    expect(screen.getByRole('button', { name: 'Good' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('announces clamped pain when setting above the maximum', async () => {
    renderAt('/healthlog');
    await screen.findByRole('heading', { level: 1, name: 'Health Log' });

    act(() => {
      const result = dispatchVoiceCommand('set pain to 99');
      expect(result.handled).toBe(true);
      expect(result.feedback).toBe('Pain 10 of 10.');
    });
    expect(
      screen.getByRole('spinbutton', { name: 'Wrist pain level' }),
    ).toHaveAttribute('aria-valuenow', '10');
  });

  it('dictates a note and saves the entry', async () => {
    const user = userEvent.setup();
    renderAt('/healthlog');
    await screen.findByRole('heading', { level: 1, name: 'Health Log' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('note wrist feels better'));
    expect(screen.getByLabelText('Note for today')).toHaveValue('wrist feels better');
    act(() => fakeSpeech.emitFinal('save entry'));
    expect(await screen.findByText(/wrist feels better/)).toBeInTheDocument();
  });
});
