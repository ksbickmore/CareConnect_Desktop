import {
  clockLabel,
  displayName,
  initialsOf,
  minuteStamp,
  slugify,
  todayHeading,
  todayLabel,
  whenLabel,
} from './format';

// Build timestamps via the Date constructor so tests are timezone-safe.
const at = (h: number, m: number) => new Date(2026, 5, 9, h, m).getTime(); // Tue Jun 9 2026

describe('clockLabel', () => {
  it('formats morning times as AM', () => {
    expect(clockLabel(at(9, 7))).toBe('9:07 AM');
  });
  it('formats afternoon times as PM', () => {
    expect(clockLabel(at(14, 0))).toBe('2:00 PM');
  });
  it('renders midnight as 12 AM', () => {
    expect(clockLabel(at(0, 30))).toBe('12:30 AM');
  });
  it('renders noon as 12 PM', () => {
    expect(clockLabel(at(12, 0))).toBe('12:00 PM');
  });
});

describe('whenLabel', () => {
  it('prefixes the weekday', () => {
    expect(whenLabel(at(14, 0))).toBe('Tue · 2:00 PM');
  });
});

describe('todayLabel', () => {
  it('renders a 24h "Today" stamp', () => {
    expect(todayLabel(at(14, 32))).toBe('Today 14:32');
  });
});

describe('todayHeading', () => {
  it('renders the uppercase weekday', () => {
    expect(todayHeading(at(9, 0))).toBe('TODAY — TUESDAY');
  });
});

describe('minuteStamp', () => {
  it('renders yyyyMMddHHmm', () => {
    expect(minuteStamp(new Date(2026, 5, 10, 14, 30).getTime())).toBe(
      '202606101430',
    );
  });
});

describe('displayName', () => {
  it('capitalizes the prefix', () => {
    expect(displayName('demo')).toBe('Demo');
  });
  it('falls back to "User" for empty input', () => {
    expect(displayName('')).toBe('User');
  });
});

describe('initialsOf', () => {
  it('uses dot-separated parts', () => {
    expect(initialsOf('sung.yoo')).toBe('SY');
  });
  it('uses underscore-separated parts', () => {
    expect(initialsOf('sung_yoo')).toBe('SY');
  });
  it('falls back to the first letter', () => {
    expect(initialsOf('demo')).toBe('D');
  });
  it('returns "?" for empty input', () => {
    expect(initialsOf('')).toBe('?');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Lisinopril 10 mg')).toBe('lisinopril-10-mg');
  });
  it('collapses punctuation runs and trims edge hyphens', () => {
    expect(slugify('  Hello!! World  ')).toBe('hello-world');
  });
  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});
