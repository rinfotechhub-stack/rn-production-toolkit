# Architecture — rn-production-toolkit

`rn-production-toolkit` is a modular, zero-runtime-dependency TypeScript library designed to address recurring production reliability concerns in React Native applications.

---

## 1. Core Architectural Principles

1. **Framework Independence & Zero Native Dependencies**  
   The core package (`@rn-production-toolkit/core`) is pure JavaScript and TypeScript. It does not link native C++/Java/Objective-C code or impose peer dependencies on specific React Native versions.
2. **Dependency Injection (Contract-First Adapters)**  
   Features that interface with device or OS subsystems (`AppState`, connectivity, platform runtime) are designed as contracts. Consumers inject real platform providers or test fakes.
3. **Safe & Conservative by Default**  
   - Errors are typed and preserve underlying causes.
   - Retries are bounded and reject permanent errors (4xx, authentication, validation, programming bugs) by default.
   - Logging redaction handles circular graphs and bounds recursion depth.
4. **Strict TypeScript**  
   Compiled with strict TypeScript settings (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noImplicitAny: true`). Public APIs have complete type definitions.
5. **Dual-Module Interoperability**  
   Distributes standard CommonJS artifacts with full support for ECMAScript Module (ESM) named/default imports and Metro bundler resolution.

---

## 2. System Architecture

```text
rn-production-toolkit/
├── packages/core/              # @rn-production-toolkit/core (Zero runtime dependencies)
│   ├── src/
│   │   ├── errors/             # Typed errors & stable error codes
│   │   ├── retry/              # Exponential backoff & conservative retry policy
│   │   ├── logger/             # Pluggable logging & safe-by-default redaction
│   │   ├── lifecycle/          # AppState contract & transition tracking
│   │   ├── network/            # Connectivity provider contract & reachability mapping
│   │   ├── device/             # Privacy-minimizing runtime info resolver
│   │   └── index.ts            # Public entry barrel
│   ├── tests/                  # Unit and consumer smoke tests
│   └── package.json
└── examples/bare-react-native/ # Minimal React Native app demonstrating concrete adapters
```

---

## 3. Implemented Modules

### 3.1 `errors` — Typed Error Hierarchy
- **Base Class:** `ToolkitError` (inherits from native `Error` with cause support).
- **Subclasses:**
  - `ConfigurationError`: Thrown on invalid options or parameter misuse (`code: 'ERR_CONFIGURATION'`).
  - `AbortError`: Thrown when an operation is cancelled via an `AbortSignal` (`code: 'ERR_ABORTED'`).
  - `RetryError`: Thrown when a retry operation exhausts maximum attempts (`code: 'ERR_RETRY_EXHAUSTED'`). Contains `attempts`, `lastError`, and `cause`.
- **Error Codes:** Stable string enum via `ErrorCode` (`as const`).
- **Normalizers:**
  - `normalizeError(error, fallbackMessage)`: Coerces unknown thrown values into native `Error` objects.
  - `asToolkitError(error)`: Wraps arbitrary values into typed `ToolkitError` instances while preserving the original cause.

### 3.2 `retry` — Resilient Backoff & Policy
- **`withRetry<T>(operation, options)`**:
  - Requires explicit `maxAttempts` (>= 1, includes the first attempt).
  - Exponential backoff calculation: `min(maxDelayMs, baseDelayMs * 2^(attempt - 1))`.
  - Optional full jitter across `[0, computedDelay]`.
  - Early abort check and cancellation during backoff delays via `AbortSignal`.
- **Default Policy (`defaultShouldRetry`)**:
  - Conservative by default: permanent errors (HTTP 4xx client errors like 401, 403, 400, 422, 404, programming `TypeError`s, `ConfigurationError`, `AbortError`) and unclassified/unknown errors are **not** retried.
  - Only recognized transient failures are retried (HTTP 408, 429, 5xx server errors, network connection drops like `ECONNRESET`, timeouts, and React Native fetch failures).
  - Callers can supply a custom predicate via `shouldRetry: (error, attempt) => boolean`.
- **Exported Utilities:** `computeDelayMs`, `resolveRetryOptions`, `defaultShouldRetry`, `isPermanentError`, `isTransientError`, and `extractStatusCode`.

### 3.3 `logger` — Pluggable Logging & Bounded Redaction
- **Contracts:** `Logger` (`debug`, `info`, `warn`, `error`) and `Sink` (injectable output target).
- **Implementations:**
  - `createConsoleLogger(options)`: Console logger with level filtering (`debug` < `info` < `warn` < `error`) and automated metadata redaction.
  - `createNoopLogger()`: Silent logger for test suites or disabled environments.
- **Redaction Engine (`redactValue`, `createRedactor`)**:
  - Built-in sensitive key registry covering passwords, tokens, API keys, secrets, cookies, and HTTP authentication header aliases (`X-Api-Key`, `X-Auth-Token`, `X-Access-Token`, `Authorization`, `Proxy-Authorization`).
  - Safe key normalization via `normalizeSensitiveKey` (case-insensitive and insensitive to hyphens/underscores).
  - Non-sensitive keys (e.g. `Content-Type`, `Accept`, `User-Agent`) are preserved.
  - Protection guards: Circular references are replaced with `[Circular]` via `WeakSet`; recursion depth is capped at `[MaxDepth]` (depth 10).

### 3.4 `lifecycle` — AppState Tracking Contract
- **Contract:** `AppStateAdapter` (`getCurrent()`, `subscribe(listener)`).
- **Tracker:** `createAppStateTracker(adapter)`:
  - Deduplicates state transitions (`'active'`, `'background'`, `'inactive'`, `'unknown'`).
  - Provides a live `getCurrent()` snapshot.
  - `onChange(listener)` returns an explicit unsubscribe callback.
  - `dispose()` cleans up internal listeners and unsubscribes from the injected adapter.
  - No module-level side effects or background timers.

### 3.5 `network` — Connectivity Contract & Mapping
- **Contract:** `NetworkProvider` (`getSnapshot()`, `subscribe(listener)`).
- **Tracker:** `createConnectivityTracker(provider)`:
  - Deduplicates state transitions using `snapshotsEqual`.
  - Normalizes boolean reachability to stable `ConnectionStatus` (`'online'`, `'offline'`, `'unknown'`) via `statusFromReachability`.
  - `onChange(listener)` returns an unsubscribe callback.
  - `dispose()` detaches listeners and tears down the provider subscription.
  - Connectivity is treated as a local network estimate, never proof of end-to-end endpoint reachability.

### 3.6 `device` — Privacy-Minimizing Runtime Resolver
- **Contract:** `PlatformAdapter` (`getPlatform()`, `getOSVersion()`, `getLocale()`, `isHeadless()`).
- **Resolver:** `resolveRuntimeInfo(adapter)`:
  - Collects only privacy-preserving execution context: `platform` (`'ios' | 'android' | 'web' | 'windows' | 'macos' | 'unknown'`), `osVersion`, `locale`, and `isHeadless`.
  - Zero hardware fingerprinting, zero persistent IDs, zero MAC addresses, zero advertising IDs.

---

## 4. Packaging and Distribution Architecture

- **Root Package:** Monorepo root manages tooling (ESLint, Prettier, Jest, TypeScript).
- **Core Package (`packages/core`)**:
  - Published to npm under `@rn-production-toolkit/core`.
  - Tarball contains only `dist/`, `package.json`, `LICENSE`, and `README.md`.
  - Build output includes TypeScript declaration files (`.d.ts`), JavaScript files (`.js`), and declaration source maps (`.js.map`).
  - `sideEffects: false` declared for tree-shaking optimization.
- **Example App (`examples/bare-react-native`)**:
  - Independent, self-contained TypeScript configuration referencing the built core package.
  - Demonstrates real adapters backed by React Native's `AppState` and `Platform`.

