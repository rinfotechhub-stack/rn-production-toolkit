# Compatibility

## Status

This document records the *tested* environment for the project. We do not claim
support for versions we have not exercised.

## Toolchain

| Tool | Version tested | Notes |
| --- | --- | --- |
| Node.js | >= 20 | Development and CI runtime. |
| npm | >= 10 | Workspace and lockfile management. |
| TypeScript | 6.0.x | Strict mode enabled (`tsconfig.base.json`). |
| Jest | 30.x | Test runner with `ts-jest`. |
| ESLint | 10.x | Flat config with `typescript-eslint`. |
| Prettier | 3.x | Formatting. |

## Core package

`@rn-production-toolkit/core` targets the Node/CommonJS toolchain and has **no
runtime dependencies and no peer dependencies**. It does not import React
Native.

The React Native adapter modules (`lifecycle`, `network`, `device`) are built
around injectable interfaces and run in any JavaScript environment. The
React Native bindings are consumer-provided and are **not asserted as tested**
for any specific React Native version until validated on a device.

The example app (`examples/bare-react-native/`) provides starter adapters and is
verified against the built package via `npm run demo:core`. Full React Native
device builds (`npm run ios` / `npm run android`) remain a manual, on-device
step; the React Native version declared in the example is indicative and should
be aligned to the target RN version before device validation.

## Firefox of support

Until `1.0.0`, only the latest `0.x` release is supported. Breaking changes are
documented in [`CHANGELOG.md`](../CHANGELOG.md).
