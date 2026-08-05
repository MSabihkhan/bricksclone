import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface OnboardingHeaderProps {
  onSkip?: () => void;
}

export function OnboardingHeader({ onSkip }: OnboardingHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <View style={[styles.logoBox, { backgroundColor: colors.accent }]}>
          <View style={styles.innerSquare} />
        </View>
        <Text style={[styles.logoText, { color: colors.text }]}>BRICKS</Text>
      </View>
      {onSkip && (
        <TouchableOpacity onPress={onSkip}>
          <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  innerSquare: {
    width: 9,
    height: 9,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
