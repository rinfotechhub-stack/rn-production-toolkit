import { AppState, type AppStateStatus as RNAppStateStatus } from 'react-native';
import type { AppStateAdapter, AppStateStatus as ToolkitAppStateStatus } from '@rn-production-toolkit/core';

/**
 * Real adapter for the toolkit's `AppStateAdapter` contract, backed by
 * React Native's `AppState`.
 */
export function createReactNativeAppStateAdapter(): AppStateAdapter {
  const toStatus = (raw: string | null | undefined): ToolkitAppStateStatus => {
    switch (raw) {
      case 'active':
      case 'background':
      case 'inactive':
        return raw;
      default:
        return 'unknown';
    }
  };

  return {
    getCurrent: () => toStatus(AppState.currentState),
    subscribe: (listener) => {
      const subscription = AppState.addEventListener('change', (next: RNAppStateStatus) =>
        listener(toStatus(next)),
      );
      return () => subscription.remove();
    },
  };
}
