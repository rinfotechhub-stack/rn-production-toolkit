// Node demo that imports the BUILT core package (dist) and exercises the
// public APIs. Run from examples/bare-react-native with `npm run demo:core`.
import {
  createAppStateTracker,
  createConnectivityTracker,
  createConsoleLogger,
  resolveRuntimeInfo,
  statusFromReachability,
  withRetry,
  RetryError,
} from '../../../packages/core/dist/index.js';

const logger = createConsoleLogger({ level: 'debug' });
logger.info('toolkit core demo starting');

await demonstrateRetry();
await demonstrateLifecycle();
await demonstrateConnectivity();

const runtime = resolveRuntimeInfo({ getPlatform: () => 'web' });
console.log('[runtime]', JSON.stringify(runtime));

async function demonstrateRetry() {
  let attempts = 0;
  try {
    const value = await withRetry(
      async (attempt) => {
        attempts = attempt;
        if (attempt < 3) {
          throw new Error('transient failure');
        }
        return 'delivered';
      },
      { maxAttempts: 4, baseDelayMs: 5, jitter: true },
    );
    console.log(`[retry] succeeded after ${attempts} attempt(s): ${value}`);
  } catch (error) {
    console.log('[retry] unexpected failure:', error);
  }

  // Demonstrate persistent transient failure exhausting max attempts
  const persistentTransient = Object.assign(new Error('connection timeout'), { code: 'ETIMEDOUT' });
  try {
    await withRetry(
      async () => {
        throw persistentTransient;
      },
      { maxAttempts: 2, baseDelayMs: 5 },
    );
  } catch (error) {
    if (error instanceof RetryError) {
      console.log(
        `[retry] exhausted after ${error.attempts}; cause preserved: ${error.cause === persistentTransient}; lastError: ${error.lastError?.message}`,
      );
    } else {
      console.log('[retry] unexpected error type:', error);
    }
  }

  // Demonstrate permanent failure stopping immediately without retry
  const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
  let authAttempts = 0;
  try {
    await withRetry(
      async (attempt) => {
        authAttempts = attempt;
        throw authError;
      },
      { maxAttempts: 3, baseDelayMs: 5 },
    );
  } catch (error) {
    if (error === authError && authAttempts === 1) {
      console.log(`[retry] permanent error (status 401) stopped on attempt ${authAttempts} without retry`);
    } else {
      console.log('[retry] permanent error unexpected behavior:', error);
    }
  }
}

async function demonstrateLifecycle() {
  let current = 'active';
  const subscribers = new Set();
  const fakeAdapter = {
    getCurrent: () => current,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  const tracker = createAppStateTracker(fakeAdapter);
  const seen = [];
  tracker.onChange((status) => {
    seen.push(status);
    logger.debug('lifecycle transition', { status });
  });

  for (const handler of subscribers) handler('background');
  for (const handler of subscribers) handler('active');

  console.log('[lifecycle] transitions:', JSON.stringify(seen));
  tracker.dispose();
  console.log('[lifecycle] disposed; subscriber count:', subscribers.size);
}

async function demonstrateConnectivity() {
  let snapshot = { status: 'unknown' };
  const subscribers = new Set();
  const provider = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  const tracker = createConnectivityTracker(provider);
  const seen = [];
  tracker.onChange((next) => seen.push(next.status));

  snapshot = { status: 'online', isInternetReachable: true, connectionType: 'wifi' };
  for (const handler of subscribers) handler(snapshot);

  console.log('[network] transitions:', JSON.stringify(seen));
  console.log('[network] mapped online:', statusFromReachability(true));
  tracker.dispose();
}
