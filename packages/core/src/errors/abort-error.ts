import { ToolkitError, type ToolkitErrorOptions } from './toolkit-error';
import { ErrorCode } from './error-code';

/**
 * Thrown when an operation is cancelled through an `AbortSignal`.
 */
export class AbortError extends ToolkitError {
  constructor(message?: string, options: Omit<ToolkitErrorOptions, 'code'> = {}) {
    super(message ?? 'The operation was aborted.', {
      ...options,
      code: ErrorCode.ABORTED,
    });
    this.name = 'AbortError';
  }
}
