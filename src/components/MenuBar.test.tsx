import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuBar } from './MenuBar';
import { installCareconnectMock, type CareconnectMock } from '@/test-utils/mocks';

describe('MenuBar', () => {
  it('renders the four application menus as keyboard-operable buttons', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    const nav = screen.getByRole('navigation', { name: 'Application menu' });
    expect(nav).toBeInTheDocument();

    for (const label of ['File', 'Edit', 'View', 'Help']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    // Tab reaches the first menu; the rest follow in order.
    await user.tab();
    expect(screen.getByRole('button', { name: 'File' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  describe('with the Electron bridge', () => {
    let bridge: CareconnectMock;

    beforeEach(() => {
      bridge = installCareconnectMock();
    });

    afterEach(() => {
      bridge.cleanup();
    });

    it('pops the native submenu below the clicked button', async () => {
      const user = userEvent.setup();
      render(<MenuBar />);
      await user.click(screen.getByRole('button', { name: 'File' }));
      expect(bridge.popupMenu).toHaveBeenCalledWith(
        'file',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('activates via the keyboard (Enter)', async () => {
      const user = userEvent.setup();
      render(<MenuBar />);
      screen.getByRole('button', { name: 'View' }).focus();
      await user.keyboard('{Enter}');
      expect(bridge.popupMenu).toHaveBeenCalledWith(
        'view',
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  it('does not throw when the bridge is absent (plain browser)', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    await expect(
      user.click(screen.getByRole('button', { name: 'Help' })),
    ).resolves.not.toThrow();
  });
});
