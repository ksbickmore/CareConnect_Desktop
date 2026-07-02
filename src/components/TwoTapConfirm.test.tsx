import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dispatchVoiceCommand } from '@/lib/voice/voice-registry';
import { TwoTapConfirm } from './TwoTapConfirm';
import { useAnnouncerStore } from '@/stores/announcer-store';

const setup = (props: Partial<React.ComponentProps<typeof TwoTapConfirm>> = {}) => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const onConfirmed = jest.fn();
  render(
    <TwoTapConfirm
      idleLabel="Confirm taken"
      confirmLabel="Tap again to confirm"
      onConfirmed={onConfirmed}
      {...props}
    />,
  );
  return { user, onConfirmed };
};

describe('TwoTapConfirm', () => {
  it('arms on the first activation and announces it', async () => {
    const { user, onConfirmed } = setup();
    await user.click(screen.getByRole('button', { name: 'Confirm taken' }));

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Tap again to confirm' }),
    ).toBeInTheDocument();
    expect(useAnnouncerStore.getState().polite).toBe('Tap again to confirm.');
  });

  it('confirms on the second activation within the window', async () => {
    const { user, onConfirmed } = setup();
    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    // Back to the idle state after confirming.
    expect(screen.getByRole('button', { name: 'Confirm taken' })).toBeInTheDocument();
  });

  it('is fully keyboard-operable (Enter to arm and confirm)', async () => {
    const { user, onConfirmed } = setup();
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('auto-disarms after the timeout without confirming', async () => {
    const { user, onConfirmed } = setup();
    await user.click(screen.getByRole('button'));
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByRole('button', { name: 'Confirm taken' })).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(onConfirmed).not.toHaveBeenCalled(); // that click only re-armed it
  });

  it('honors a custom disarm window', async () => {
    const { user } = setup({ disarmAfterMs: 1000 });
    await user.click(screen.getByRole('button'));
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', { name: 'Confirm taken' })).toBeInTheDocument();
  });

  it('disarms on blur to prevent accidental confirms', async () => {
    const { user, onConfirmed } = setup();
    const button = screen.getByRole('button');
    await user.click(button);
    act(() => {
      button.blur();
    });
    expect(screen.getByRole('button', { name: 'Confirm taken' })).toBeInTheDocument();
    await user.click(button);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('ignores activation while disabled', async () => {
    const { user, onConfirmed } = setup({ disabled: true });
    await user.click(screen.getByRole('button'));
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm taken' })).toBeDisabled();
  });
});

describe('voice arming', () => {
  it('arms on a voice phrase and confirms on "confirm"', () => {
    const onConfirmed = jest.fn();
    render(
      <TwoTapConfirm
        idleLabel="Confirm taken"
        confirmLabel="Tap again to confirm"
        onConfirmed={onConfirmed}
        voicePhrases={['confirm taken']}
      />,
    );
    act(() => {
      expect(dispatchVoiceCommand('confirm taken').handled).toBe(true);
    });
    expect(screen.getByRole('button')).toHaveTextContent('Tap again to confirm');
    act(() => {
      expect(dispatchVoiceCommand('confirm').handled).toBe(true);
    });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('voice arm uses the longer 10s window', () => {
    jest.useFakeTimers();
    const onConfirmed = jest.fn();
    render(
      <TwoTapConfirm
        idleLabel="Confirm taken"
        confirmLabel="Tap again to confirm"
        onConfirmed={onConfirmed}
        voicePhrases={['confirm taken']}
      />,
    );
    act(() => {
      dispatchVoiceCommand('confirm taken');
    });
    act(() => {
      jest.advanceTimersByTime(9000); // beyond the 4s click window
    });
    expect(screen.getByRole('button')).toHaveTextContent('Tap again to confirm');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button')).toHaveTextContent('Confirm taken');
    jest.useRealTimers();
  });

  it('"cancel" disarms without confirming', () => {
    const onConfirmed = jest.fn();
    render(
      <TwoTapConfirm
        idleLabel="Confirm taken"
        confirmLabel="Tap again to confirm"
        onConfirmed={onConfirmed}
        voicePhrases={['confirm taken']}
      />,
    );
    act(() => {
      dispatchVoiceCommand('confirm taken');
    });
    act(() => {
      dispatchVoiceCommand('cancel');
    });
    expect(screen.getByRole('button')).toHaveTextContent('Confirm taken');
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('registers nothing without voicePhrases', () => {
    render(
      <TwoTapConfirm
        idleLabel="Confirm taken"
        confirmLabel="Tap again to confirm"
        onConfirmed={jest.fn()}
      />,
    );
    expect(dispatchVoiceCommand('confirm taken').handled).toBe(false);
  });
});
