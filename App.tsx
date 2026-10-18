import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, StatusBar, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { db } from './src/db';
import { LaunchSplash } from './src/components/LaunchSplash';
import { BRAND_TILE } from './src/components/FaslaMark';
import { ensureNotificationPermission } from './src/utils/permissions';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { WalkthroughProvider } from './src/walkthrough/Walkthrough';
import { FaslaDialogHost } from './src/components/FaslaDialog';
import { ToastHost } from './src/ui/kit';
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
      <WalkthroughProvider>
        <RootNavigator />
      </WalkthroughProvider>
      <FaslaDialogHost />
      <ToastHost />
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

  // The launch animation plays once per cold start while the database opens underneath it,
  // then fades away once both are finished.
  const [introDone, setIntroDone] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const onIntroDone = useCallback(() => setIntroDone(true), []);
  useEffect(() => {
    if (!introDone || !ready) return;
    Animated.timing(splashOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setSplashGone(true));
  }, [introDone, ready, splashOpacity]);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {ready ? <AppContent dbError={dbError} onRetry={attemptInit} /> : null}
        {!splashGone ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]} pointerEvents={introDone && ready ? 'none' : 'auto'}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND_TILE} />
            <LaunchSplash onDone={onIntroDone} />
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

function AppContent({ dbError, onRetry }: { dbError: string | null; onRetry: () => void }) {
  if (dbError !== null) {
    return (
      <>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not start the database</Text>
          <Text style={styles.errorMessage}>{dbError}</Text>
          <Text style={styles.errorHint}>
            Nothing that stores data — keys, sessions, blocked apps — can work until this is fixed.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Same colour as the Android launch window and the animation, so start-up never flashes.
  root: { flex: 1, backgroundColor: BRAND_TILE },
  errorContainer: { flex: 1, backgroundColor: '#0F1115', padding: 24, paddingTop: 80 },
  errorTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  errorMessage: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  errorHint: { color: '#8A9099', fontSize: 13, fontWeight: '600', marginBottom: 28 },
  retryButton: { backgroundColor: '#E82127', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default App;
