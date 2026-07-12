import { useAnnouncerStore } from './announcer-store';

describe('useAnnouncerStore', () => {
  it('routes plain announcements to the polite region synchronously', () => {
    useAnnouncerStore.getState().announce('Saved.');
    expect(useAnnouncerStore.getState().polite).toBe('Saved.');
    expect(useAnnouncerStore.getState().assertive).toBe('');
  });

  it('routes assertive announcements to the assertive region synchronously', () => {
    useAnnouncerStore.getState().announce('Emergency sent.', { assertive: true });
    expect(useAnnouncerStore.getState().assertive).toBe('Emergency sent.');
    expect(useAnnouncerStore.getState().polite).toBe('');
  });

  it('bumps the nonce on every call so repeats are observable as new announcements', () => {
    useAnnouncerStore.getState().announce('Same text');
    const first = useAnnouncerStore.getState().politeNonce;
    useAnnouncerStore.getState().announce('Same text');
    // Text stays set synchronously; the nonce is what LiveRegion re-fires on.
    expect(useAnnouncerStore.getState().polite).toBe('Same text');
    expect(useAnnouncerStore.getState().politeNonce).toBe(first + 1);
    expect(useAnnouncerStore.getState().assertiveNonce).toBe(0);
  });
});
