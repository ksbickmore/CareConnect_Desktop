import { loadJSON } from '@/data/storage';
import { useSettingsStore } from './settings-store';

describe('useSettingsStore', () => {
  it('starts with the defaults', () => {
    const s = useSettingsStore.getState();
    expect(s.textZoom).toBe(1);
    expect(s.reducedMotion).toBe(false);
    expect(s.showVoiceBar).toBe(true);
  });

  it('persists every change under careconnect:settings', () => {
    useSettingsStore.getState().setTextZoom(1.3);
    useSettingsStore.getState().setReducedMotion(true);
    useSettingsStore.getState().setShowVoiceBar(false);

    expect(loadJSON('settings', null)).toEqual({
      textZoom: 1.3,
      reducedMotion: true,
      showVoiceBar: false,
    });
  });

  it('reset restores defaults without persisting them', () => {
    useSettingsStore.getState().setReducedMotion(true);
    useSettingsStore.getState().reset();

    expect(useSettingsStore.getState().reducedMotion).toBe(false);
    // The stored value is untouched — reset is for test isolation only.
    expect(loadJSON('settings', null)).toEqual({
      textZoom: 1,
      reducedMotion: true,
      showVoiceBar: true,
    });
  });
});
