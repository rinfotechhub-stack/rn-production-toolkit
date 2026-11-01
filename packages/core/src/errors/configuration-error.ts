import { ToolkitError, type ToolkitErrorOptions } from './toolkit-error';
import { ErrorCode } from './error-code';

/**
 * Thrown when a public API receives invalid configuration.
 *
 * For example, retry options that are malformed or out of range.
 */
export class ConfigurationError extends ToolkitError {
  constructor(message: string, options: Omit<ToolkitErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: ErrorCode.CONFIGURATION });
    this.name = 'ConfigurationError';
  }
}
