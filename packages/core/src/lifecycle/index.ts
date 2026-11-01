/**
 * React Native app lifecycle status, aligned with React Native's `AppState`
 * values.
 */
export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown';

/**
 * Injectable abstraction over React Native's `AppState`.
 *
 * Consumers are expected to provide a real adapter backed by `AppState` (see
 * the example in the API docs). Tests use a fake adapter.
 */
export interface AppStateAdapter {
  /** The current app state. */
  getCurrent(): AppStateStatus;

  /**
   * Subscribe to app-state changes. Returns an unsubscribe function.
   */
  subscribe(listener: (status: AppStateStatus) => void): () => void;
}

/**
 * A live view of app state with explicit cleanup.
 */
export interface AppStateTracker {
  /** The current app state. */
  getCurrent(): AppStateStatus;

  /**
   * Register a listener for state changes. Returns an unsubscribe function.
   * The listener is only invoked when the state actually changes
   * (identical state transitions are deduplicated).
   */
  onChange(listener: (status: AppStateStatus) => void): () => void;

  /**
   * Unsubscribe from the underlying adapter and clear all listeners. Must be
   * called when the tracker is no longer needed.
   */
  dispose(): void;
}

/**
 * Create an {@link AppStateTracker} bound to `adapter`.
 *
 * Subscribes to the adapter immediately. There are no module-level
 * subscriptions; any created tracker is self-contained and must be cleaned
 * up via `dispose()`.
 */
export function createAppStateTracker(adapter: AppStateAdapter): AppStateTracker {
  let current = adapter.getCurrent();
  const listeners = new Set<(status: AppStateStatus) => void>();

  const unsubscribeFromAdapter = adapter.subscribe((next) => {
    if (next === current) {
      return;
    }
    current = next;
    for (const listener of Array.from(listeners)) {
      listener(next);
    }
  });

  return {
    getCurrent: () => current,
    onChange: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      unsubscribeFromAdapter();
      listeners.clear();
    },
  };
}
