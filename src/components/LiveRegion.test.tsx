import { act, render, screen } from '@testing-library/react';
import { LiveRegion } from './LiveRegion';
import { useAnnouncerStore } from '@/stores/announcer-store';

const announce = (message: string, options?: { assertive?: boolean }) =>
  act(() => useAnnouncerStore.getState().announce(message, options));

const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe('LiveRegion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('shows an announcement only after the settle delay (own commit for NVDA)', () => {
    render(<LiveRegion />);
    announce('Entry saved.');
    expect(screen.getByRole('status')).toHaveTextContent('');

    advance(150);
    expect(screen.getByRole('status')).toHaveTextContent('Entry saved.');
  });

  it('re-fires when the same message is announced twice', () => {
    render(<LiveRegion />);
    announce('Entry saved.');
    advance(150);
    expect(screen.getByRole('status')).toHaveTextContent('Entry saved.');

    announce('Entry saved.');
    // Cleared on the next tick — this DOM change is what makes NVDA re-announce…
    advance(10);
    expect(screen.getByRole('status')).toHaveTextContent('');
    // …then set again after the delay.
    advance(150);
    expect(screen.getByRole('status')).toHaveTextContent('Entry saved.');
  });

  it('a newer announcement supersedes one still in flight', () => {
    render(<LiveRegion />);
    announce('First.');
    advance(50);
    announce('Second.');
    advance(150);
    expect(screen.getByRole('status')).toHaveTextContent('Second.');
  });

  it('routes assertive announcements to the alert region', () => {
    render(<LiveRegion />);
    announce('Emergency sent.', { assertive: true });
    advance(150);
    expect(screen.getByRole('alert')).toHaveTextContent('Emergency sent.');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
