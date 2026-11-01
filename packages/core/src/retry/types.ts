/**
 * Configuration for {@link withRetry}.
 */
export interface RetryOptions {
  /**
   * Total attempts, including the first attempt. Must be a positive integer.
   * A value of `1` means "try once, never retry".
   */
  maxAttempts: number;

  /**
   * Base backoff delay in milliseconds before the first retry. Each
   * subsequent delay doubles until {@link maxDelayMs}. Default: `100`.
   */
  baseDelayMs?: number;

  /**
   * Upper bound for any backoff delay in milliseconds. Must be `> 0` and
   * `>= baseDelayMs`. Default: `5000`.
   */
  maxDelayMs?: number;

  /**
   * When `true`, apply full jitter: each delay is a random integer in
   * `[0, computedDelay]`. Default: `false`.
   */
  jitter?: boolean;

  /**
   * Optional signal used to cancel a pending retry. If the signal is already
   * aborted, the operation is not invoked and an `AbortError` is thrown.
   */
  signal?: AbortSignal;

  /**
   * Caller-defined predicate deciding whether an error should be retried.
   * Called with the error and the failed attempt number (1-based). Return
   * `false` to stop and rethrow the original error immediately.
   *
   * By default, a conservative policy (`defaultShouldRetry`) is used:
   * - Permanent errors (authentication 401/403, validation 400/422, client
   *   4xx errors, configuration errors, and programming errors like TypeError)
   *   are NEVER retried.
   * - Unclassified/unknown errors are NOT retried by default.
   * - Only identifiable transient errors (network timeouts, connection resets,
   *   HTTP 408/429, and HTTP 5xx) are retried.
   *
   * Provide a custom predicate to override this behavior, e.g. to retry
   * domain-specific errors or prevent retrying non-idempotent operations.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Fully-resolved retry options with all defaults applied. Produced by
 * {@link resolveRetryOptions}.
 */
export interface ResolvedRetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  shouldRetry: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
}
