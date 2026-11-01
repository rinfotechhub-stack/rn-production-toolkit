import { ToolkitError, ErrorCode } from '../errors';

/**
 * Thrown by {@link withRetry} when the maximum attempt count is reached and
 * the operation has still not succeeded.
 */
export class RetryError extends ToolkitError {
  /** The number of attempts actually performed. */
  readonly attempts: number;

  /** The error thrown by the final failed attempt. */
  readonly lastError: unknown;

  constructor(message: string, options: { attempts: number; lastError: unknown; cause?: unknown }) {
    super(message, {
      code: ErrorCode.RETRY_EXHAUSTED,
      cause: options.cause ?? options.lastError,
    });
    this.name = 'RetryError';
    this.attempts = options.attempts;
    this.lastError = options.lastError;
  }
}
