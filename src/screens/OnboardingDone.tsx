import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { completeOnboarding } from '../state/onboarding';

export function OnboardingDone() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const onStart = async () => {
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { shadowColor: '#22c55e' }]}>
          <Icon name="check" size={46} color="#fff" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>You're all set</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Tap your Brick to start your first focus session.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={onStart}
      >
        <Text style={styles.buttonText}>Start focusing</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    paddingTop: 32,
    paddingBottom: 34,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
