import { routes } from './routes';

/**
 * Keyword routing for the global voice command bar, ported from the mobile
 * app. Pure function so it can be reasoned about without any speech mocking.
 * Returns `null` when no keyword matches — the caller surfaces a
 * "Heard: … — try saying a screen name" hint instead of navigating.
 */
export interface VoiceCommand {
  /** Route to navigate to. */
  readonly route: string;
  /** Human label for the announcement, e.g. "Medications". */
  readonly label: string;
}

export function parseVoiceCommand(words: string): VoiceCommand | null {
  const lower = words.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('home')) {
    return { route: routes.dashboard, label: 'Dashboard' };
  }
  if (lower.includes('medication') || lower.includes('meds')) {
    return { route: routes.medications, label: 'Medications' };
  }
  if (lower.includes('appointment') || lower.includes('schedule')) {
    return { route: routes.appointments, label: 'Schedule' };
  }
  if (lower.includes('health') || lower.includes('symptom')) {
    return { route: routes.healthLog, label: 'Health Log' };
  }
  if (lower.includes('message')) {
    return { route: routes.messages, label: 'Messages' };
  }
  if (lower.includes('profile') || lower.includes('account')) {
    return { route: routes.profile, label: 'Profile' };
  }
  if (lower.includes('emergency') || lower.includes('help')) {
    return { route: routes.emergency, label: 'Emergency' };
  }
  return null;
}
