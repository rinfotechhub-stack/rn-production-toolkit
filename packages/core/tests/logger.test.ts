import { createConsoleLogger, createNoopLogger, createRedactor, redactValue } from '../src';
import type { Sink } from '../src';

function makeSink(): Sink {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function firstCallArg(sink: Sink, method: 'debug' | 'info' | 'warn' | 'error'): string {
  const mock = sink[method] as jest.Mock;
  return mock.mock.calls[0]?.[0] as string;
}

describe('redaction', () => {
  test('redacts default sensitive keys case-insensitively', () => {
    const redactor = createRedactor();
    const out = redactValue(
      {
        authorization: 'Bearer abc',
        password: 'hunter2',
        apiKey: 'key1',
        api_key: 'key2',
        safe: 'visible',
        nested: { token: 'tok-value', ok: 1 },
      },
      redactor,
    );

    expect(out).not.toContain('abc');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('key1');
    expect(out).not.toContain('key2');
    expect(out).not.toContain('tok-value');
    expect(out).toContain('visible');
    expect(out).toContain('"ok": 1');
    expect(out).toContain('[REDACTED]');
  });

  test('supports custom keys and replacement text', () => {
    const redactor = createRedactor({ keys: ['customSecret'], replaceWith: '[***]' });
    const out = redactValue({ customSecret: 'x', password: 'y' }, redactor);
    expect(out).toContain('[***]');
    expect(out).not.toContain('x');
    expect(out).not.toContain('y');
  });

  test('redacts all required authentication header aliases and variations (M4)', () => {
    const redactor = createRedactor();
    const payload = {
      'X-Api-Key': 'secret-api-key-1',
      'x-api-key': 'secret-api-key-2',
      'X-Auth-Token': 'secret-auth-token-1',
      'x-auth-token': 'secret-auth-token-2',
      'X-Access-Token': 'secret-access-token-1',
      Authorization: 'Bearer secret-bearer-token',
      'Proxy-Authorization': 'Basic secret-proxy-auth',
      'proxy-authorization': 'Basic secret-proxy-auth-lower',
      'x-API-key': 'secret-mixed-case',
      'PROXY-AUTHORIZATION': 'Basic secret-proxy-upper',
      headers: {
        nested: {
          'X-Api-Key': 'nested-api-key',
          Authorization: 'nested-auth',
        },
      },
      // Non-sensitive values that must NOT be redacted
      'Content-Type': 'application/json',
      Accept: '*/*',
      'User-Agent': 'RN-App/1.0',
      Host: 'api.example.com',
      safeField: 'regular-data',
    };

    const out = redactValue(payload, redactor);

    // Verify all sensitive values are REDACTED
    expect(out).not.toContain('secret-api-key-1');
    expect(out).not.toContain('secret-api-key-2');
    expect(out).not.toContain('secret-auth-token-1');
    expect(out).not.toContain('secret-auth-token-2');
    expect(out).not.toContain('secret-access-token-1');
    expect(out).not.toContain('secret-bearer-token');
    expect(out).not.toContain('secret-proxy-auth');
    expect(out).not.toContain('secret-proxy-auth-lower');
    expect(out).not.toContain('secret-mixed-case');
    expect(out).not.toContain('secret-proxy-upper');
    expect(out).not.toContain('nested-api-key');
    expect(out).not.toContain('nested-auth');

    // Verify non-sensitive values are safely preserved
    expect(out).toContain('application/json');
    expect(out).toContain('*/*');
    expect(out).toContain('RN-App/1.0');
    expect(out).toContain('api.example.com');
    expect(out).toContain('regular-data');
  });

  test('normalizes custom configured keys with hyphens and casing', () => {
    const redactor = createRedactor({ keys: ['My-Custom-Header'] });
    const out = redactValue(
      {
        'My-Custom-Header': 'custom-val-1',
        'my-custom-header': 'custom-val-2',
        my_custom_header: 'custom-val-3',
        'MY-CUSTOM-HEADER': 'custom-val-4',
        'safe-header': 'safe-value',
      },
      redactor,
    );

    expect(out).not.toContain('custom-val-1');
    expect(out).not.toContain('custom-val-2');
    expect(out).not.toContain('custom-val-3');
    expect(out).not.toContain('custom-val-4');
    expect(out).toContain('safe-value');
  });

  test('handles circular references in Maps and Sets without crashing', () => {
    const redactor = createRedactor();
    const circularMap = new Map<unknown, unknown>();
    circularMap.set('self', circularMap);
    circularMap.set('token', 'secret-tok');

    const circularSet = new Set<unknown>();
    circularSet.add(circularSet);

    expect(() => redactValue(circularMap, redactor)).not.toThrow();
    expect(() => redactValue(circularSet, redactor)).not.toThrow();

    const mapOut = redactValue(circularMap, redactor);
    expect(mapOut).toContain('[Circular]');
    expect(mapOut).not.toContain('secret-tok');

    const setOut = redactValue(circularSet, redactor);
    expect(setOut).toContain('[Circular]');
  });

  test('bounds maximum nesting depth safely with [MaxDepth]', () => {
    const redactor = createRedactor();
    let deep: Record<string, unknown> = { level: 12 };
    for (let i = 0; i < 15; i += 1) {
      deep = { next: deep };
    }

    const out = redactValue(deep, redactor);
    expect(out).toContain('[MaxDepth]');
  });

  test('handles circular references without throwing', () => {
    const redactor = createRedactor();

    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const arr: unknown[] = [1];
    arr.push(arr);

    expect(() => redactValue(obj, redactor)).not.toThrow();
    expect(() => redactValue(arr, redactor)).not.toThrow();
    expect(redactValue(obj, redactor)).toContain('[Circular]');
    expect(redactValue(arr, redactor)).toContain('[Circular]');
  });

  test('handles unusual values without throwing or leaking', () => {
    const redactor = createRedactor();
    const meta = {
      big: 123n,
      fn: () => 1,
      sym: Symbol('x'),
      nil: null,
      undef: undefined,
      date: new Date('2020-01-01T00:00:00Z'),
      rx: /ab+c/gi,
      err: new Error('oops'),
      map: new Map<unknown, unknown>([
        ['token', 'secret'],
        [123, 'number-key-value'],
      ]),
      set: new Set([1, 2]),
    };

    const out = redactValue(meta, redactor);
    expect(out).toContain('123n');
    expect(out).toContain('[Function]');
    expect(out).toContain('[Symbol]');
    expect(out).toContain('null');
    expect(out).toContain('undefined');
    expect(out).toContain('2020-01-01T00:00:00.000Z');
    expect(out).toContain('/ab+c/gi');
    expect(out).toContain('oops');
    expect(out).toContain('1, 2');
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('secret');
  });
});

describe('console logger', () => {
  test('writes redacted metadata to the sink', () => {
    const sink = makeSink();
    const logger = createConsoleLogger({ sink });
    logger.info('login', { username: 'alice', password: 'secret123' });

    expect(sink.info).toHaveBeenCalledTimes(1);
    const line = firstCallArg(sink, 'info');
    expect(line).toContain('login');
    expect(line).toContain('alice');
    expect(line).not.toContain('secret123');
    expect(line).toContain('[REDACTED]');
  });

  test('respects the minimum level threshold', () => {
    const sink = makeSink();
    const logger = createConsoleLogger({ sink, level: 'warn' });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalled();
    expect(sink.error).toHaveBeenCalled();
  });

  test('omits the meta suffix when meta is undefined', () => {
    const sink = makeSink();
    const logger = createConsoleLogger({ sink });
    logger.error('plain');
    expect(firstCallArg(sink, 'error')).toBe('plain');
  });
});

describe('noop logger', () => {
  test('performs no work without throwing', () => {
    const logger = createNoopLogger();
    expect(() => {
      logger.debug('a');
      logger.info('b');
      logger.warn('c');
      logger.error('d', { password: 'x' });
    }).not.toThrow();
  });
});
