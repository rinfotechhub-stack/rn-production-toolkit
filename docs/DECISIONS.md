# Architecture Decisions

This file records significant architectural decisions. Each entry is dated and
records the rationale so future changes can be made deliberately rather than
silently.

## 2026-01-11 — Package manager: npm workspaces

- **Decision:** Use npm workspaces with a single core package
  `@rn-production-toolkit/core` under `packages/core/`.
- **Rationale:** Matches the repository structure in the architecture doc, keeps
  install/versioning simple, and avoids premature multi-package splitting. npm
  is ubiquitous and avoids introducing a second tool.
- **Trade-off:** A single package is less granular, but the architecture doc
  recommends avoiding premature splitting.

## 2026-01-11 — License: MIT

- **Decision:** License the project under MIT.
- **Rationale:** Chosen by the maintainer after confirming ownership rights.
- **Note:** Contributors must confirm they have the right to license submitted
  code (see CONTRIBUTING.md).

## 2026-01-11 — Toolchain

- **Decision:** TypeScript (strict), ESLint 10 flat config with
  `typescript-eslint`, Prettier 3, Jest 30 with `ts-jest`, `tsc` for builds.
- **Rationale:** Priorities are correctness, typed public APIs, and small
  reviewable code. A single well-established toolchain keeps contributors and
  CI aligned.
- **Note:** `module`/`moduleResolution` are `Node16` (TypeScript 6 deprecates
  `node10`). Runtime dependencies are zero; React Native will be an optional
  peer dependency only for modules that import it.

## 2026-01-11 — Test framework: Jest

- **Decision:** Use Jest with `ts-jest`, fake timers, and fake adapters for
  platform boundaries.
- **Rationale:** Standard in the React Native ecosystem; deterministic and
  CI-friendly.

## 2026-01-11 — Foundation tests before modules

- **Decision:** Phase 0 includes a structural test that validates package
  metadata and the entry module, even though no public API exists yet.
- **Rationale:** Confirms the foundation builds and test infra works before
  modules land. No placeholder feature APIs are exported.

## 2026-01-11 — Module inclusion/exclusion (initial scope)

- **Decision:** First release covers `errors`, `retry`, `logger`, `lifecycle`,
  `network`, and `device`. Excluded from v0.1: secure storage, file transfer,
  notifications, analytics, UI components.
- **Rationale:** Keep the initial release reliable and testable; defer harder
  or native-heavy integrations until designs and test plans exist.

## 2026-01-11 — React Native peer dependency policy

- **Decision:** Do not add React Native as a peer dependency until a module
  actually imports it.
- **Rationale:** The core package stays JavaScript-only, testable without a
  device, and free of unnecessary peer constraints.

## 2026-01-11 — Retry semantics

- **Decision:** `withRetry` requires an explicit `maxAttempts` (positive
  integer). Default `shouldRetry` is permissive (`() => true`); exhaustion
  throws a `RetryError` whose `cause`/`lastError` preserve the original error,
  while predicate rejection rethrows the original error unchanged.
- **Rationale:** Retrying is explicitly opt-in (call the function, define a
  policy). Preserving the original cause and honoring `shouldRetry` rejection
  keeps failure semantics predictable. Documents idempotency and permanent
  error caveats.

## 2026-11-01 — Conservative retry default policy (Audit Remediation M2)

- **Decision:** Replaced the permissive `() => true` default retry predicate
  with a conservative policy (`defaultShouldRetry`). Permanent errors (HTTP 4xx,
  authentication 401/403, validation 400/422, configuration errors, and
  programming TypeErrors) and unclassified/unknown errors are NOT retried by default.
  Only recognizable transient errors (HTTP 408/429/5xx, network socket/connection
  drops, timeouts, and errors marked retryable/transient) are retried by default.
  Callers can provide an explicit `shouldRetry` predicate to customize this policy.
- **Rationale:** Aligns with the core architecture mandate ("Do not retry
  authentication, validation or other permanent errors unless the caller explicitly
  overrides the predicate"). Protects consumers from accidental retry loops on
  non-transient errors.

## 2026-01-11 — Logger redaction default

- **Decision:** The logger redacts a built-in set of common sensitive keys by
  default (case-insensitive), with opt-in additions and a configurable
  replacement token. Serialization is bounded, circular-safe, and never throws.
- **Rationale:** Safe by default while still explicit; guards against
  accidental secret leakage in structured log metadata.

## 2026-01-11 — Adapter-based React Native integrations

- **Decision:** The `lifecycle`, `network`, and `device` modules expose
  injectable adapter interfaces (`AppStateAdapter`, `NetworkProvider`,
  `PlatformAdapter`) and tracker helpers. The concrete React Native bindings
  are **not** bundled into the core package; consumers provide them.
- **Rationale:** Keeps the core package JavaScript-only, testable without a
  device, and free of native peer dependencies — matching the guidance to keep
  optional native integrations out of the core. Concrete bindings are shown in
  the Phase 3 example app.

## 2026-01-11 — Example app strategy

- **Decision:** The example (`examples/bare-react-native/`) lives outside the
  root npm workspace, depends on `@rn-production-toolkit/core` via
  `file:../../packages/core`, requires a prior `npm run build`, and includes a
  pure-Node demo (`npm run demo:core`) that imports the built `dist/`.
- **Rationale:** Keeps the root toolchain lean (no React Native install in the
  core workspace) and verifies examples against the built package, not
  source-only aliases. Native device builds are documented as a separate,
  on-device step.

## 2026-01-11 — Release hygiene

- **Decision:** Added `prepublishOnly` (build before publish); package `files`
  is `["dist"]`; a clean-environment check and secret/license/package-size
  reviews are part of Phase 4.
- **Rationale:** Guarantees the published tarball is freshly built and contains
  only generated artifacts.
- **Pending (maintainer):** exact `repository`/`homepage`/`bugs` URLs (the git
  remote uses a host alias; do not guess), npm name availability re-check, and
  authorization to publish/tag.
