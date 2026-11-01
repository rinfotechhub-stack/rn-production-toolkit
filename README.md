# rn-production-toolkit

A small, reliable, typed collection of reusable utilities for React Native
production apps.

> **Status:** Release candidate (`v0.1.0`). Phases 0–4 complete: core utilities
> (`errors`, `retry`, `logger`), React Native adapter contracts (`lifecycle`,
> `network`, `device`), a minimal example app, and hardening/clean-environment
> validation. Nothing is published to npm yet; publishing requires maintainer
> authorization.

## What this is

`rn-production-toolkit` aims to provide a focused set of utilities that address
recurring production concerns in React Native apps:

- Typed errors with stable error codes.
- `withRetry` with capped exponential backoff, optional jitter, cancellation,
  and caller-defined retry predicates.
- A pluggable logger with configurable redaction.
- React Native adapters for app lifecycle, network connectivity, and
  privacy-minimizing device/runtime information.

### Implemented modules

| Module | What it provides |
| --- | --- |
| `errors` | `ErrorCode`, `ToolkitError`, `ConfigurationError`, `AbortError`, normalizers |
| `retry` | `withRetry` with capped exponential backoff, jitter, abort support, conservative retry predicate |
| `logger` | `Logger` interface, console adapter, safe-by-default redaction, no-op logger |
| `lifecycle` | `AppStateAdapter` contract, `createAppStateTracker` with explicit cleanup |
| `network` | `NetworkProvider` contract, `createConnectivityTracker`, reachability mapping |
| `device` | Privacy-minimizing `RuntimeInfo` via an injectable `PlatformAdapter` |

All core modules are framework-independent with zero runtime dependencies. The
React Native bindings are provided by consumers through the injected adapter
interfaces (concrete integrations are demonstrated in the example app).
Full API documentation, examples, and behavior/error/cancellation notes are in
[`docs/API.md`](docs/API.md).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for architecture details.

## What this is not

- A replacement for React Native core APIs or established libraries.
- A backend, hosted service, or analytics platform.
- A secure-storage implementation, telemetry collector, or custom cryptography.
- A claim of production adoption or compatibility that has not been verified.

## Repository structure

```text
rn-production-toolkit/
├── packages/
│   └── core/            # The public package: @rn-production-toolkit/core
│       ├── src/         # Implemented core source modules
│       ├── tests/       # Unit and consumer smoke tests
│       └── package.json
├── docs/                # API, architecture, compatibility, and decisions docs
├── examples/            # Example bare React Native application
├── .github/             # Issue/PR templates and CI workflows
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── LICENSE
├── package.json          # Workspace root
└── tsconfig.base.json
```

## Examples

A minimal bare React Native app lives at `examples/bare-react-native/`. It
demonstrates `retry`, `logger`, `lifecycle`, `network`, and `device` against
the **built** core package and includes a runnable Node demo:

```bash
cd examples/bare-react-native
npm run demo:core   # exercises the built @rn-production-toolkit/core
```

See `examples/bare-react-native/README.md` for full setup and platform notes.

## Requirements

- Node.js >= 20
- npm >= 10 (or another npm-compatible installer)

## Getting started (development)

```bash
# Install all workspace dependencies
npm install

# Run all checks (from the repository root)
npm run lint
npm run typecheck
npm run build
npm run test
```

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile the core package to `packages/core/dist`. |
| `npm run typecheck` | Type-check using strict settings. |
| `npm run lint` | Lint all workspace source and tests. |
| `npm run test` | Run the Jest unit test suite. |
| `npm run format` | Format code with Prettier. |
| `npm run format:check` | Verify formatting without writing. |

## License

MIT. See [LICENSE](LICENSE). You must have the right to license any code you
contribute (see [CONTRIBUTING.md](CONTRIBUTING.md)).