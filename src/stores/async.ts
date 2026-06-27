/**
 * Minimal async-state wrapper, ported verbatim from the mobile app: every
 * async store field is exactly one of loading / error / success, so screens
 * can render the three states uniformly.
 */
export type Async<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'success'; readonly data: T };

export const loading = <T>(): Async<T> => ({ status: 'loading' });

export const success = <T>(data: T): Async<T> => ({ status: 'success', data });

export const failure = <T>(error: string): Async<T> => ({
  status: 'error',
  error,
});

/**
 * Run `fn` and fold the result into an `Async`: a thrown error becomes
 * `{status:'error'}` instead of an unhandled rejection.
 */
export async function guard<T>(fn: () => Promise<T>): Promise<Async<T>> {
  try {
    return success(await fn());
  } catch (e) {
    return failure(e instanceof Error ? e.message : String(e));
  }
}

/** Unwrap the data when present, else `null`. */
export function dataOrNull<T>(value: Async<T>): T | null {
  return value.status === 'success' ? value.data : null;
}
