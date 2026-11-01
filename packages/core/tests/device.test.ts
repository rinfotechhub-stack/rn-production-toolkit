import { resolveRuntimeInfo, type PlatformAdapter, type RuntimeInfo } from '../src';

describe('resolveRuntimeInfo', () => {
  test('resolves all fields from a full adapter', () => {
    const adapter: PlatformAdapter = {
      getPlatform: () => 'ios',
      getOSVersion: () => '17.5',
      getLocale: () => 'en-US',
      isHeadless: () => false,
    };

    const info = resolveRuntimeInfo(adapter);
    expect(info).toEqual({
      platform: 'ios',
      osVersion: '17.5',
      locale: 'en-US',
      isHeadless: false,
    });
  });

  test('reports undefined for missing optional accessors', () => {
    const adapter: PlatformAdapter = {
      getPlatform: () => 'unknown',
    };

    const info = resolveRuntimeInfo(adapter);
    expect(info.platform).toBe('unknown');
    expect(info.osVersion).toBeUndefined();
    expect(info.locale).toBeUndefined();
    expect(info.isHeadless).toBeUndefined();
  });

  test('never introduces identifier fields', () => {
    const adapter: PlatformAdapter = { getPlatform: () => 'android' };
    const info: RuntimeInfo = resolveRuntimeInfo(adapter);
    const keys = Object.keys(info);
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('advertisingId');
    expect(keys).not.toContain('deviceId');
    expect(keys).not.toContain('androidId');
  });
});
