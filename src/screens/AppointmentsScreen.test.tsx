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

  it('sets the date and time fields by voice', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new appointment'));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('date july fifth 2027'));
    expect(screen.getByLabelText('Date')).toHaveValue('2027-07-05');
    act(() => fakeSpeech.emitFinal('time 2 30 pm'));
    expect(screen.getByLabelText('Time')).toHaveValue('14:30');
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe('Time set to 2:30 PM.'),
    );
  });

  it('announces when a spoken date or time is not understood', async () => {
    const user = userEvent.setup();
    renderAt('/appointments');
    await screen.findByRole('heading', { level: 1, name: 'Schedule' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new appointment'));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeInTheDocument();
    const dateBefore = (screen.getByLabelText('Date') as HTMLInputElement).value;
    act(() => fakeSpeech.emitFinal('date banana'));
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toContain('catch a date'),
    );
    expect(screen.getByLabelText('Date')).toHaveValue(dateBefore);
    act(() => fakeSpeech.emitFinal('time banana'));
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toContain('catch a time'),
    );
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
