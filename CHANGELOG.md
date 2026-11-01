# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed (Audit Remediation)

- **M1 — ESM package exports:** Added `"import"`, `"require"`, and `"default"` export conditions to `packages/core/package.json`. Added dual-module consumer smoke tests for ESM named/default imports and CommonJS require.
- **M2 — Conservative retry default policy:** Replaced permissive retry default (`() => true`) with conservative `defaultShouldRetry`. Permanent errors (HTTP 4xx client errors, 401 Unauthorized, 403 Forbidden, 400 Bad Request, 422 Unprocessable Entity, 404 Not Found, configuration errors, programming `TypeError`) and unclassified/unknown errors are NOT retried by default. Only identifiable transient errors (HTTP 408, 429, 5xx, network resets/timeouts) are retried. Exported `defaultShouldRetry`, `isPermanentError`, `isTransientError`, and `extractStatusCode`.
- **M3 — Example TypeScript dependency and self-contained config:** Declared `@react-native/typescript-config` in example app `devDependencies` and created a self-contained modern React Native `tsconfig.json` (`jsx: react-native`, `moduleResolution: bundler`, `lib: ["es2019", "dom"]`). Fixed AppStateStatus type mapping in example `src/appStateAdapter.ts`.
- **M4 — Logger sensitive header aliases & safe normalization:** Extended default sensitive keys and added `normalizeSensitiveKey()` to support authentication header aliases (`X-Api-Key`, `x-api-key`, `X-Auth-Token`, `x-auth-token`, `X-Access-Token`, `Authorization`, `Proxy-Authorization`) case-insensitively and regardless of hyphens/underscores, while preserving non-sensitive values and handling circular Maps/Sets and maximum depth.
- **M5 — CI example validation:** Enhanced `.github/workflows/ci.yml` to include example dependency installation, example TypeScript check, core demo execution, package unit tests with coverage gate, and consumer smoke tests.
- **L1 — Retry cancellation edge cases:** Addressed edge cases in `sleepWithAbort` (handling already-aborted signals during zero delay and backoff) with regression tests.
- **L2 — Jest coverage threshold:** Enforced 90% coverage threshold across statements, branches, functions, and lines in `jest.config.js`. Coverage achieved: 99.71% statements, 97.5% branch, 94.59% functions, 99.7% lines.
- **L3 — Documentation phase labels:** Fixed stale Phase 1/Phase 3 references in `README.md` and module entry points.
- **L4 — Package repository metadata:** Added `repository`, `homepage`, and `bugs` fields pointing to GitHub repository URL in package manifests.
- **L5 — Runtime retry option validation:** Added runtime type guards for `options`, `jitter`, `signal`, and `shouldRetry` in `resolveRetryOptions`.
- **L6 — Toolchain alignment:** Reviewed TypeScript toolchain compatibility for TypeScript 6 / 5.4.

### Added (Phase 0 — foundation)

- npm workspaces with a single core package `@rn-production-toolkit/core`.
- Strict TypeScript configuration (`tsconfig.base.json`).
- ESLint 10 flat config with `typescript-eslint` and Prettier integration.
- Prettier formatting configuration.
- Jest test runner with `ts-jest` and structural foundation tests.
- `tsc` package build producing `dist/` with type declarations.
- Root scripts for build, test, lint, typecheck, and format.
- Community files: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE
  (MIT), CHANGELOG.
- Documentation: `docs/API.md`, `docs/COMPATIBILITY.md`, `docs/DECISIONS.md`.
- GitHub issue templates, pull-request template, and CI workflow.
- `.gitignore` and secret-scanning guidance.

### Added (Phase 1 — core utilities)

- `errors`: `ErrorCode`, `ToolkitError`, `ConfigurationError`, `AbortError`,
  `normalizeError`, `asToolkitError`.
- `retry`: `withRetry` with validated options, capped exponential backoff,
  optional jitter, `AbortSignal` cancellation, a caller-defined `shouldRetry`
  predicate, and `RetryError` that preserves the original cause. Backoff
  helpers `resolveRetryOptions` / `computeDelayMs`.
- `logger`: `Logger` interface, `createConsoleLogger`, `ConsoleAdapter`,
  safe-by-default redaction (`createRedactor`, `redactValue`), and
  `createNoopLogger`.
- Unit tests covering success, transient failures, max-attempt exhaustion,
  predicate rejection, abort before/during attempts, backoff cap, jitter
  bounds, option validation, redaction (default/custom/nested/circular/unusual
  values), level thresholds, and type-level contracts.

### Added (Phase 2 — React Native adapter contracts)

- `lifecycle`: `AppStateStatus`, `AppStateAdapter`, `createAppStateTracker` with
  deduplicated transitions and explicit `dispose()` cleanup.
- `network`: `NetworkSnapshot`, `ConnectionStatus`, `NetworkConnectionType`,
  `NetworkProvider`, `statusFromReachability`, `snapshotsEqual`, and
  `createConnectivityTracker`.
- `device`: `RuntimeInfo`, `PlatformName`, `PlatformAdapter`, and
  `resolveRuntimeInfo`.
- Unit tests using fake adapters for subscription setup/cleanup, transitions,
  deduplication, missing optional provider behavior, provider isolation, and
  privacy contract checks (no identifier fields). Type-level tests extended.

### Added (Phase 3 — example app and developer docs)

- `examples/bare-react-native/`: minimal bare React Native example app
  demonstrating retry, logger, lifecycle, network, and device APIs against the
  built core package.
- Real `AppState`/`Platform` adapters and an illustrative `NetworkProvider` in
  the example (`src/*`).
- `examples/bare-react-native/scripts/demonstrate-core.mjs`: runnable Node demo
  that imports the built `dist/` (also wired as `npm run demo:core`).
- Example README with explicit setup and per-platform notes.

### Changed (Phase 4 — hardening & release candidate)

- Added `prepublishOnly` (build before publish) to the core package.
- Clean-environment check: fresh copy + `npm ci` → lint/typecheck/build/test/
  format all pass.
- Public API review: all exports are implemented (no placeholders); the package
  tarball contains only `dist/` + `package.json` (plus auto-included LICENSE).
- Secret scan: only intentional redaction fixtures/examples found; no
  credentials.
- Dependency license review: zero runtime deps; dev deps are MIT / Apache-2.0
  (TypeScript).

### Added (Phase 5 — publication preparation)

- `docs/maintainers/PUBLISHING.md`: full release checklist (preflight, clean checks, pack
  inspection, publish, tag/release, post-publish verification, rollback,
  ongoing maintenance).
- `docs/SUPPORT_POLICY.md`: versioning and support window.
- `RELEASE_NOTES.md`: draft notes for `v0.1.0`.

### Note

Release-candidate state. Full React Native device builds (`npm run ios` /
`npm run android`) remain a manual, on-device step before claiming RN-version
compatibility. Publishing to npm or creating a GitHub release requires
maintainer authorization and npm registry credentials; see
`docs/maintainers/PUBLISHING.md`.
