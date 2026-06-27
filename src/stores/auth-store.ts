import { create } from 'zustand';

/**
 * Authentication state, ported from the mobile app. Demo-only — there is no
 * real backend. The store exists so the sign-in screen can delegate to it
 * rather than holding auth state in component state.
 */
interface AuthStore {
  readonly signedIn: boolean;
  /** Trimmed email used to greet the user on the dashboard. */
  readonly email: string | null;

  /**
   * Accepts any non-empty email + password and flips the state to signed in.
   * Returns `false` for empty input so the screen can surface an inline
   * error without throwing.
   */
  signIn(email: string, password: string): boolean;
  /** Sign in without credentials (guest path). */
  continueAsGuest(): void;
  signOut(): void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  signedIn: false,
  email: null,

  signIn(email, password) {
    if (email.trim().length === 0 || password.length === 0) return false;
    set({ signedIn: true, email: email.trim() });
    return true;
  },

  continueAsGuest() {
    set({ signedIn: true, email: null });
  },

  signOut() {
    set({ signedIn: false, email: null });
  },
}));
