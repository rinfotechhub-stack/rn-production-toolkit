# Bare React Native example

A minimal bare React Native app that exercises the `@rn-production-toolkit/core`
public APIs:

- **retry** — `withRetry` against a simulated transient failure.
- **logger** — `createConsoleLogger` with default redaction.
- **lifecycle** — `createAppStateTracker` wired to a real `AppState` adapter
  (`src/appStateAdapter.ts`).
- **network** — `createConnectivityTracker` wired to an illustrative
  `NetworkProvider` (`src/networkProvider.ts`). Replace this placeholder with
  your real network-information library behind the same interface.
- **device** — `resolveRuntimeInfo` via a React Native `PlatformAdapter`
  (`src/platformAdapter.ts`).

## Requirements

- Node.js >= 20
- React Native toolchain for your target platform (Xcode for iOS, Android SDK
  for Android)

## Setup

The example depends on the **built** core package (via `file:../../packages/core`,
whose `main` points at `dist/index.js`). Build core first:

```bash
# from the repository root
npm install
npm run build
```

Then prepare the example:

```bash
cd examples/bare-react-native
npm install
```

> The React Native version in `package.json` is indicative. Install/align to
> your target React Native version before running on a device, and verify the
> adapters on your platform.

## Running

```bash
# iOS
npm run ios

# Android
npm run android

# Metro bundler only
npm run start
```

## Header a core APIs without a device

A pure-Node demo that imports the built core and exercises retry, redaction,
lifecycle/connectivity trackers, and runtime info runs without React Native:

```bash
cd examples/bare-react-native
npm run demo:core
```

## Platform notes

- `App.tsx` and the adapter modules follow the toolkit's dependency-injection
  contracts. No native module is pulled in by the core package.
- `src/networkProvider.ts` to an illustrative placeholder — replace it with a
  real network-information provider; treat connectivity as an estimate, not
  proof of endpoint reachability.
- Android/iOS device validation is required before claiming support for a
  specific React Native version (see `docs/COMPATIBILITY.md`).
