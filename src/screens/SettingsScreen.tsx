import { Toolbar } from '@/components/Toolbar';
import { useSettingsStore, type TextZoom } from '@/stores/settings-store';
import { useAnnouncer } from '@/stores/announcer-store';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import styles from './SettingsScreen.module.css';

const TEXT_SIZES: ReadonlyArray<readonly [TextZoom, string]> = [
  [1, 'Default'],
  [1.15, 'Large'],
  [1.3, 'Extra large'],
];

/**
 * Settings screen (Ctrl+, / sidebar). Preferences persist via the settings
 * store and are applied to the document by `useApplySettings` in AppShell.
 */
export function SettingsScreen() {
  const textZoom = useSettingsStore((s) => s.textZoom);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const showVoiceBar = useSettingsStore((s) => s.showVoiceBar);
  const setTextZoom = useSettingsStore((s) => s.setTextZoom);
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion);
  const setShowVoiceBar = useSettingsStore((s) => s.setShowVoiceBar);
  const announce = useAnnouncer();

  const chooseTextSize = (zoom: TextZoom, label: string) => {
    setTextZoom(zoom);
    announce(`Text size set to ${label}.`);
  };

  const toggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    announce(next ? 'Reduced motion on.' : 'Reduced motion off.');
  };

  const toggleVoiceBar = () => {
    const next = !showVoiceBar;
    setShowVoiceBar(next);
    announce(next ? 'Voice command bar shown.' : 'Voice command bar hidden.');
  };

  const setMotion = (on: boolean) => {
    setReducedMotion(on);
    announce(on ? 'Reduced motion on.' : 'Reduced motion off.');
  };

  // Spoken size → zoom. Wildcards keep natural phrasings working ("text size
  // extra large", "set text size to normal").
  const speakTextSize = (spoken?: string) => {
    const s = (spoken ?? '').toLowerCase();
    if (s.includes('extra')) chooseTextSize(1.3, 'Extra large');
    else if (s.includes('large') || s.includes('big')) chooseTextSize(1.15, 'Large');
    else if (s.includes('default') || s.includes('normal') || s.includes('small'))
      chooseTextSize(1, 'Default');
    else announce('Say text size default, large, or extra large.');
  };

  useVoiceCommands('screen', [
    {
      phrases: ['text size *', 'set text size to *', 'change text size to *'],
      hint: 'text size <default | large | extra large>',
      run: speakTextSize,
    },
    {
      phrases: ['reduce motion on', 'reduced motion on', 'turn on reduced motion'],
      hint: 'reduced motion on',
      run: () => setMotion(true),
    },
    {
      phrases: ['reduce motion off', 'reduced motion off', 'turn off reduced motion'],
      hint: 'reduced motion off',
      run: () => setMotion(false),
    },
    {
      phrases: ['reduce motion', 'reduced motion'],
      hint: 'reduced motion',
      run: toggleReducedMotion,
    },
    {
      phrases: ['voice bar', 'voice command bar', 'toggle voice bar'],
      hint: 'voice bar',
      run: toggleVoiceBar,
    },
  ]);

  return (
    <>
      <Toolbar title="Settings" />
      <div className={styles.scroll}>
        <div className={styles.card}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Text size</legend>
            <p className={styles.hint}>Scales the whole interface.</p>
            <div className={styles.options}>
              {TEXT_SIZES.map(([zoom, label]) => (
                <label key={label} className={styles.radioRow}>
                  <input
                    type="radio"
                    name="text-size"
                    className={styles.radio}
                    checked={textZoom === zoom}
                    onChange={() => chooseTextSize(zoom, label)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Reduce motion</div>
              <div className={styles.hint}>
                Turns off animations and transitions.
              </div>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${reducedMotion ? styles.toggleOn : ''}`}
              aria-pressed={reducedMotion}
              aria-label="Reduce motion"
              onClick={toggleReducedMotion}
            >
              {reducedMotion ? 'On' : 'Off'}
            </button>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Voice command bar</div>
              <div className={styles.hint}>
                Show the microphone bar at the bottom of every screen.
              </div>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${showVoiceBar ? styles.toggleOn : ''}`}
              aria-pressed={showVoiceBar}
              aria-label="Voice command bar"
              onClick={toggleVoiceBar}
            >
              {showVoiceBar ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
