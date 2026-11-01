import { withRetry, type RetryOptions } from '../src';

// @ts-expect-error maxAttempts is required
const missingAttempts: RetryOptions = {};

void missingAttempts;

const valid: RetryOptions = { maxAttempts: 3 };
void valid;

// @ts-expect-error operation must return a Promise
withRetry(() => 1, { maxAttempts: 1 });

import { createAppStateTracker, type AppStateTracker, type RuntimeInfo } from '../src';

// @ts-expect-error an AppStateAdapter is required
createAppStateTracker({});

const tracker: AppStateTracker = {
  getCurrent: () => 'active',
  onChange: () => () => undefined,
  dispose: () => undefined,
};
void tracker;

declare const runtimeInfo: RuntimeInfo;
// The runtime info contract must not expose persistent identifiers.
// @ts-expect-error runtime info has no id field
void runtimeInfo.id;
void runtimeInfo.platform;
