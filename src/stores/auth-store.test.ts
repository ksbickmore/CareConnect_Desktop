import { useAuthStore } from './auth-store';

const store = () => useAuthStore.getState();

describe('useAuthStore', () => {
  it('starts signed out', () => {
    expect(store().signedIn).toBe(false);
    expect(store().email).toBeNull();
  });

  it('rejects an empty email', () => {
    expect(store().signIn('   ', 'secret')).toBe(false);
    expect(store().signedIn).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(store().signIn('demo@careconnect.app', '')).toBe(false);
    expect(store().signedIn).toBe(false);
  });

  it('signs in and trims the email', () => {
    expect(store().signIn('  demo@careconnect.app  ', 'pw')).toBe(true);
    expect(store().signedIn).toBe(true);
    expect(store().email).toBe('demo@careconnect.app');
  });

  it('continueAsGuest signs in without an email', () => {
    store().continueAsGuest();
    expect(store().signedIn).toBe(true);
    expect(store().email).toBeNull();
  });

  it('signOut clears the session', () => {
    store().signIn('demo@careconnect.app', 'pw');
    store().signOut();
    expect(store().signedIn).toBe(false);
    expect(store().email).toBeNull();
  });
});
