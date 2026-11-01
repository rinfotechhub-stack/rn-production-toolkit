import assert from 'node:assert';
import core, {
  withRetry,
  RetryError,
  ErrorCode,
  createConsoleLogger,
  createNoopLogger,
  createRedactor,
  redactValue,
  createAppStateTracker,
  createConnectivityTracker,
  resolveRuntimeInfo,
  ConfigurationError,
  AbortError,
  ToolkitError,
  normalizeError,
  asToolkitError,
  statusFromReachability,
  snapshotsEqual,
  computeDelayMs,
  resolveRetryOptions,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
} from '@rn-production-toolkit/core';

// Test named imports
assert.strictEqual(typeof withRetry, 'function', 'withRetry should be a function');
assert.strictEqual(typeof RetryError, 'function', 'RetryError should be a constructor');
assert.strictEqual(ErrorCode.CONFIGURATION, 'ERR_CONFIGURATION');
assert.strictEqual(ErrorCode.RETRY_EXHAUSTED, 'ERR_RETRY_EXHAUSTED');
assert.strictEqual(ErrorCode.ABORTED, 'ERR_ABORTED');
assert.strictEqual(ErrorCode.UNKNOWN, 'ERR_UNKNOWN');
assert.strictEqual(typeof createConsoleLogger, 'function');
assert.strictEqual(typeof createNoopLogger, 'function');
assert.strictEqual(typeof createRedactor, 'function');
assert.strictEqual(typeof redactValue, 'function');
assert.strictEqual(typeof createAppStateTracker, 'function');
assert.strictEqual(typeof createConnectivityTracker, 'function');
assert.strictEqual(typeof resolveRuntimeInfo, 'function');
assert.strictEqual(typeof ConfigurationError, 'function');
assert.strictEqual(typeof AbortError, 'function');
assert.strictEqual(typeof ToolkitError, 'function');
assert.strictEqual(typeof normalizeError, 'function');
assert.strictEqual(typeof asToolkitError, 'function');
assert.strictEqual(typeof statusFromReachability, 'function');
assert.strictEqual(typeof snapshotsEqual, 'function');
assert.strictEqual(typeof computeDelayMs, 'function');
assert.strictEqual(typeof resolveRetryOptions, 'function');
assert.strictEqual(DEFAULT_BASE_DELAY_MS, 100);
assert.strictEqual(DEFAULT_MAX_DELAY_MS, 5000);

// Test default import
assert.strictEqual(typeof core, 'object');
assert.strictEqual(core.withRetry, withRetry);
assert.strictEqual(core.ErrorCode, ErrorCode);

// Test runtime execution via ESM
const redactor = createRedactor();
const redacted = redactValue({ password: 'secret', safe: 123 }, redactor);
assert.ok(redacted.includes('[REDACTED]'), 'password should be redacted');
assert.ok(redacted.includes('123'), 'safe value should be preserved');

console.log('ESM consumer smoke test passed successfully.');

