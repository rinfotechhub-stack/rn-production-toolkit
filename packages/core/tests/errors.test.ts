import {
  ToolkitError,
  ConfigurationError,
  AbortError,
  ErrorCode,
  normalizeError,
  asToolkitError,
} from '../src';

describe('errors module', () => {
  test('exposes stable error codes', () => {
    expect(ErrorCode.CONFIGURATION).toBe('ERR_CONFIGURATION');
    expect(ErrorCode.RETRY_EXHAUSTED).toBe('ERR_RETRY_EXHAUSTED');
    expect(ErrorCode.ABORTED).toBe('ERR_ABORTED');
    expect(ErrorCode.UNKNOWN).toBe('ERR_UNKNOWN');
  });

  test('ToolkitError carries name, code and optional cause', () => {
    const cause = new Error('root');
    const err = new ToolkitError('boom', { code: ErrorCode.UNKNOWN, cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ToolkitError');
    expect(err.code).toBe(ErrorCode.UNKNOWN);
    expect(err.message).toBe('boom');
    expect(err.cause).toBe(cause);
  });

  test('ToolkitError defaults code to UNKNOWN', () => {
    expect(new ToolkitError('x').code).toBe(ErrorCode.UNKNOWN);
  });

  test('subclasses report their own name and code', () => {
    const config = new ConfigurationError('bad');
    expect(config.name).toBe('ConfigurationError');
    expect(config.code).toBe(ErrorCode.CONFIGURATION);

    const abort = new AbortError();
    expect(abort.name).toBe('AbortError');
    expect(abort.code).toBe(ErrorCode.ABORTED);
  });

  test('normalizeError handles Error, string and unknown values', () => {
    const error = new Error('e');
    expect(normalizeError(error)).toBe(error);

    const fromString = normalizeError('string');
    expect(fromString).toBeInstanceOf(Error);
    expect(fromString.message).toBe('string');

    expect(normalizeError(42).message).toBe('Unknown error');
  });

  test('asToolkitError wraps non-toolkit values and preserves cause', () => {
    const raw = new Error('raw');
    const wrapped = asToolkitError(raw);
    expect(wrapped).toBeInstanceOf(ToolkitError);
    expect(wrapped.code).toBe(ErrorCode.UNKNOWN);
    expect(wrapped.cause).toBe(raw);

    const toolkit = new ConfigurationError('c');
    expect(asToolkitError(toolkit)).toBe(toolkit);
  });
});
