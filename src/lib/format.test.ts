import {
  clockLabel,
  displayName,
  durationLabel,
  hhmm,
  initialsOf,
  initialsOfName,
  minuteStamp,
  slugify,
  todayLabel,
  whenLabel,
} from './format';

// Build timestamps via the Date constructor so tests are timezone-safe.
const at = (h: number, m: number) => new Date(2026, 5, 9, h, m).getTime(); // Tue Jun 9 2026

describe('hhmm', () => {
  it('zero-pads hours and minutes', () => {
    expect(hhmm(at(8, 5))).toBe('08:05');
    expect(hhmm(at(23, 59))).toBe('23:59');
  });
});

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

describe('durationLabel', () => {
  it('renders minutes and padded seconds', () => {
    expect(durationLabel(65_000)).toBe('1:05');
  });
  it('rounds sub-second recordings up', () => {
    expect(durationLabel(500)).toBe('0:01');
  });
  it('handles zero', () => {
    expect(durationLabel(0)).toBe('0:00');
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

describe('initialsOfName', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOfName('Sarah Vance')).toBe('SV');
  });
  it('handles single names', () => {
    expect(initialsOfName('Cher')).toBe('C');
  });
  it('returns "?" for blank input', () => {
    expect(initialsOfName('   ')).toBe('?');
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
