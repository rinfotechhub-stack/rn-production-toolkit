import type { NetworkProvider, NetworkSnapshot } from '@rn-production-toolkit/core';

/**
 * Illustrative placeholder network provider.
 *
 * This demonstrates the `NetworkProvider` contract without forcing a specific
 * native library. In production, swap this for your real network-information
 * library (for example a NetInfo-style provider) that implements the same
 * interface.
 */
export function createDemoNetworkProvider(): NetworkProvider {
  let online = true;
  const handlers = new Set<(snapshot: NetworkSnapshot) => void>();

  const timer = setInterval(() => {
    online = !online;
    emit();
  }, 5000);

  function emit(): void {
    const snapshot: NetworkSnapshot = {
      status: online ? 'online' : 'offline',
      isInternetReachable: online,
      connectionType: 'wifi',
    };
    for (const handler of Array.from(handlers)) {
      handler(snapshot);
    }
  }

  return {
    getSnapshot: (): NetworkSnapshot => ({
      status: online ? 'online' : 'offline',
      isInternetReachable: online,
      connectionType: 'wifi',
    }),
    subscribe: (listener) => {
      handlers.add(listener);
      return () => {
        handlers.delete(listener);
        if (handlers.size === 0) {
          clearInterval(timer);
        }
      };
    },
  };
}
