# v0.1.0 — Release notes (draft)

> Draft for maintainer review. Do not publish until verified and authorized.

## Summary

Initial release of `@rn-production-toolkit/core`: a small, typed, zero-runtime-
dependency collection of React Native production utilities and adapter
contracts.

## What's included

- **errors** — `ErrorCode`, `ToolkitError`, `ConfigurationError`, `AbortError`,
  `normalizeError`, `asToolkitError`.
- **retry** — `withRetry` (validated options, capped exponential backoff,
  optional jitter, `AbortSignal` cancellation, caller-defined `shouldRetry`,
  `RetryError` preserving the original cause).
- **logger** — `Logger`, `createConsoleLogger`, `ConsoleAdapter`, safe-by-default
  redaction (`createRedactor`, `redactValue`), `createNoopLogger`.
- **lifecycle** — `AppStateStatus`, `AppStateAdapter`, `createAppStateTracker`.
- **network** — `NetworkSnapshot`, `NetworkProvider`, `statusFromReachability`,
  `snapshotsEqual`, `createConnectivityTracker`.
- **device** — `RuntimeInfo`, `PlatformAdapter`, `resolveRuntimeInfo`.

## Compatibility

- Runtime: any environment with `Promise`, `AbortSignal`, and `Error`; Node >= 20
  for tooling. Zero runtime dependencies and no peer dependencies.
- React Native: the adapter modules are injectable contracts; concrete RN
  bindings are consumer-provided and require on-device validation before
  claiming specific RN-version compatibility.

## Known limitations

- Full React Native device builds (`npm run ios`/`npm run android`) are a
  manual, on-device step.
- The `@rn-production-toolkit` scope and package name must be owned on the npm
  registry before publishing.

## Install (once published)

```bash
npm install @rn-production-toolkit/core
```

See `docs/API.md` for the full API reference and `CHANGELOG.md` for history.
