import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'soft';
  disabled?: boolean;
  icon?: IconName;
  iconColor?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, icon, iconColor }: ButtonProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    if (disabled) {
      return {
        container: { backgroundColor: theme.colors.card2, shadowOpacity: 0, elevation: 0 },
        text: { color: theme.colors.faint },
      };
    }
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.55,
            shadowRadius: 30,
            elevation: 8,
          },
          text: { color: '#fff' },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
          text: { color: theme.colors.text },
        };
      case 'soft':
        return {
          container: { backgroundColor: theme.colors.card2 },
          text: { color: theme.colors.text },
        };
      default:
        return { container: {}, text: {} };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: '100%' }}
    >
      <Animated.View style={[styles.container, vStyles.container, { transform: [{ scale }] }]}>
        {icon && <Icon name={icon} size={18} color={iconColor || (vStyles.text.color as string) || '#fff'} />}
        <Text style={[styles.text, vStyles.text]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
});
