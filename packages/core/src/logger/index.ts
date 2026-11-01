import { ConsoleAdapter, type ConsoleAdapterOptions } from './console-adapter';
import type { Logger } from './types';

/**
 * Create a {@link Logger} backed by a {@link ConsoleAdapter}.
 */
export function createConsoleLogger(options: ConsoleAdapterOptions = {}): Logger {
  const adapter = new ConsoleAdapter(options);
  return {
    debug: (message, meta) => adapter.log('debug', message, meta),
    info: (message, meta) => adapter.log('info', message, meta),
    warn: (message, meta) => adapter.log('warn', message, meta),
    error: (message, meta) => adapter.log('error', message, meta),
  };
}

export { ConsoleAdapter, type ConsoleAdapterOptions };
export * from './types';
export { createNoopLogger } from './noop-logger';
export { createRedactor, redactValue, normalizeSensitiveKey, type Redactor } from './redact';
