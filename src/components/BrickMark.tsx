import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function BrickMark({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: theme.colors.card2,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { color: theme.colors.accent, fontSize: Math.max(13, size * 0.32) }]}>b</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  letter: {
    fontFamily: 'BricolageGrotesque',
    fontWeight: '400',
    includeFontPadding: false,
  },
});
