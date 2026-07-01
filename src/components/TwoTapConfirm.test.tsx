import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
