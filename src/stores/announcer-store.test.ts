import { useAnnouncerStore } from './announcer-store';

const flushMicrotasks = () => Promise.resolve();

describe('useAnnouncerStore', () => {
  it('routes plain announcements to the polite region', async () => {
    useAnnouncerStore.getState().announce('Saved.');
    await flushMicrotasks();
    expect(useAnnouncerStore.getState().polite).toBe('Saved.');
    expect(useAnnouncerStore.getState().assertive).toBe('');
  });

  it('routes assertive announcements to the assertive region', async () => {
    useAnnouncerStore.getState().announce('Emergency sent.', { assertive: true });
    await flushMicrotasks();
    expect(useAnnouncerStore.getState().assertive).toBe('Emergency sent.');
    expect(useAnnouncerStore.getState().polite).toBe('');
  });

  it('clears synchronously so repeating a message re-fires the live region', async () => {
    useAnnouncerStore.getState().announce('Same text');
    await flushMicrotasks();
    useAnnouncerStore.getState().announce('Same text');
    // Cleared immediately (this is what makes screen readers re-announce)…
    expect(useAnnouncerStore.getState().polite).toBe('');
    // …and set again on the microtask queue.
    await flushMicrotasks();
    expect(useAnnouncerStore.getState().polite).toBe('Same text');
  });
});
