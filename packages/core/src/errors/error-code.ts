/**
 * Stable, machine-readable error codes shared across the toolkit.
 *
 * Codes never change within a major version so callers can rely on them for
 * programmatic branching without depending on message text.
 */
export const ErrorCode = {
  /** Invalid configuration passed to a public API. */
  CONFIGURATION: 'ERR_CONFIGURATION',
  /** A retry operation exhausted its maximum attempt count. */
  RETRY_EXHAUSTED: 'ERR_RETRY_EXHAUSTED',
  /** The operation was cancelled via an AbortSignal. */
  ABORTED: 'ERR_ABORTED',
  /** A generic/unclassified error. */
  UNKNOWN: 'ERR_UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
