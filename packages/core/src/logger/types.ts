/**
 * Log levels in increasing order of severity.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Configuration for redaction of sensitive values.
 */
export interface RedactionConfig {
  /**
   * Additional sensitive key names to redact (case-insensitive). These are
   * merged with a built-in safe-by-default list.
   */
  keys?: string[];

  /**
   * Replacement text for redacted values. Default: `'[REDACTED]'`.
   */
  replaceWith?: string;
}

/**
 * Logger interface. Message is a plain string; `meta` is optional structured
 * data that is safely serialized and redacted before writing.
 */
export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/**
 * Minimal console-like sink used for adaptation and testing.
 */
export interface Sink {
  debug(message?: unknown, ...optionalParams: unknown[]): void;
  info(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
}
