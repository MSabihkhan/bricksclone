import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export interface ScreenProps extends ViewProps {}

export function Screen({ children, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.container, { paddingHorizontal: theme.spacing.screenX }, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
  },
});
