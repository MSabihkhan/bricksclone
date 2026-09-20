import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps extends ViewProps {
  radius?: number;
  padding?: number;
  elevation?: number;
}

export function Card({ radius = 22, padding = 20, elevation = 0, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: radius,
          padding,
          shadowOpacity: elevation ? 0.14 : 0,
          shadowRadius: elevation ? 18 : 0,
          elevation: elevation ? 4 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
  },
});
