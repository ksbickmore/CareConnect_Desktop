/**
 * Pure date/label formatting helpers, ported from the mobile app's
 * `src/lib/format.ts`. No Intl dependency — hand-formatted to match the seed
 * display used across screens.
 */

const pad2 = (v: number): string => v.toString().padStart(2, '0');

/** HH:MM rendering of a timestamp for the medication card UI. */
export function hhmm(timestamp: number): string {
  const t = new Date(timestamp);
  return `${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
}

/** 12-hour clock label, e.g. "2:00 PM". */
export function clockLabel(timestamp: number): string {
  const t = new Date(timestamp);
  const period = t.getHours() < 12 ? 'AM' : 'PM';
  let h12 = t.getHours() % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(t.getMinutes())} ${period}`;
}

/** Human-friendly appointment time — e.g. "Tue · 2:00 PM". */
export function whenLabel(timestamp: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const t = new Date(timestamp);
  return `${days[t.getDay()]} · ${clockLabel(timestamp)}`;
}

/** "Today HH:MM" stamp used when saving a health-log entry. */
export function todayLabel(timestamp: number): string {
  const t = new Date(timestamp);
  return `Today ${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
}

/** "M:SS" rendering of a voice-note duration in milliseconds. */
export function durationLabel(lengthMs: number): string {
  const totalSeconds = Math.round(lengthMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad2(seconds)}`;
}

/**
 * Minute-resolution stamp used to disambiguate same-titled appointments,
 * e.g. "202606101430".
 */
export function minuteStamp(timestamp: number): string {
  const d = new Date(timestamp);
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `${pad2(d.getHours())}${pad2(d.getMinutes())}`
  );
}

/** Capitalize an email prefix as a display name (e.g. "demo" -> "Demo"). */
export function displayName(prefix: string): string {
  if (prefix.length === 0) return 'User';
  return prefix[0].toUpperCase() + prefix.slice(1);
}

/** Derive up to two initials from an email prefix (e.g. "sung.yoo" -> "SY"). */
export function initialsOf(prefix: string): string {
  if (prefix.length === 0) return '?';
  const parts = prefix.split(/[._]/);
  if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return prefix[0].toUpperCase();
}

/**
 * Derive up to two initials from a space-separated display name
 * (e.g. "Sarah Vance" -> "SV"). Used by the Add Contact form.
 */
export function initialsOfName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Slugify a user-entered name into a stable id, e.g.
 * "Lisinopril 10 mg" -> "lisinopril-10-mg".
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
