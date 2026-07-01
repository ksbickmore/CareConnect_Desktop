import { dataOrNull, failure, guard, loading, success } from './async';

describe('state constructors', () => {
  it('builds the three shapes', () => {
    expect(loading()).toEqual({ status: 'loading' });
    expect(success(7)).toEqual({ status: 'success', data: 7 });
    expect(failure('nope')).toEqual({ status: 'error', error: 'nope' });
  });
});

describe('guard', () => {
  it('wraps a resolved value in success', async () => {
    await expect(guard(async () => 'ok')).resolves.toEqual({
      status: 'success',
      data: 'ok',
    });
  });

  it('folds a thrown Error into its message', async () => {
    await expect(
      guard(async () => {
        throw new Error('boom');
      }),
    ).resolves.toEqual({ status: 'error', error: 'boom' });
  });

  it('stringifies non-Error throwables', async () => {
    await expect(
      guard(async () => {
        throw 'raw failure';
      }),
    ).resolves.toEqual({ status: 'error', error: 'raw failure' });
  });
});

describe('dataOrNull', () => {
  it('unwraps success', () => {
    expect(dataOrNull(success([1, 2]))).toEqual([1, 2]);
  });
  it('returns null while loading', () => {
    expect(dataOrNull(loading())).toBeNull();
  });
  it('returns null on error', () => {
    expect(dataOrNull(failure('x'))).toBeNull();
  });
});
