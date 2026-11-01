import {
  createConnectivityTracker,
  snapshotsEqual,
  statusFromReachability,
  type NetworkSnapshot,
} from '../src';

type SnapshotHandler = (snapshot: NetworkSnapshot) => void;

function makeFakeProvider(initial: NetworkSnapshot) {
  let snapshot = initial;
  const handlers = new Set<SnapshotHandler>();
  return {
    _emit(next: NetworkSnapshot): void {
      snapshot = next;
      for (const handler of Array.from(handlers)) {
        handler(next);
      }
    },
    _handlerCount(): number {
      return handlers.size;
    },
    getSnapshot: () => snapshot,
    subscribe: (listener: SnapshotHandler) => {
      handlers.add(listener);
      return () => {
        handlers.delete(listener);
      };
    },
  };
}

describe('statusFromReachability', () => {
  test('maps booleans and unknown', () => {
    expect(statusFromReachability(true)).toBe('online');
    expect(statusFromReachability(false)).toBe('offline');
    expect(statusFromReachability(undefined)).toBe('unknown');
  });
});

describe('snapshotsEqual', () => {
  test('compares status, reachability and connection type', () => {
    const a: NetworkSnapshot = {
      status: 'online',
      isInternetReachable: true,
      connectionType: 'wifi',
    };
    expect(snapshotsEqual(a, { ...a })).toBe(true);
    expect(snapshotsEqual(a, { status: 'online', isInternetReachable: true })).toBe(false);
    expect(snapshotsEqual(a, { status: 'offline', isInternetReachable: false })).toBe(false);
  });
});

describe('createConnectivityTracker', () => {
  test('subscribes to the provider and reflects the initial snapshot', () => {
    const provider = makeFakeProvider({ status: 'online', isInternetReachable: true });
    const tracker = createConnectivityTracker(provider);
    expect(provider._handlerCount()).toBe(1);
    expect(tracker.getCurrent()).toEqual({ status: 'online', isInternetReachable: true });
    tracker.dispose();
  });

  test('notifies listeners only when the snapshot changes', () => {
    const provider = makeFakeProvider({ status: 'unknown' });
    const tracker = createConnectivityTracker(provider);
    const seen: NetworkSnapshot[] = [];
    tracker.onChange((snapshot) => seen.push(snapshot));

    provider._emit({ status: 'unknown' }); // equal -> deduplicated
    provider._emit({ status: 'online', isInternetReachable: true, connectionType: 'wifi' });
    provider._emit({ status: 'offline', isInternetReachable: false });

    expect(seen).toEqual([
      { status: 'online', isInternetReachable: true, connectionType: 'wifi' },
      { status: 'offline', isInternetReachable: false },
    ]);
    tracker.dispose();
  });

  test('tolerates missing optional provider fields', () => {
    const provider = makeFakeProvider({ status: 'unknown' });
    const tracker = createConnectivityTracker(provider);
    expect(tracker.getCurrent().status).toBe('unknown');
    expect(tracker.getCurrent().isInternetReachable).toBeUndefined();
    tracker.dispose();
  });

  test('dispose unsubscribes and clears listeners', () => {
    const provider = makeFakeProvider({ status: 'unknown' });
    const tracker = createConnectivityTracker(provider);
    const seen: NetworkSnapshot[] = [];
    tracker.onChange((snapshot) => seen.push(snapshot));

    tracker.dispose();
    expect(provider._handlerCount()).toBe(0);

    provider._emit({ status: 'online', isInternetReachable: true });
    expect(seen).toEqual([]);
  });

  test('creates independent trackers with no module-level side effects', () => {
    const providerA = makeFakeProvider({ status: 'unknown' });
    const providerB = makeFakeProvider({ status: 'online' });

    const trackerA = createConnectivityTracker(providerA);
    const trackerB = createConnectivityTracker(providerB);

    // Each tracker only receives events from its own provider.
    const seenA: NetworkSnapshot[] = [];
    trackerA.onChange((snapshot) => seenA.push(snapshot));

    providerB._emit({ status: 'offline', isInternetReachable: false });
    expect(seenA).toEqual([]);

    providerA._emit({ status: 'online', isInternetReachable: true });
    expect(seenA).toHaveLength(1);

    // Test unsubscribe
    const seenUnsub: NetworkSnapshot[] = [];
    const unsub = trackerA.onChange((snapshot) => seenUnsub.push(snapshot));
    providerA._emit({ status: 'offline', isInternetReachable: false });
    expect(seenUnsub).toHaveLength(1);
    unsub();
    providerA._emit({ status: 'online', isInternetReachable: true });
    expect(seenUnsub).toHaveLength(1);

    trackerA.dispose();
    trackerB.dispose();
  });
});
