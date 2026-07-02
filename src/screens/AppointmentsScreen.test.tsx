jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signIn } from '@/test-utils/render';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { fakeSpeech } from '@/test-utils/fake-speech';

describe('voice commands', () => {
  beforeEach(() => {
    signIn();
  });

  afterEach(() => {
    fakeSpeech.reset();
  });

  it('switches calendar views and steps periods', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('month view'));
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    act(() => fakeSpeech.emitFinal('day view'));
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('creates an appointment by voice', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new appointment'));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('title Hand Therapy'));
    expect(screen.getByLabelText('Title')).toHaveValue('Hand Therapy');
    act(() => fakeSpeech.emitFinal('save'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('blocks voice save when the title is empty', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new appointment'));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('save'));
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe('Title is required.'),
    );
    expect(screen.getByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
  });

  it('does not step the calendar when a form dialog is open', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    const rangeBefore = screen.getByText(/^Week of /).textContent;
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new appointment'));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('next'));
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe(
        'Say next field to move within the form.',
      ),
    );
    expect(screen.getByText(/^Week of /).textContent).toBe(rangeBefore);
  });
});
