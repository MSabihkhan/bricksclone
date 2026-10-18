import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

/** The one back control every pushed screen uses, so none of them ends up without one. */
export function BackButton({ onPress }: { onPress?: () => void }) {
  const theme = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={onPress ?? (() => navigation.goBack())}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[styles.button, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <Icon name="back" size={20} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
