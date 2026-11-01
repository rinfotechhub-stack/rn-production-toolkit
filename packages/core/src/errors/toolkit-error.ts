import { ErrorCode, type ErrorCode as ErrorCodeType } from './error-code';

export interface ToolkitErrorOptions {
  /** Stable machine-readable code. Defaults to `ErrorCode.UNKNOWN`. */
  code?: ErrorCodeType;
  /** The original cause, when this error wraps another. */
  cause?: unknown;
}

/**
 * Base class for all errors thrown by this toolkit.
 *
 * Extends the native `Error` and adds a stable {@link ErrorCode} and an
 * optional `cause` so the original failure is preserved when an error is
 * wrapped.
 */
export class ToolkitError extends Error {
  readonly code: ErrorCodeType;
  readonly cause?: unknown;

  constructor(message: string, options: ToolkitErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? ErrorCode.UNKNOWN;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
