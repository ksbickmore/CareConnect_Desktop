import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '@/test-utils/render';
import { useAuthStore } from '@/stores/auth-store';

describe('LoginScreen', () => {
  it('pre-fills the demo credentials', () => {
    renderAt('/');
    expect(screen.getByLabelText('Email')).toHaveValue('demo@careconnect.app');
    expect(screen.getByLabelText('Password')).toHaveValue('demo1234');
  });

  it('signs in and lands on the dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().email).toBe('demo@careconnect.app');
  });

  it('shows an inline error for empty credentials and stays put', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.clear(screen.getByLabelText('Email'));
    await user.clear(screen.getByLabelText('Password'));
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Email and password are both required.',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().signedIn).toBe(false);
  });

  it('continues as guest without credentials', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().signedIn).toBe(true);
    expect(useAuthStore.getState().email).toBeNull();
  });
});
