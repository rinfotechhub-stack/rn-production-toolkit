import { AbortError } from '../errors';
import { computeDelayMs, resolveRetryOptions } from './delay';
import type { ResolvedRetryOptions } from './types';
import { RetryError } from './retry-error';
import type { RetryOptions } from './types';

/**
 * Run `operation`, retrying on failure according to `options`.
 *
 * - `maxAttempts` includes the first attempt. No retry ever happens beyond it.
 * - No retry is attempted unless the caller opts in by calling this function
 *   and `shouldRetry` (default) returns `true`.
 * - If `shouldRetry` returns `false`, the original error is rethrown as-is.
 * - If attempts are exhausted, a {@link RetryError} is thrown whose `cause`
 *   (and `lastError`) is the original final error.
 * - If `signal` aborts before an attempt or during a backoff delay, an
 *   {@link AbortError} is thrown.
 *
 * Callers must ensure the operation is safe to call more than once
 * (idempotent). This helper never retries silently beyond the configured
 * policy.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const resolved = resolveRetryOptions(options);
  let attempt = 1;

  while (true) {
    assertNotAborted(resolved);

    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= resolved.maxAttempts) {
        throw new RetryError(`Operation failed after ${attempt} attempt(s).`, {
          attempts: attempt,
          lastError: error,
        });
      }

      if (!resolved.shouldRetry(error, attempt)) {
        throw error;
      }

      const delayMs = computeDelayMs(attempt, resolved);
      attempt += 1;
      await sleepWithAbort(delayMs, resolved.signal);
    }
  }
}

function assertNotAborted(options: ResolvedRetryOptions): void {
  if (options.signal?.aborted) {
    throw new AbortError(undefined, { cause: options.signal.reason });
  }
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError(undefined, { cause: signal.reason }));
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AbortError(undefined, { cause: signal?.reason }));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
