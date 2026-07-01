import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyScreen } from './EmergencyScreen';
import { createContactsRepository } from '@/data/contacts-repository';
import { useContactsStore } from '@/stores/contacts-store';

const caregiver = {
  name: 'Sarah Vance',
  relationship: 'Daughter · Caregiver',
  initials: 'SV',
};

const setup = () => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  useContactsStore.getState().reset(createContactsRepository([caregiver]));
  render(<EmergencyScreen />);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
};

const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe('EmergencyScreen', () => {
  it('arms a target on the first tap and shows the confirm hint', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('button', { name: 'Call emergency services — 911' }),
    );
    expect(screen.getByText('Tap again to call 911')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('starts the countdown on the second tap and focuses Cancel', async () => {
    const user = setup();
    const target = screen.getByRole('button', {
      name: 'Call emergency services — 911',
    });
    await user.click(target);
    await user.click(target);

    const countdown = screen.getByRole('alertdialog', {
      name: 'Emergency countdown',
    });
    expect(countdown).toHaveTextContent('Calling 911 in 5…');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('counts down each second and escalates to the connecting overlay', async () => {
    const user = setup();
    const target = screen.getByRole('button', {
      name: 'Call emergency services — 911',
    });
    await user.click(target);
    await user.click(target);

    tick(1000);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Calling 911 in 4…');
    tick(1000);
    tick(1000);
    tick(1000);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Calling 911 in 1…');
    tick(1000);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Connecting to 911' }),
    ).toBeInTheDocument();
  });

  it('cancels the countdown mid-count', async () => {
    const user = setup();
    const target = screen.getByRole('button', {
      name: 'Call emergency services — 911',
    });
    await user.click(target);
    await user.click(target);
    tick(2000);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // No escalation after the original window would have elapsed.
    tick(5000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers the primary caregiver as the second two-tap target', async () => {
    const user = setup();
    const target = screen.getByRole('button', {
      name: 'Call Sarah Vance, primary caregiver',
    });
    await user.click(target);
    expect(screen.getByText('Tap again to call Sarah Vance')).toBeInTheDocument();
    await user.click(target);
    expect(
      screen.getByRole('alertdialog', { name: 'Emergency countdown' }),
    ).toHaveTextContent('Calling Sarah Vance in 5…');
  });

  it('disables the caregiver target when no contact exists', () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    useContactsStore.getState().reset(createContactsRepository([]));
    render(<EmergencyScreen />);

    const target = screen.getByRole('button', { name: 'No caregiver set' });
    expect(target).toBeDisabled();
    expect(
      screen.getByText('Add a contact to enable speed dial'),
    ).toBeInTheDocument();
  });
});
