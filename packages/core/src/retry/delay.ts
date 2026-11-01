import { ConfigurationError } from '../errors';
import type { RetryOptions, ResolvedRetryOptions } from './types';
import { defaultShouldRetry } from './default-policy';

export {
  defaultShouldRetry,
  isPermanentError,
  isTransientError,
  extractStatusCode,
} from './default-policy';

export const DEFAULT_BASE_DELAY_MS = 100;
export const DEFAULT_MAX_DELAY_MS = 5000;

/**
 * Validate and normalize {@link RetryOptions}, applying defaults.
 *
 * Throws {@link ConfigurationError} when the options are invalid.
 */
export function resolveRetryOptions(options: RetryOptions): ResolvedRetryOptions {
  if (typeof options !== 'object' || options === null) {
    throw new ConfigurationError('options must be an object.');
  }

  const { maxAttempts, baseDelayMs, maxDelayMs, jitter, signal, shouldRetry } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new ConfigurationError(
      `maxAttempts must be a positive integer, received ${String(maxAttempts)}.`,
    );
  }

  const resolvedBaseDelayMs = baseDelayMs === undefined ? DEFAULT_BASE_DELAY_MS : baseDelayMs;
  if (
    typeof resolvedBaseDelayMs !== 'number' ||
    !Number.isFinite(resolvedBaseDelayMs) ||
    resolvedBaseDelayMs < 0
  ) {
    throw new ConfigurationError(
      `baseDelayMs must be a finite non-negative number, received ${String(baseDelayMs)}.`,
    );
  }

  const resolvedMaxDelayMs = maxDelayMs === undefined ? DEFAULT_MAX_DELAY_MS : maxDelayMs;
  if (
    typeof resolvedMaxDelayMs !== 'number' ||
    !Number.isFinite(resolvedMaxDelayMs) ||
    resolvedMaxDelayMs <= 0
  ) {
    throw new ConfigurationError(
      `maxDelayMs must be a finite number greater than 0, received ${String(maxDelayMs)}.`,
    );
  }

  if (resolvedBaseDelayMs > resolvedMaxDelayMs) {
    throw new ConfigurationError(
      `baseDelayMs (${resolvedBaseDelayMs}) cannot exceed maxDelayMs (${resolvedMaxDelayMs}).`,
    );
  }

  if (jitter !== undefined && typeof jitter !== 'boolean') {
    throw new ConfigurationError(
      `jitter must be a boolean when provided, received ${typeof jitter}.`,
    );
  }

  if (
    signal !== undefined &&
    (typeof signal !== 'object' ||
      signal === null ||
      typeof (signal as AbortSignal).aborted !== 'boolean')
  ) {
    throw new ConfigurationError('signal must be an AbortSignal when provided.');
  }

  const resolvedShouldRetry = shouldRetry ?? defaultShouldRetry;
  if (typeof resolvedShouldRetry !== 'function') {
    throw new ConfigurationError('shouldRetry must be a function when provided.');
  }

  return {
    maxAttempts,
    baseDelayMs: resolvedBaseDelayMs,
    maxDelayMs: resolvedMaxDelayMs,
    jitter: jitter ?? false,
    shouldRetry: resolvedShouldRetry,
    signal,
  };
}

/**
 * Compute the backoff delay before retrying after the given failed attempt.
 *
 * `attempt` is the 1-based number of the attempt that just failed. The delay
 * is `min(maxDelayMs, baseDelayMs * 2^(attempt-1))`, with optional full
 * jitter applied over `[0, computedDelay]`.
 *
 * Exported for testing and for advanced callers who need a delay for their
 * own scheduling.
 */
export function computeDelayMs(attempt: number, options: ResolvedRetryOptions): number {
  const exponential = options.baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(exponential, options.maxDelayMs);
  if (!options.jitter) {
    return Math.floor(capped);
  }
  return Math.floor(Math.random() * (capped + 1));
}
