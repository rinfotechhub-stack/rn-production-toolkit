import { Platform } from 'react-native';
import type { PlatformAdapter, PlatformName } from '@rn-production-toolkit/core';

const PLATFORM_NAMES: Record<string, PlatformName> = {
  ios: 'ios',
  android: 'android',
  web: 'web',
  windows: 'windows',
  macos: 'macos',
};

/**
 * Real adapter for the toolkit's `PlatformAdapter` contract, backed by React
 * Native's `Platform`.
 */
export function createReactNativePlatformAdapter(): PlatformAdapter {
  return {
    getPlatform: () => PLATFORM_NAMES[Platform.OS] ?? 'unknown',
    getOSVersion: () =>
      typeof Platform.Version === 'string' ? Platform.Version : String(Platform.Version),
  };
}
