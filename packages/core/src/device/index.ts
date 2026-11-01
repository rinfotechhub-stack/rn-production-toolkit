/**
 * Platform names. Deliberately generic to avoid leaking implementation
 * details.
 */
export type PlatformName = 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Privacy-minimizing device/runtime information.
 *
 * Only non-sensitive metadata useful to applications is exposed. No
 * persistent identifiers, advertising IDs, or fingerprinting data are ever
 * collected or exposed.
 */
export interface RuntimeInfo {
  platform: PlatformName;
  osVersion?: string;
  locale?: string;
  isHeadless?: boolean;
}

/**
 * Injectable platform information provider.
 *
 * Consumers provide a real adapter backed by their platform APIs (or a fake
 * in tests). All accessors are optional; missing values are reported as
 * `undefined`.
 */
export interface PlatformAdapter {
  getPlatform(): PlatformName;
  getOSVersion?(): string | undefined;
  getLocale?(): string | undefined;
  isHeadless?(): boolean | undefined;
}

/**
 * Resolve a {@link RuntimeInfo} from an injectable {@link PlatformAdapter}.
 *
 * Optional adapter accessors that are not implemented simply yield
 * `undefined` fields. This function performs no network or storage access and
 * collects no personal data.
 */
export function resolveRuntimeInfo(adapter: PlatformAdapter): RuntimeInfo {
  return {
    platform: adapter.getPlatform(),
    osVersion: adapter.getOSVersion?.() ?? undefined,
    locale: adapter.getLocale?.() ?? undefined,
    isHeadless: adapter.isHeadless?.() ?? undefined,
  };
}
