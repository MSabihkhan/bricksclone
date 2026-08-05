import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Splash() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <View style={[styles.box, { backgroundColor: colors.accent }]}>
          <View style={styles.glyph} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>BRICKS</Text>
        <ActivityIndicator color={colors.muted} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  box: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glyph: {
    width: 22,
    height: 22,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.9, // approx 0.06em depending on font, using pixels approx
    marginBottom: 16,
  },
  spinner: {
    marginTop: 8,
  },
});
