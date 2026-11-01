# API Reference

`@rn-production-toolkit/core` — Phase 1 core utilities.

All modules are JavaScript-only with **zero runtime dependencies** and no peer
dependencies. They run in any environment that supports `Promise`,
`AbortSignal`, and standard `Error`.

## errors

Typed errors with stable, machine-readable codes.

### `ErrorCode`

Stable string constants:

```ts
ErrorCode.CONFIGURATION; // 'ERR_CONFIGURATION'
ErrorCode.RETRY_EXHAUSTED; // 'ERR_RETRY_EXHAUSTED'
ErrorCode.ABORTED; // 'ERR_ABORTED'
ErrorCode.UNKNOWN; // 'ERR_UNKNOWN'
```

### `ToolkitError`

Base class for all toolkit errors. Extends `Error` and adds:

- `code: ErrorCode` (defaults to `ErrorCode.UNKNOWN`).
- `cause?: unknown` (original cause when wrapping another error).

```ts
import { ToolkitError, ErrorCode } from '@rn-production-toolkit/core';

const err = new ToolkitError('boom', { code: ErrorCode.UNKNOWN, cause: originalError });
```

### `ConfigurationError extends ToolkitError`

Thrown when a public API receives invalid configuration (code
`ERR_CONFIGURATION`).

### `AbortError extends ToolkitError`

Thrown when an operation is cancelled via an `AbortSignal` (code
`ERR_ABORTED`).

### Normalizers

- `normalizeError(value: unknown, fallbackMessage?): Error` — coerce any thrown
  value into a native `Error`.
- `asToolkitError(value: unknown): ToolkitError` — coerce into a `ToolkitError`;
  already-toolkit errors pass through unchanged.

> Errors never embed secrets or full request headers.

## retry

### `withRetry<T>(operation, options): Promise<T>`

Runs `operation(attempt)` and retries on failure per `options`.

```ts
import { withRetry } from '@rn-production-toolkit/core';

const data = await withRetry(
  async (attempt) => apiFetch(`/items?page=${attempt}`),
  { maxAttempts: 4, baseDelayMs: 200, maxDelayMs: 3000, jitter: true },
);
```

Behavior:

- `maxAttempts` includes the first attempt. `1` means "try once, never retry".
- Retrying is opt-in: call this function and provide a policy. There are no
  hidden retries beyond the configured `maxAttempts`.
- **Predicate rejection:** if `shouldRetry` returns `false`, the **original**
  error is rethrown unchanged.
- **Exhaustion:** when `maxAttempts` is reached, a `RetryError` is thrown whose
  `cause` and `lastError` are the original final error.
- **Cancellation:** if `signal` aborts before an attempt or during a backoff
  delay, an `AbortError` is thrown. If the signal is already aborted, `operation`
  is never invoked.

#### `RetryOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | *(required)* | Positive integer including the first attempt. |
| `baseDelayMs` | `number` | `100` | Base backoff in ms (finite, `>= 0`). |
| `maxDelayMs` | `number` | `5000` | Cap in ms (`> 0` and `>= baseDelayMs`). |
| `jitter` | `boolean` | `false` | Full jitter over `[0, computedDelay]`. |
| `signal` | `AbortSignal` | — | Cancel pending retries. |
| `shouldRetry` | `(error, attempt) => boolean` | `defaultShouldRetry` | Decide retryability. Conservative by default. |

Invalid options throw `ConfigurationError`.

> **Conservative default policy & Idempotency:** only retry operations that are safe to call more than once.
> By default, `defaultShouldRetry` rejects permanent errors (HTTP 4xx client errors, authentication 401/403,
> validation 400/422, configuration errors, and programming errors like `TypeError`) as well as unclassified/unknown
> errors. Only recognized transient errors (HTTP 408/429/5xx, network drops, connection resets, and timeouts)
> are retried. To customize, provide a custom `shouldRetry` predicate.

### `RetryError`

Thrown on exhaustion. Properties: `attempts`, `lastError`, `cause`.

### Retry helpers (also exported)

- `resolveRetryOptions(options)` — validate and apply defaults.
- `computeDelayMs(attempt, resolvedOptions)` — compute the backoff delay.
- `defaultShouldRetry(error, attempt)` — default conservative predicate.
- `isTransientError(error)` — test whether an error is transient.
- `isPermanentError(error)` — test whether an error is permanent.
- `extractStatusCode(error)` — safely extract numeric HTTP status.
- `DEFAULT_BASE_DELAY_MS` / `DEFAULT_MAX_DELAY_MS`.

## logger

### `Logger` interface

```ts
interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}
```

### `createConsoleLogger(options?): Logger`

```ts
import { createConsoleLogger } from '@rn-production-toolkit/core';

const logger = createConsoleLogger({ level: 'warn', redaction: { keys: ['session'] } });
logger.warn('request failed', { path: '/x', token: 'secret-value' });
// => request failed {"path":"/x","token":"[REDACTED]"}
```

Options (`ConsoleAdapterOptions`):

- `level` — minimum level to emit (default `'debug'`).
- `redaction` — `{ keys?: string[]; replaceWith?: string }`.
- `sink` — an injectable console-like object (defaults to `console`); used for
  testing and adapting.

### Redaction

Metadata is redacted **by default** for common sensitive keys
(case-insensitive): `authorization`, `auth`, `token`, `accesstoken`,
`refreshtoken`, `password`, `passwd`, `secret`, `apikey`, `api_key`,
`clientsecret`, `client_secret`, `cookie`, `privatekey`.

- `createRedactor(config?)` — build a `Redactor`.
- `redactValue(value, redactor)` — serialize safely to a string (redacts, and
  handles circular references, depth bounds, BigInt, function, symbol, Date,
  RegExp, Error, Map, Set, `null`, `undefined`).

Redaction applies to structured `meta`, not to the free-form message string.
Never rely on the logger to scrub secrets from message text — keep secrets out
of messages.

### `createNoopLogger()`

A logger that performs no work; useful as a safe default.

## lifecycle

Injectable React Native `AppState` adapter with explicit cleanup.

### `AppStateStatus`

```ts
type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown';
```

### `AppStateAdapter`

```ts
interface AppStateAdapter {
  getCurrent(): AppStateStatus;
  subscribe(listener: (status: AppStateStatus) => void): () => void;
}
```

### `createAppStateTracker(adapter)`

```ts
import { createAppStateTracker, type AppStateAdapter, type AppStateStatus } from '@rn-production-toolkit/core';

// Provide a real adapter backed by React Native's AppState.
const rnAdapter: AppStateAdapter = {
  getCurrent: () => AppState.currentState as AppStateStatus,
  subscribe: (listener) => {
    const sub = AppState.addEventListener('change', (next) => listener(next as AppStateStatus));
    return () => sub.remove();
  },
};

const tracker = createAppStateTracker(rnAdapter);
const off = tracker.onChange((status) => console.log('state:', status));
// ...
off(); // stop one listener
tracker.dispose(); // unsubscribe from the adapter and clear all listeners
```

Behavior:

- The tracker subscribes to the adapter at creation and exposes
  `getCurrent()`, `onChange(listener)` (returns an unsubscribe function), and
  `dispose()`.
- Identical state transitions are deduplicated (listeners are not notified
  when the state does not actually change).
- There are **no module-level subscriptions**: create a tracker when you need
  it and call `dispose()` when you are done.

## network

Connectivity adapter with an honest contract.

> Connectivity state is an **estimate**, never proof that a specific host or
> service is reachable. Do not use an `online` state alone to assume an
> endpoint will respond.

### Types

```ts
type ConnectionStatus = 'online' | 'offline' | 'unknown';
interface NetworkSnapshot {
  status: ConnectionStatus;
  isInternetReachable?: boolean;
  connectionType?: NetworkConnectionType;
}
```

### `NetworkProvider`

```ts
interface NetworkProvider {
  getSnapshot(): NetworkSnapshot;
  subscribe(listener: (snapshot: NetworkSnapshot) => void): () => void;
}
```

Consumers wire their chosen network-information library (for example a
NetInfo-style provider) behind this interface.

### `statusFromReachability(reachable)`

Maps a boolean reachability flag to a status: `true` → `online`, `false` →
`offline`, `undefined` → `unknown`.

### `createConnectivityTracker(provider)`

```ts
import { createConnectivityTracker } from '@rn-production-toolkit/core';

const tracker = createConnectivityTracker(provider);
const off = tracker.onChange((snapshot) => console.log(snapshot.status));
// ...
off();
tracker.dispose();
```

Behavior mirrors `createAppStateTracker`: binds on creation, deduplicates
unchanged snapshots, and requires `dispose()` for cleanup.

## device

Privacy-minimizing device/runtime information.

### `RuntimeInfo`

```ts
interface RuntimeInfo {
  platform: PlatformName;
  osVersion?: string;
  locale?: string;
  isHeadless?: boolean;
}
```

No persistent identifiers, advertising IDs, or fingerprinting fields are ever
collected or exposed.

### `PlatformAdapter` and `resolveRuntimeInfo(adapter)`

```ts
interface PlatformAdapter {
  getPlatform(): PlatformName;
  getOSVersion?(): string | undefined;
  getLocale?(): string | undefined;
  isHeadless?(): boolean | undefined;
}
```

`resolveRuntimeInfo(adapter)` returns a `RuntimeInfo`; optional adapter
accessors that are not implemented simply yield `undefined`.

## Platform notes

- All core modules (Phase 1 utilities plus the Phase 2 adapter contracts) are
  framework-independent and run under Node and React Native's JavaScript
  runtime.
- The core package bundles **no native module** and performs no telemetry,
  storage, or network calls.
- The React Native bindings for `lifecycle`/`network`/`device` are injectable
  via the adapter interfaces above; concrete integrations are consumer-provided
  and will be demonstrated in the Phase 3 example app.

## Development

See the repository [README](../README.md) and
[`COMPATIBILITY.md`](COMPATIBILITY.md), and
[`DECISIONS.md`](DECISIONS.md).
