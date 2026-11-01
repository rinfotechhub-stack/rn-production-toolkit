import {
  withRetry,
  RetryError,
  AbortError,
  ConfigurationError,
  ErrorCode,
  resolveRetryOptions,
  computeDelayMs,
  defaultShouldRetry,
  isPermanentError,
  isTransientError,
  extractStatusCode,
  type RetryOptions,
} from '../src';

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('succeeds on the first attempt without delay', async () => {
    const operation = jest.fn(async (attempt: number) => `ok-${attempt}`);
    await expect(withRetry(operation, { maxAttempts: 3 })).resolves.toBe('ok-1');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('retries after transient failures and eventually succeeds', async () => {
    const calls: number[] = [];
    const transientError = Object.assign(new Error('connection timeout'), { code: 'ETIMEDOUT' });
    const operation = jest.fn(async (attempt: number) => {
      calls.push(attempt);
      if (attempt < 3) {
        throw transientError;
      }
      return 'success';
    });

    const promise = withRetry(operation, { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 100 });
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe('success');
    expect(calls).toEqual([1, 2, 3]);
  });

  test('stops after maximum attempts and preserves the original cause', async () => {
    const transientBoom = Object.assign(new Error('service unavailable'), { status: 503 });
    const operation = jest.fn(async () => {
      throw transientBoom;
    });

    const promise = withRetry(operation, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 });

    // Attach a handler immediately so the eventual rejection is not unhandled.
    let caught: unknown;
    const probe = promise.catch((error: unknown) => {
      caught = error;
    });

    await jest.advanceTimersByTimeAsync(1000);
    await probe;

    expect(caught).toBeInstanceOf(RetryError);
    const retryError = caught as RetryError;
    expect(retryError.attempts).toBe(3);
    expect(retryError.lastError).toBe(transientBoom);
    expect(retryError.cause).toBe(transientBoom);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('throws the original error immediately when the predicate rejects', async () => {
    const boom = new Error('boom');
    const operation = jest.fn(async () => {
      throw boom;
    });

    await expect(withRetry(operation, { maxAttempts: 5, shouldRetry: () => false })).rejects.toBe(
      boom,
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('does not invoke the operation when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = jest.fn(async () => 'unused');

    await expect(
      withRetry(operation, { maxAttempts: 3, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortError);
    expect(operation).not.toHaveBeenCalled();
  });

  test('throws AbortError when the signal aborts during a backoff delay', async () => {
    const controller = new AbortController();
    const transientError = Object.assign(new Error('network drop'), { code: 'ECONNRESET' });
    const operation = jest.fn(async () => {
      throw transientError;
    });

    const promise = withRetry(operation, {
      maxAttempts: 5,
      baseDelayMs: 50,
      maxDelayMs: 500,
      signal: controller.signal,
    });

    // Attach a handler immediately so the eventual rejection is not unhandled.
    const expectation = expect(promise).rejects.toBeInstanceOf(AbortError);

    // Let the first attempt fail and enter the backoff delay.
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();

    await expectation;
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid options with ConfigurationError', async () => {
    await expect(withRetry(() => Promise.resolve('x'), { maxAttempts: 0 })).rejects.toBeInstanceOf(
      ConfigurationError,
    );
  });
});

describe('retry option validation and backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('validates options and throws ConfigurationError', () => {
    expect(() => resolveRetryOptions({ maxAttempts: 0 })).toThrow(ConfigurationError);
    expect(() => resolveRetryOptions({ maxAttempts: -1 })).toThrow(ConfigurationError);
    expect(() => resolveRetryOptions({ maxAttempts: 1.5 })).toThrow(ConfigurationError);
    expect(() => resolveRetryOptions({ maxAttempts: Number.NaN })).toThrow(ConfigurationError);
    expect(() => resolveRetryOptions({ maxAttempts: 3, baseDelayMs: -5 })).toThrow(
      ConfigurationError,
    );
    expect(() => resolveRetryOptions({ maxAttempts: 3, maxDelayMs: 0 })).toThrow(
      ConfigurationError,
    );
    expect(() => resolveRetryOptions({ maxAttempts: 3, maxDelayMs: -1 })).toThrow(
      ConfigurationError,
    );
    expect(() =>
      resolveRetryOptions({ maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 100 }),
    ).toThrow(ConfigurationError);
  });

  test('applies conservative default retry policy and default option values', () => {
    const resolved = resolveRetryOptions({ maxAttempts: 3 });
    expect(resolved.baseDelayMs).toBe(100);
    expect(resolved.maxDelayMs).toBe(5000);
    expect(resolved.jitter).toBe(false);

    // Default policy does NOT retry permanent or unknown errors
    expect(resolved.shouldRetry('anything', 1)).toBe(false);
    expect(resolved.shouldRetry(new Error('unclassified'), 1)).toBe(false);
    expect(resolved.shouldRetry(Object.assign(new Error('unauthorized'), { status: 401 }), 1)).toBe(
      false,
    );

    // Default policy DOES retry recognized transient errors
    expect(
      resolved.shouldRetry(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), 1),
    ).toBe(true);
    expect(resolved.shouldRetry(Object.assign(new Error('server down'), { status: 503 }), 1)).toBe(
      true,
    );
  });

  test('validates runtime option shapes (L5)', () => {
    // Non-object options
    expect(() => resolveRetryOptions(null as unknown as RetryOptions)).toThrow(ConfigurationError);
    expect(() => resolveRetryOptions(undefined as unknown as RetryOptions)).toThrow(
      ConfigurationError,
    );
    expect(() => resolveRetryOptions('invalid' as unknown as RetryOptions)).toThrow(
      ConfigurationError,
    );

    // Invalid jitter type
    expect(() =>
      resolveRetryOptions({ maxAttempts: 2, jitter: 'yes' as unknown as boolean }),
    ).toThrow(ConfigurationError);

    // Invalid signal type
    expect(() =>
      resolveRetryOptions({ maxAttempts: 2, signal: 'not-a-signal' as unknown as AbortSignal }),
    ).toThrow(ConfigurationError);
    expect(() =>
      resolveRetryOptions({ maxAttempts: 2, signal: {} as unknown as AbortSignal }),
    ).toThrow(ConfigurationError);

    // Invalid shouldRetry type
    expect(() =>
      resolveRetryOptions({ maxAttempts: 2, shouldRetry: 123 as unknown as () => boolean }),
    ).toThrow(ConfigurationError);
  });

  test('handles zero delay and cancellation edge cases in sleepWithAbort (L1)', async () => {
    // baseDelayMs: 0 succeeds immediately
    const zeroDelayOp = jest.fn(async (attempt: number) => {
      if (attempt === 1) {
        throw Object.assign(new Error('transient'), { code: 'ETIMEDOUT' });
      }
      return 'done-zero';
    });
    const promiseZero = withRetry(zeroDelayOp, { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 100 });
    await jest.advanceTimersByTimeAsync(0);
    await expect(promiseZero).resolves.toBe('done-zero');
    expect(zeroDelayOp).toHaveBeenCalledTimes(2);

    // baseDelayMs: 0 when signal is aborted aborts with AbortError
    const controller = new AbortController();
    const abortOp = jest.fn(async (attempt: number) => {
      if (attempt === 1) {
        controller.abort();
        throw Object.assign(new Error('transient'), { code: 'ETIMEDOUT' });
      }
      return 'unreachable';
    });
    const abortPromise = withRetry(abortOp, {
      maxAttempts: 3,
      baseDelayMs: 0,
      maxDelayMs: 100,
      signal: controller.signal,
    });
    await expect(abortPromise).rejects.toBeInstanceOf(AbortError);
  });
});

describe('M2 — Default retry policy and error classification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not retry authentication errors by default', async () => {
    const authStatus401 = Object.assign(new Error('Unauthorized'), { status: 401 });
    const op401 = jest.fn(async () => {
      throw authStatus401;
    });
    await expect(withRetry(op401, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(authStatus401);
    expect(op401).toHaveBeenCalledTimes(1);

    const authStatus403 = Object.assign(new Error('Forbidden'), { statusCode: 403 });
    const op403 = jest.fn(async () => {
      throw authStatus403;
    });
    await expect(withRetry(op403, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(authStatus403);
    expect(op403).toHaveBeenCalledTimes(1);

    const authCode = Object.assign(new Error('Auth failed'), { code: 'ERR_UNAUTHORIZED' });
    const opCode = jest.fn(async () => {
      throw authCode;
    });
    await expect(withRetry(opCode, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(authCode);
    expect(opCode).toHaveBeenCalledTimes(1);

    const authName = Object.assign(new Error('Forbidden action'), { name: 'ForbiddenError' });
    const opName = jest.fn(async () => {
      throw authName;
    });
    await expect(withRetry(opName, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(authName);
    expect(opName).toHaveBeenCalledTimes(1);
  });

  test('does not retry validation errors by default', async () => {
    const valStatus400 = Object.assign(new Error('Bad request'), { status: 400 });
    const op400 = jest.fn(async () => {
      throw valStatus400;
    });
    await expect(withRetry(op400, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(valStatus400);
    expect(op400).toHaveBeenCalledTimes(1);

    const valStatus422 = Object.assign(new Error('Unprocessable entity'), { status: 422 });
    const op422 = jest.fn(async () => {
      throw valStatus422;
    });
    await expect(withRetry(op422, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(valStatus422);
    expect(op422).toHaveBeenCalledTimes(1);

    const valCode = Object.assign(new Error('Validation failed'), { code: 'VALIDATION_ERROR' });
    const opCode = jest.fn(async () => {
      throw valCode;
    });
    await expect(withRetry(opCode, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(valCode);
    expect(opCode).toHaveBeenCalledTimes(1);
  });

  test('does not retry permanent client errors or programming bugs by default', async () => {
    const notFound404 = Object.assign(new Error('Not found'), { status: 404 });
    const op404 = jest.fn(async () => {
      throw notFound404;
    });
    await expect(withRetry(op404, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(notFound404);
    expect(op404).toHaveBeenCalledTimes(1);

    const configError = new ConfigurationError('invalid options');
    const opConfig = jest.fn(async () => {
      throw configError;
    });
    await expect(withRetry(opConfig, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(configError);
    expect(opConfig).toHaveBeenCalledTimes(1);

    const typeError = new TypeError('cannot read property foo of undefined');
    const opType = jest.fn(async () => {
      throw typeError;
    });
    await expect(withRetry(opType, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(typeError);
    expect(opType).toHaveBeenCalledTimes(1);

    const explicitNonRetryable = Object.assign(new Error('explicit no retry'), {
      retryable: false,
    });
    const opNonRetry = jest.fn(async () => {
      throw explicitNonRetryable;
    });
    await expect(withRetry(opNonRetry, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(
      explicitNonRetryable,
    );
    expect(opNonRetry).toHaveBeenCalledTimes(1);
  });

  test('does not retry unclassified/unknown errors by default', async () => {
    const unknownError = new Error('some random unhandled error');
    const opUnknown = jest.fn(async () => {
      throw unknownError;
    });
    await expect(withRetry(opUnknown, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBe(
      unknownError,
    );
    expect(opUnknown).toHaveBeenCalledTimes(1);
  });

  test('retries transient failures (status 5xx, 429, 408, network codes/names)', async () => {
    // 503 Service Unavailable
    const op503 = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw Object.assign(new Error('503 error'), { status: 503 });
      return 'ok-503';
    });
    const p503 = withRetry(op503, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(p503).resolves.toBe('ok-503');
    expect(op503).toHaveBeenCalledTimes(2);

    // 429 Rate Limited
    const op429 = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw Object.assign(new Error('rate limited'), { status: 429 });
      return 'ok-429';
    });
    const p429 = withRetry(op429, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(p429).resolves.toBe('ok-429');
    expect(op429).toHaveBeenCalledTimes(2);

    // 408 Request Timeout
    const op408 = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw Object.assign(new Error('request timeout'), { status: 408 });
      return 'ok-408';
    });
    const p408 = withRetry(op408, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(p408).resolves.toBe('ok-408');
    expect(op408).toHaveBeenCalledTimes(2);

    // Network code ECONNRESET
    const opReset = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
      return 'ok-reset';
    });
    const pReset = withRetry(opReset, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(pReset).resolves.toBe('ok-reset');
    expect(opReset).toHaveBeenCalledTimes(2);

    // Fetch network failure (TypeError with "Network request failed")
    const opFetch = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw new TypeError('Network request failed');
      return 'ok-fetch';
    });
    const pFetch = withRetry(opFetch, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(pFetch).resolves.toBe('ok-fetch');
    expect(opFetch).toHaveBeenCalledTimes(2);

    // Explicit isTransient: true
    const opTransientFlag = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw Object.assign(new Error('custom transient'), { isTransient: true });
      return 'ok-flag';
    });
    const pFlag = withRetry(opTransientFlag, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(pFlag).resolves.toBe('ok-flag');
    expect(opTransientFlag).toHaveBeenCalledTimes(2);
  });

  test('allows callers to supply custom retry predicates', async () => {
    // Custom predicate retrying a 401 (e.g. token refresh scenario)
    const authErr = Object.assign(new Error('expired token'), { status: 401 });
    const opCustom = jest.fn(async (attempt: number) => {
      if (attempt === 1) throw authErr;
      return 'refreshed-token';
    });
    const pCustom = withRetry(opCustom, {
      maxAttempts: 2,
      baseDelayMs: 10,
      shouldRetry: (err) => (err as { status?: number }).status === 401,
    });
    await jest.advanceTimersByTimeAsync(100);
    await expect(pCustom).resolves.toBe('refreshed-token');
    expect(opCustom).toHaveBeenCalledTimes(2);

    // Custom predicate rejecting a 500 error (e.g. non-idempotent operation)
    const serverErr = Object.assign(new Error('server error'), { status: 500 });
    const opNo500 = jest.fn(async () => {
      throw serverErr;
    });
    await expect(
      withRetry(opNo500, {
        maxAttempts: 3,
        baseDelayMs: 10,
        shouldRetry: () => false,
      }),
    ).rejects.toBe(serverErr);
    expect(opNo500).toHaveBeenCalledTimes(1);
  });

  test('extractStatusCode safely extracts status codes from error candidates', () => {
    expect(extractStatusCode(null)).toBeUndefined();
    expect(extractStatusCode('not-an-object')).toBeUndefined();
    expect(extractStatusCode({})).toBeUndefined();
    expect(extractStatusCode({ status: '404' })).toBeUndefined();
    expect(extractStatusCode({ status: 404 })).toBe(404);
    expect(extractStatusCode({ statusCode: 500 })).toBe(500);
    expect(extractStatusCode({ response: { status: 401 } })).toBe(401);
    expect(extractStatusCode({ response: { statusCode: 503 } })).toBe(503);
  });

  test('isPermanentError and isTransientError classify various error shapes', () => {
    // Explicit permanent markers
    expect(isPermanentError(new AbortError())).toBe(true);
    expect(isPermanentError(new ConfigurationError('bad config'))).toBe(true);
    expect(isPermanentError(new RangeError('range error'))).toBe(true);
    expect(isPermanentError(new SyntaxError('syntax error'))).toBe(true);
    expect(isPermanentError(new ReferenceError('ref error'))).toBe(true);
    expect(isPermanentError(new URIError('uri error'))).toBe(true);
    expect(isPermanentError({ code: ErrorCode.ABORTED })).toBe(true);
    expect(isPermanentError({ code: ErrorCode.CONFIGURATION })).toBe(true);
    expect(isPermanentError({ code: 'UNAUTHORIZED' })).toBe(true);
    expect(isPermanentError({ name: 'AuthenticationError' })).toBe(true);
    expect(isPermanentError({ isTransient: false })).toBe(true);
    expect(isPermanentError({ transient: false })).toBe(true);
    expect(isPermanentError({ retryable: false })).toBe(true);

    // Transient indicators
    expect(isTransientError({ name: 'TimeoutError' })).toBe(true);
    expect(isTransientError({ name: 'NetworkError' })).toBe(true);
    expect(isTransientError({ name: 'FetchError' })).toBe(true);
    expect(isTransientError({ isTransient: true })).toBe(true);
    expect(isTransientError({ transient: true })).toBe(true);
    expect(isTransientError({ retryable: true })).toBe(true);
    expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
    expect(isTransientError({ message: 'connection reset by peer' })).toBe(true);
    expect(isTransientError(new TypeError('Network request failed'))).toBe(true);

    // Non-transient unknown
    expect(isTransientError(new Error('plain error'))).toBe(false);
    expect(defaultShouldRetry(new Error('plain error'))).toBe(false);
  });

  test('backoff doubles and caps at maxDelayMs', () => {
    const resolved = resolveRetryOptions({ maxAttempts: 10, baseDelayMs: 10, maxDelayMs: 25 });
    expect(computeDelayMs(1, resolved)).toBe(10);
    expect(computeDelayMs(2, resolved)).toBe(20);
    expect(computeDelayMs(3, resolved)).toBe(25);
    expect(computeDelayMs(4, resolved)).toBe(25);
  });

  test('jitter stays within [0, computedDelay]', () => {
    const resolved = resolveRetryOptions({
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 100,
      jitter: true,
    });
    for (let i = 0; i < 200; i += 1) {
      const delay = computeDelayMs(1, resolved);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(100);
    }
  });
});
