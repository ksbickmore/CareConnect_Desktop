import { loadJSON, saveJSON } from './storage';

describe('saveJSON / loadJSON', () => {
  it('round-trips a value under the careconnect: prefix', () => {
    saveJSON('sample', { a: 1 });
    expect(localStorage.getItem('careconnect:sample')).toBe('{"a":1}');
    expect(loadJSON('sample', null)).toEqual({ a: 1 });
  });

  it('returns the fallback when the key is absent', () => {
    expect(loadJSON('missing', 'fallback')).toBe('fallback');
  });

  it('returns the fallback when the stored value is corrupt JSON', () => {
    localStorage.setItem('careconnect:bad', '{oops');
    expect(loadJSON('bad', 'fallback')).toBe('fallback');
  });

  it('swallows quota errors from setItem', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveJSON('sample', 'value')).not.toThrow();
    spy.mockRestore();
  });

  it('returns the fallback when getItem throws', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    expect(loadJSON('sample', 42)).toBe(42);
    spy.mockRestore();
  });
});
