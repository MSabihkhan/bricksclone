import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { db } from './src/db';
import { Splash } from './src/components/Splash';
import { ensureNotificationPermission } from './src/utils/permissions';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { describeError } from './src/utils/describeError';

// Inside the provider so the bar follows the in-app appearance setting rather than the
// OS colour scheme, which the rest of the UI ignores.
function ThemedRoot() {
  const theme = useTheme();
  return (
    <>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bg}
      />
      <RootNavigator />
    </>
  );
}

function App() {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const attemptInit = useCallback(() => {
    setReady(false);
    setDbError(null);
    db.init()
      .then(() => setReady(true))
      .catch((err) => {
        // The app used to silently carry on with no database at all, which meant every
        // screen that reads or writes through `db` failed invisibly later on instead of
        // failing once, here, with a reason.
        setDbError(describeError(err));
        setReady(true);
      })
      .finally(() => {
        ensureNotificationPermission().catch(() => {});
      });
  }, []);

  useEffect(() => {
    attemptInit();
  }, [attemptInit]);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <Splash />
      </SafeAreaProvider>
    );
  }

  if (dbError !== null) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not start the database</Text>
          <Text style={styles.errorMessage}>{dbError}</Text>
          <Text style={styles.errorHint}>
            Nothing that stores data — Bricks, sessions, blocked apps — can work until this is fixed.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={attemptInit}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <ThemedRoot />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: '#0F1115', padding: 24, paddingTop: 80 },
  errorTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  errorMessage: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  errorHint: { color: '#8A9099', fontSize: 13, fontWeight: '600', marginBottom: 28 },
  retryButton: { backgroundColor: '#E82127', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default App;
