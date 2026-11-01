import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import {
  createAppStateTracker,
  createConnectivityTracker,
  createConsoleLogger,
  resolveRuntimeInfo,
  withRetry,
} from '@rn-production-toolkit/core';
import { createReactNativeAppStateAdapter } from './src/appStateAdapter';
import { createDemoNetworkProvider } from './src/networkProvider';
import { createReactNativePlatformAdapter } from './src/platformAdapter';

const logger = createConsoleLogger({ level: 'debug' });

export default function App() {
  const [stateLine, setStateLine] = useState('');
  const [connectivityLine, setConnectivityLine] = useState('unknown');
  const [runtimeLine, setRuntimeLine] = useState('');

  useEffect(() => {
    // lifecycle (React Native AppState behind the AppStateAdapter contract).
    const stateTracker = createAppStateTracker(createReactNativeAppStateAdapter());
    const offState = stateTracker.onChange((status) => {
      logger.info('app state changed', { status });
      setStateLine(status);
    });
    setStateLine(stateTracker.getCurrent());

    // network (illustrative provider behind the NetworkProvider contract).
    const connectivityTracker = createConnectivityTracker(createDemoNetworkProvider());
    const offNet = connectivityTracker.onChange((snapshot) => {
      logger.warn('connectivity changed', snapshot);
      setConnectivityLine(snapshot.status);
    });

    // device/runtime (React Native Platform behind the PlatformAdapter contract).
    const info = resolveRuntimeInfo(createReactNativePlatformAdapter());
    setRuntimeLine(`${info.platform} ${info.osVersion ?? ''}`.trim());

    // retry (example transient failure).
    runDemoFetch();

    return () => {
      offState();
      offNet();
      connectivityTracker.dispose();
      stateTracker.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDemoFetch(): Promise<void> {
    let attempts = 0;
    try {
      const result = await withRetry(
        async (attempt) => {
          attempts = attempt;
          if (attempt < 3) {
            throw new Error('transient failure');
          }
          return 'delivered';
        },
        { maxAttempts: 4, baseDelayMs: 100, jitter: true },
      );
      logger.info('fetch succeeded', { result, attempts });
    } catch (error) {
      logger.error('fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>rn-production-toolkit example</Text>
      <Text>App state: {stateLine}</Text>
      <Text>Connectivity: {connectivityLine}</Text>
      <Text>Runtime: {runtimeLine}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});
