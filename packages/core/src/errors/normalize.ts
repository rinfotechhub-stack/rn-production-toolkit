import { ToolkitError } from './toolkit-error';
import { ErrorCode } from './error-code';

/**
 * Normalize an unknown thrown value into a native `Error`.
 *
 * The toolkit only throws `Error` instances; this helper is useful at
 * boundaries where third-party value can be anything.
 */
export function normalizeError(error: unknown, fallbackMessage = 'Unknown error'): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(fallbackMessage);
}

/**
 * Coerce an unknown value into a {@link ToolkitError}.
 *
 * Already-typed toolkit errors are returned unchanged. Anything else is
 * wrapped with code `ErrorCode.UNKNOWN` and the original value preserved as
 * the cause.
 */
export function asToolkitError(error: unknown): ToolkitError {
  if (error instanceof ToolkitError) {
    return error;
  }
  return new ToolkitError(normalizeError(error).message, {
    code: ErrorCode.UNKNOWN,
    cause: error,
  });
}
