import { createAppStateTracker, type AppStateStatus } from '../src';

type AppStateHandler = (status: AppStateStatus) => void;

function makeFakeAdapter(initial: AppStateStatus = 'active') {
  let state = initial;
  const handlers = new Set<AppStateHandler>();
  return {
    _set(next: AppStateStatus): void {
      state = next;
      for (const handler of Array.from(handlers)) {
        handler(next);
      }
    },
    _handlerCount(): number {
      return handlers.size;
    },
    getCurrent: () => state,
    subscribe: (listener: AppStateHandler) => {
      handlers.add(listener);
      return () => {
        handlers.delete(listener);
      };
    },
  };
}

describe('createAppStateTracker', () => {
  test('subscribes to the adapter on creation', () => {
    const adapter = makeFakeAdapter('active');
    const tracker = createAppStateTracker(adapter);
    expect(adapter._handlerCount()).toBe(1);
    tracker.dispose();
  });

  test('starts with the adapter current state', () => {
    const adapter = makeFakeAdapter('background');
    const tracker = createAppStateTracker(adapter);
    expect(tracker.getCurrent()).toBe('background');
    tracker.dispose();
  });

  test('notifies listeners on a real transition', () => {
    const adapter = makeFakeAdapter('active');
    const tracker = createAppStateTracker(adapter);
    const seen: AppStateStatus[] = [];
    tracker.onChange((status) => seen.push(status));

    adapter._set('background');
    adapter._set('inactive');

    expect(seen).toEqual(['background', 'inactive']);
    expect(tracker.getCurrent()).toBe('inactive');
    tracker.dispose();
  });

  test('deduplicates identical state transitions', () => {
    const adapter = makeFakeAdapter('active');
    const tracker = createAppStateTracker(adapter);
    const seen: AppStateStatus[] = [];
    tracker.onChange((status) => seen.push(status));

    adapter._set('background');
    adapter._set('background'); // same value: must not re-notify

    expect(seen).toEqual(['background']);
    tracker.dispose();
  });

  test('onChange returns an unsubscribe function', () => {
    const adapter = makeFakeAdapter('active');
    const tracker = createAppStateTracker(adapter);
    const seen: AppStateStatus[] = [];
    const off = tracker.onChange((status) => seen.push(status));

    adapter._set('background');
    off();
    adapter._set('inactive');

    expect(seen).toEqual(['background']);
    tracker.dispose();
  });

  test('dispose unsubscribes from the adapter and clears listeners', () => {
    const adapter = makeFakeAdapter('active');
    const tracker = createAppStateTracker(adapter);
    const seen: AppStateStatus[] = [];
    tracker.onChange((status) => seen.push(status));

    tracker.dispose();

    expect(adapter._handlerCount()).toBe(0);
    adapter._set('background'); // must not notify after dispose
    expect(seen).toEqual([]);
  });
});
