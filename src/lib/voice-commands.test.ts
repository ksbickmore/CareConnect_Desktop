import { parseVoiceCommand } from './voice-commands';
import { routes } from './routes';

describe('parseVoiceCommand', () => {
  it.each([
    ['go to the dashboard', routes.dashboard, 'Dashboard'],
    ['take me home', routes.dashboard, 'Dashboard'],
    ['open my medication list', routes.medications, 'Medications'],
    ['show meds', routes.medications, 'Medications'],
    ['next appointment please', routes.appointments, 'Schedule'],
    ['show my schedule', routes.appointments, 'Schedule'],
    ['open the health log', routes.healthLog, 'Health Log'],
    ['log a symptom', routes.healthLog, 'Health Log'],
    ['read my messages', routes.messages, 'Messages'],
    ['open my profile', routes.profile, 'Profile'],
    ['account settings', routes.profile, 'Profile'],
    ['this is an emergency', routes.emergency, 'Emergency'],
    ['I need help', routes.emergency, 'Emergency'],
  ])('routes "%s" to %s', (words, route, label) => {
    expect(parseVoiceCommand(words)).toEqual({ route, label });
  });

  it('is case-insensitive', () => {
    expect(parseVoiceCommand('OPEN MEDICATIONS')?.route).toBe(routes.medications);
  });

  it('prefers earlier keywords when several match', () => {
    // "home" (dashboard) is checked before "medication".
    expect(parseVoiceCommand('home medication')?.route).toBe(routes.dashboard);
  });

  it('returns null when nothing matches', () => {
    expect(parseVoiceCommand('play some music')).toBeNull();
  });

  it('returns null for an empty transcript', () => {
    expect(parseVoiceCommand('')).toBeNull();
  });
});
