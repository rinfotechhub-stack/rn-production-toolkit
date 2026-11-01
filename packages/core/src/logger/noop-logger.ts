import type { Logger } from './types';

/**
 * A logger that performs no work. Useful as a default/safe fallback.
 */
export function createNoopLogger(): Logger {
  return {
    debug(): void {},
    info(): void {},
    warn(): void {},
    error(): void {},
  };
}
