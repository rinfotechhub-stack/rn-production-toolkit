import { ErrorCode } from '../errors/error-code';
import { AbortError } from '../errors/abort-error';
import { ConfigurationError } from '../errors/configuration-error';

/**
 * Common system and network error codes indicating a transient failure.
 */
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ENETUNREACH',
  'ENETRESET',
  'ENETDOWN',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'ERR_NETWORK',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
]);

/**
 * Error class names indicating a transient failure.
 */
const TRANSIENT_ERROR_NAMES = new Set(['TimeoutError', 'NetworkError', 'FetchError']);

/**
 * Regex matching error messages indicating transient/network failure.
 */
const TRANSIENT_MESSAGE_REGEX =
  /\b(network|timeout|timed out|connection reset|connection refused|socket hang up|temporary|transient)\b/i;

/**
 * Regex matching error codes or names indicating permanent authentication/authorization/validation errors.
 */
const PERMANENT_CODE_OR_NAME_REGEX =
  /(AUTH|UNAUTHORIZED|UNAUTHENTICATED|FORBIDDEN|VALIDATION|INVALID_ARGUMENT|NOT_FOUND|BAD_REQUEST)/i;

/**
 * Extract a numeric HTTP status code if present on the error object.
 */
export function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown; statusCode?: unknown };
  };
  const raw =
    candidate.status ??
    candidate.statusCode ??
    candidate.response?.status ??
    candidate.response?.statusCode;

  return typeof raw === 'number' && Number.isInteger(raw) ? raw : undefined;
}

/**
 * Determine whether an error is definitely permanent (must not be retried).
 */
export function isPermanentError(error: unknown): boolean {
  if (error instanceof AbortError || error instanceof ConfigurationError) {
    return true;
  }

  // Standard programming errors are permanent bugs unless specifically a fetch/network TypeError.
  if (
    error instanceof RangeError ||
    error instanceof SyntaxError ||
    error instanceof ReferenceError ||
    error instanceof URIError
  ) {
    return true;
  }

  if (error instanceof TypeError) {
    // In React Native / browser WHATWG fetch, network failures reject with TypeError: Network request failed
    if (TRANSIENT_MESSAGE_REGEX.test(error.message)) {
      return false;
    }
    return true;
  }

  const statusCode = extractStatusCode(error);
  if (statusCode !== undefined) {
    // HTTP 408 (Request Timeout) and 429 (Too Many Requests) are transient
    if (statusCode === 408 || statusCode === 429) {
      return false;
    }
    // All other 4xx errors are permanent client/auth/validation errors
    if (statusCode >= 400 && statusCode < 500) {
      return true;
    }
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      code?: unknown;
      name?: unknown;
      isTransient?: unknown;
      transient?: unknown;
      retryable?: unknown;
    };

    if (errObj.isTransient === false || errObj.transient === false || errObj.retryable === false) {
      return true;
    }

    if (errObj.code === ErrorCode.ABORTED || errObj.code === ErrorCode.CONFIGURATION) {
      return true;
    }

    if (typeof errObj.code === 'string' && PERMANENT_CODE_OR_NAME_REGEX.test(errObj.code)) {
      return true;
    }

    if (typeof errObj.name === 'string' && PERMANENT_CODE_OR_NAME_REGEX.test(errObj.name)) {
      return true;
    }
  }

  return false;
}

/**
 * Determine whether an error is identifiable as transient.
 */
export function isTransientError(error: unknown): boolean {
  if (isPermanentError(error)) {
    return false;
  }

  const statusCode = extractStatusCode(error);
  if (statusCode !== undefined) {
    if (statusCode === 408 || statusCode === 429) {
      return true;
    }
    if (statusCode >= 500 && statusCode <= 599) {
      return true;
    }
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      isTransient?: unknown;
      transient?: unknown;
      retryable?: unknown;
    };

    if (errObj.isTransient === true || errObj.transient === true || errObj.retryable === true) {
      return true;
    }

    if (typeof errObj.code === 'string') {
      const codeUpper = errObj.code.toUpperCase();
      if (TRANSIENT_ERROR_CODES.has(codeUpper)) {
        return true;
      }
    }

    if (typeof errObj.name === 'string' && TRANSIENT_ERROR_NAMES.has(errObj.name)) {
      return true;
    }

    if (typeof errObj.message === 'string' && TRANSIENT_MESSAGE_REGEX.test(errObj.message)) {
      return true;
    }
  }

  return false;
}

/**
 * Conservative default retry predicate.
 *
 * In accordance with architecture guidelines, permanent errors (such as
 * HTTP 4xx client errors, authentication failures, validation errors,
 * programming TypeErrors, configuration errors, and aborts) are NEVER retried.
 *
 * Unclassified/unknown errors are also NOT retried by default to prevent
 * unintentional retry of non-idempotent or non-transient operations.
 *
 * Only recognized transient errors (such as network drops, connection resets,
 * timeouts, HTTP 408/429, and HTTP 5xx) are retried.
 *
 * Callers requiring a different policy can provide their own `shouldRetry`
 * predicate in {@link RetryOptions}.
 */
export function defaultShouldRetry(error: unknown): boolean {
  return isTransientError(error);
}
