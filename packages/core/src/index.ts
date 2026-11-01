/**
 * @rn-production-toolkit/core
 *
 * Public entry point for the `rn-production-toolkit` core package.
 *
 * Provides foundational, framework-independent utilities and contracts:
 *
 * - `errors`    — typed errors with stable codes and normalizers.
 * - `retry`     — `withRetry` with backoff, jitter, cancellation, and a
 *                 conservative default retry predicate.
 * - `logger`    — a pluggable logger with safe redaction.
 * - `lifecycle` — AppState tracking contract with explicit cleanup.
 * - `network`   — Connectivity tracking contract and reachability mapping.
 * - `device`    — Privacy-minimizing runtime information resolver.
 *
 * This package has zero runtime dependencies.
 */
export * from './errors';
export * from './retry';
export * from './logger';
export * from './lifecycle';
export * from './network';
export * from './device';
