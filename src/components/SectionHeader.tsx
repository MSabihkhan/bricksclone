import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SectionHeaderProps {
  title: string;
  right?: string | React.ReactNode;
}

export function SectionHeader({ title, right }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {typeof right === 'string' ? <Text style={[styles.rightText, { color: theme.colors.muted }]}>{right}</Text> : right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 2,
    marginTop: 26,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.02 * 16, // approximate -0.02em
  },
  rightText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
  },
});
