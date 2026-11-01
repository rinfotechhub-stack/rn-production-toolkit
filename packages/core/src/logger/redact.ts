import type { RedactionConfig } from './types';

const DEFAULT_SENSITIVE_KEYS = [
  'authorization',
  'proxy-authorization',
  'proxyauthorization',
  'auth',
  'token',
  'accesstoken',
  'access-token',
  'access_token',
  'x-access-token',
  'xaccesstoken',
  'refreshtoken',
  'refresh-token',
  'refresh_token',
  'password',
  'passwd',
  'secret',
  'apikey',
  'api-key',
  'api_key',
  'x-api-key',
  'xapikey',
  'x-auth-token',
  'xauthtoken',
  'clientsecret',
  'client-secret',
  'client_secret',
  'cookie',
  'set-cookie',
  'privatekey',
  'private-key',
  'private_key',
];

const DEFAULT_REPLACE_WITH = '[REDACTED]';

const MAX_DEPTH = 10;
const CIRCULAR = '[Circular]';
const MAX_DEPTH_REACHED = '[MaxDepth]';

/**
 * Safely normalize a header or object key for sensitive-key matching.
 * Lowercases the string and strips hyphens and underscores.
 * E.g. 'X-Api-Key' -> 'xapikey', 'Proxy-Authorization' -> 'proxyauthorization'.
 */
export function normalizeSensitiveKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

/**
 * Compiled redaction rules. Immutable after creation.
 */
export interface Redactor {
  keys: Set<string>;
  replaceWith: string;
}

/**
 * Build a {@link Redactor} from user configuration merged with the safe
 * defaults.
 */
export function createRedactor(config: RedactionConfig = {}): Redactor {
  const keys = new Set<string>();
  for (const key of DEFAULT_SENSITIVE_KEYS) {
    keys.add(key.toLowerCase());
    keys.add(normalizeSensitiveKey(key));
  }
  for (const key of config.keys ?? []) {
    keys.add(key.toLowerCase());
    keys.add(normalizeSensitiveKey(key));
  }
  return {
    keys,
    replaceWith: config.replaceWith ?? DEFAULT_REPLACE_WITH,
  };
}

/**
 * Serialize an arbitrary value to a string for logging.
 *
 * - Redacts values stored under sensitive keys (case-insensitive).
 * - Handles circular references and excessive depth without throwing.
 * - Safely renders unusual values (BigInt, function, symbol, Error, Date,
 *   RegExp, Map, Set, null, undefined).
 *
 * Never throws; returns a bounded string in all cases.
 */
export function redactValue(value: unknown, redactor: Redactor): string {
  return stringify(value, redactor, new WeakSet<object>(), 0);
}

function isSensitive(key: string, redactor: Redactor): boolean {
  const lower = key.toLowerCase();
  return redactor.keys.has(lower) || redactor.keys.has(normalizeSensitiveKey(key));
}

function stringify(
  value: unknown,
  redactor: Redactor,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }

  const type = typeof value;
  if (type === 'string') {
    return JSON.stringify(value);
  }
  if (type === 'number' || type === 'boolean') {
    return String(value);
  }
  if (type === 'bigint') {
    return `${String(value)}n`;
  }
  if (type === 'function') {
    return '[Function]';
  }
  if (type === 'symbol') {
    return '[Symbol]';
  }

  if (depth > MAX_DEPTH) {
    return MAX_DEPTH_REACHED;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value instanceof RegExp) {
    return String(value);
  }
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message });
  }

  if (Array.isArray(value)) {
    return stringifyArray(value, redactor, seen, depth);
  }

  if (value instanceof Map) {
    return stringifyMap(value, redactor, seen, depth);
  }

  if (value instanceof Set) {
    return stringifySet(value, redactor, seen, depth);
  }

  if (type === 'object') {
    return stringifyObject(value as Record<string, unknown>, redactor, seen, depth);
  }

  return String(value);
}

function stringifyArray(
  value: unknown[],
  redactor: Redactor,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);
  const items = value.map((item) => stringify(item, redactor, seen, depth + 1));
  seen.delete(value);
  return `[${items.join(', ')}]`;
}

function stringifyMap(
  value: Map<unknown, unknown>,
  redactor: Redactor,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);
  const entries: string[] = [];
  for (const [key, item] of value.entries()) {
    const keyString = typeof key === 'string' ? key : String(key);
    const rendered = isSensitive(keyString, redactor)
      ? redactor.replaceWith
      : stringify(item, redactor, seen, depth + 1);
    entries.push(`${JSON.stringify(keyString)}: ${rendered}`);
  }
  seen.delete(value);
  return `{${entries.join(', ')}}`;
}

function stringifySet(
  value: Set<unknown>,
  redactor: Redactor,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);
  const items = Array.from(value, (item) => stringify(item, redactor, seen, depth + 1));
  seen.delete(value);
  return `[${items.join(', ')}]`;
}

function stringifyObject(
  value: Record<string, unknown>,
  redactor: Redactor,
  seen: WeakSet<object>,
  depth: number,
): string {
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);
  const entries: string[] = [];
  for (const key of Object.keys(value)) {
    const rendered = isSensitive(key, redactor)
      ? redactor.replaceWith
      : stringify(value[key], redactor, seen, depth + 1);
    entries.push(`${JSON.stringify(key)}: ${rendered}`);
  }
  seen.delete(value);
  return `{${entries.join(', ')}}`;
}
