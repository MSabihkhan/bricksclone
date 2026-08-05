import React from 'react';
import { View, StyleSheet, SafeAreaView, ViewProps, Platform } from 'react-native';
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
    paddingTop: Platform.OS === 'android' ? 8 : 8,
    paddingBottom: 28,
  },
});
