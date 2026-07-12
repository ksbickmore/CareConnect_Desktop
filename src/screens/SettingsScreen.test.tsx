jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signIn } from '@/test-utils/render';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useSettingsStore } from '@/stores/settings-store';

beforeEach(() => {
  signIn();
});

describe('SettingsScreen', () => {
  it('offers text size as a radio group and applies the zoom', async () => {
    const user = userEvent.setup();
    renderAt('/settings');

    expect(screen.getByRole('radio', { name: 'Default' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Large' }));

    expect(useSettingsStore.getState().textZoom).toBe(1.15);
    expect(document.body.style.zoom).toBe('1.15');
    expect(useAnnouncerStore.getState().polite).toBe('Text size set to Large.');
  });

  it('toggles reduced motion with aria-pressed feedback and a document flag', async () => {
    const user = userEvent.setup();
    renderAt('/settings');

    const toggle = screen.getByRole('button', { name: 'Reduce motion' });
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
    expect(useAnnouncerStore.getState().polite).toBe('Reduced motion on.');
  });

  it('hides the voice command bar when toggled off', async () => {
    const user = userEvent.setup();
    renderAt('/settings');

    expect(document.getElementById('voice-command-mic')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Voice command bar' }));

    expect(useSettingsStore.getState().showVoiceBar).toBe(false);
    expect(document.getElementById('voice-command-mic')).toBeNull();
    expect(useAnnouncerStore.getState().polite).toBe(
      'Voice command bar hidden.',
    );
  });
});
