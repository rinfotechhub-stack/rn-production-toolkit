/**
 * Connectivity state is an *estimate* of connectivity, never proof that a
 * specific host or service is reachable. Applications must not assume that
 * an `online` state means an endpoint will respond.
 */
export type ConnectionStatus = 'online' | 'offline' | 'unknown';

export type NetworkConnectionType =
  'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'bluetooth' | 'other' | 'unknown';

/**
 * A point-in-time connectivity snapshot.
 */
export interface NetworkSnapshot {
  /** Derived connectivity status. */
  status: ConnectionStatus;
  /** Whether the internet is believed to be reachable (if known). */
  isInternetReachable?: boolean;
  /** The observed connection type, when known. */
  connectionType?: NetworkConnectionType;
}

/**
 * Injectable network-information provider.
 *
 * Consumers connect their chosen network-information library (e.g. a
 * NetInfo-style provider) by implementing this interface. Tests use fake
 * providers.
 */
export interface NetworkProvider {
  getSnapshot(): NetworkSnapshot;
  subscribe(listener: (snapshot: NetworkSnapshot) => void): () => void;
}

/**
 * Map a boolean reachability flag to a {@link ConnectionStatus}.
 *
 * `true` → `online`, `false` → `offline`, and `undefined`/unknown →
 * `unknown`.
 */
export function statusFromReachability(reachable: boolean | undefined): ConnectionStatus {
  if (reachable === true) {
    return 'online';
  }
  if (reachable === false) {
    return 'offline';
  }
  return 'unknown';
}

/**
 * Structural equality for {@link NetworkSnapshot} (used to deduplicate
 * events).
 */
export function snapshotsEqual(a: NetworkSnapshot, b: NetworkSnapshot): boolean {
  return (
    a.status === b.status &&
    a.isInternetReachable === b.isInternetReachable &&
    a.connectionType === b.connectionType
  );
}

/**
 * A live view of connectivity with explicit cleanup.
 */
export interface ConnectivityTracker {
  getCurrent(): NetworkSnapshot;
  onChange(listener: (snapshot: NetworkSnapshot) => void): () => void;
  dispose(): void;
}

/**
 * Create a {@link ConnectivityTracker} bound to `provider`.
 *
 * Subscribes to the provider immediately and deduplicates unchanged snapshots.
 * There are no module-level subscriptions; call `dispose()` when done.
 */
export function createConnectivityTracker(provider: NetworkProvider): ConnectivityTracker {
  let current = provider.getSnapshot();
  const listeners = new Set<(snapshot: NetworkSnapshot) => void>();

  const unsubscribe = provider.subscribe((next) => {
    if (snapshotsEqual(current, next)) {
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
      unsubscribe();
      listeners.clear();
    },
  };
}
