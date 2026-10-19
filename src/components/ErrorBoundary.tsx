import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time throws that installGlobalErrorHandler cannot see (React swallows
 * those before they reach ErrorUtils). Without this a broken screen would just go blank.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>{this.state.error.message}</Text>
            {!!this.state.error.stack && <Text style={styles.stack}>{this.state.error.stack}</Text>}
            <Text style={styles.hint}>Close and reopen the app to continue.</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  scroll: { padding: 24, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  message: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  stack: { color: '#8A9099', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  hint: { color: '#8A9099', fontSize: 13, fontWeight: '600', marginTop: 20 },
});
