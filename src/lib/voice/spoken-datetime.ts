/**
 * Parse spoken dates and times (as captured by a wildcard voice command)
 * into the string formats used by <input type="date"> and <input type="time">.
 * Transcripts arrive punctuation-stripped ("9:30 a.m." → "9 30 a m"), so
 * everything is matched on whole lowercase words.
 */

const pad2 = (v: number): string => v.toString().padStart(2, '0');

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6,
};

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const ORDINAL_UNITS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

/**
 * Read a number from the token stream starting at `i`. Handles digits
 * ("5", "21"), digit ordinals ("5th"), number words ("five", "twenty one"),
 * and ordinal words ("fifth", "twenty first"). Returns the value and how
 * many tokens were consumed, or null.
 */
function readNumber(tokens: string[], i: number): { value: number; used: number } | null {
  const t = tokens[i];
  if (t === undefined) return null;
  const digits = /^(\d+)(?:st|nd|rd|th)?$/.exec(t);
  if (digits) return { value: Number(digits[1]), used: 1 };
  if (t in ORDINAL_UNITS) return { value: ORDINAL_UNITS[t], used: 1 };
  if (t in UNITS) return { value: UNITS[t], used: 1 };
  if (t in TENS) {
    const next = tokens[i + 1];
    if (next !== undefined && next in UNITS && UNITS[next] >= 1 && UNITS[next] <= 9) {
      return { value: TENS[t] + UNITS[next], used: 2 };
    }
    if (next !== undefined && next in ORDINAL_UNITS && ORDINAL_UNITS[next] <= 9) {
      return { value: TENS[t] + ORDINAL_UNITS[next], used: 2 };
    }
    return { value: TENS[t], used: 1 };
  }
  return null;
}

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Parse a spoken date into "YYYY-MM-DD", or null if not understood.
 * Supports "today", "tomorrow", weekday names (optionally "next ..."),
 * and month-name dates ("july 5", "July 5th", "the fifth of july",
 * "july 5 2027"). Month/day without a year resolves to the next occurrence.
 */
export function parseSpokenDate(text: string, now: Date = new Date()): string | null {
  // Drop filler words so "the fifth of july" and "on july 5" both parse.
  const tokens = words(text).filter((t) => t !== 'the' && t !== 'on');
  if (tokens.length === 0) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (tokens.length === 1 && tokens[0] === 'today') return isoDate(today);
  if (tokens.length === 1 && tokens[0] === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return isoDate(today);
  }

  // "[next] friday"
  const wantsNext = tokens[0] === 'next';
  const weekdayToken = wantsNext ? tokens[1] : tokens[0];
  if (weekdayToken !== undefined && weekdayToken in WEEKDAYS) {
    if (tokens.length > (wantsNext ? 2 : 1)) return null;
    let offset = (WEEKDAYS[weekdayToken] - today.getDay() + 7) % 7;
    if (wantsNext && offset === 0) offset = 7;
    today.setDate(today.getDate() + offset);
    return isoDate(today);
  }

  // Month-name forms: "july 5 [2027]" or "fifth of july [2027]".
  let month: number | null = null;
  let day: number | null = null;
  let rest: string[] = [];
  if (tokens[0] in MONTHS) {
    month = MONTHS[tokens[0]];
    const num = readNumber(tokens, 1);
    if (!num) return null;
    day = num.value;
    rest = tokens.slice(1 + num.used);
  } else {
    const num = readNumber(tokens, 0);
    if (!num || tokens[num.used] !== 'of') return null;
    const monthToken = tokens[num.used + 1];
    if (monthToken === undefined || !(monthToken in MONTHS)) return null;
    day = num.value;
    month = MONTHS[monthToken];
    rest = tokens.slice(num.used + 2);
  }

  let year: number | null = null;
  if (rest.length === 1 && /^\d{4}$/.test(rest[0])) year = Number(rest[0]);
  else if (rest.length > 0) return null;

  if (day < 1) return null;
  const resolvedYear = year ?? today.getFullYear();
  if (day > daysInMonth(resolvedYear, month)) return null;
  const result = new Date(resolvedYear, month - 1, day);
  // Without an explicit year, a past date means the next occurrence.
  if (year === null && result.getTime() < today.getTime()) {
    if (day > daysInMonth(resolvedYear + 1, month)) return null;
    result.setFullYear(resolvedYear + 1);
  }
  return isoDate(result);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/**
 * Speak back a "YYYY-MM-DD" value naturally, e.g. "Sunday, July 5".
 * The year is included only when it differs from the current year.
 */
export function formatSpokenDate(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const base = `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[m - 1]} ${d}`;
  return y === now.getFullYear() ? base : `${base}, ${y}`;
}

/** Speak back an "HH:MM" value as a 12-hour clock, e.g. "2:30 PM". */
export function formatSpokenTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(m)} ${period}`;
}

const TIME_FILLERS = new Set(['at', 'in', 'the']);

const DAY_PERIODS: Record<string, 'am' | 'pm'> = {
  morning: 'am',
  afternoon: 'pm',
  evening: 'pm',
  night: 'pm',
};

/**
 * Parse a spoken time into "HH:MM", or null if not understood. Supports
 * digits with am/pm ("9 30 am" from "9:30 AM"), spelled-out periods
 * ("9 a m"), word numbers ("nine thirty pm", "nine oh five"), day-part
 * phrasing ("1 in the afternoon", "9 at night"), "noon", "midnight",
 * "o'clock", 24-hour input ("15 30"), and military hundred-hours
 * ("13 hundred", "zero hundred hours", "2400").
 */
export function parseSpokenTime(text: string): string | null {
  // Whisper often squashes "1 p.m." into "1pm" — split the attached period.
  let tokens = words(text)
    .filter((t) => !TIME_FILLERS.has(t))
    .flatMap((t) => {
      const m = /^(\d{1,4})(am|pm)$/.exec(t);
      return m ? [m[1], m[2]] : [t];
    });
  // Military "hours" suffix ("1600 hours") adds nothing.
  if (tokens[tokens.length - 1] === 'hours') tokens = tokens.slice(0, -1);
  if (tokens.length === 0) return null;

  if (tokens.length === 1 && tokens[0] === 'noon') return '12:00';
  if (tokens.length === 1 && tokens[0] === 'midnight') return '00:00';

  // Trailing period: "am", "pm", spelled out "a m" / "p m", or a day part
  // ("in the afternoon" arrives as just "afternoon" after filler removal).
  let period: 'am' | 'pm' | null = null;
  const last = tokens[tokens.length - 1];
  if (last === 'am' || last === 'pm') {
    period = last;
    tokens = tokens.slice(0, -1);
  } else if (last === 'm' && tokens.length >= 2) {
    const prev = tokens[tokens.length - 2];
    if (prev === 'a' || prev === 'p') {
      period = prev === 'a' ? 'am' : 'pm';
      tokens = tokens.slice(0, -2);
    }
  } else if (last in DAY_PERIODS) {
    period = DAY_PERIODS[last];
    tokens = tokens.slice(0, -1);
  }

  // "9 o clock" / "9 oclock" — the o'clock adds nothing.
  if (tokens[tokens.length - 1] === 'clock') tokens = tokens.slice(0, -1);
  if (tokens[tokens.length - 1] === 'oclock') tokens = tokens.slice(0, -1);
  if (tokens[tokens.length - 1] === 'o') tokens = tokens.slice(0, -1);

  // Military hundred-hours: "[zero] thirteen hundred" → 13:00.
  let military = false;
  if (tokens[tokens.length - 1] === 'hundred') {
    tokens = tokens.slice(0, -1);
    military = true;
  }

  let hour: number;
  let minute = 0;
  let i: number;
  if (military) {
    // A leading "zero"/"oh" is padding, as in "oh eight hundred".
    if (tokens.length > 1 && (tokens[0] === 'zero' || tokens[0] === 'oh' || tokens[0] === 'o')) {
      tokens = tokens.slice(1);
    }
    const hourNum = readNumber(tokens, 0);
    if (!hourNum) return null;
    hour = hourNum.value;
    i = hourNum.used;
  } else if (/^\d{3,4}$/.test(tokens[0] ?? '')) {
    // "1:30" squashed into "130" (or "1530") — last two digits are minutes.
    hour = Number(tokens[0].slice(0, -2));
    minute = Number(tokens[0].slice(-2));
    i = 1;
  } else {
    const hourNum = readNumber(tokens, 0);
    if (!hourNum) return null;
    hour = hourNum.value;
    i = hourNum.used;
    if (i < tokens.length) {
      // "oh five" / "o five" minutes.
      if (tokens[i] === 'oh' || tokens[i] === 'o') i += 1;
      const minuteNum = readNumber(tokens, i);
      if (!minuteNum) return null;
      minute = minuteNum.value;
      i += minuteNum.used;
    }
  }
  if (i !== tokens.length) return null;

  const spokenHour = hour;
  if (period === 'pm' && hour >= 1 && hour <= 11) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  if (period !== null && (spokenHour < 1 || spokenHour > 12)) return null;
  // "2400" / "24 hundred" is midnight.
  if (period === null && hour === 24 && minute === 0) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}
