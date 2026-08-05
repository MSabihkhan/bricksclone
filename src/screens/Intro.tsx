import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList, RootStackParamList } from '../navigation/types';
import { completeOnboarding } from '../state/onboarding';

const STEPS = [
  { icon: 'shield', title: 'Block the noise', text: 'Lock away distracting apps in one tap and reclaim hours of your day.' },
  { icon: 'target', title: 'Set your intent', text: 'Choose what to block and for how long. Strict Mode keeps you honest to the finish.' },
  { icon: 'barChart', title: 'Watch focus grow', text: 'Track focused hours, streaks and blocked distractions over time.' }
] as const;

export function Intro() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [step, setStep] = useState(0);

  const onSkip = async () => {
    await completeOnboarding();
    rootNavigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };


  const onNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      navigation.navigate('WhyUsageAccess');
    }
  };

  const currentStep = STEPS[step];
  const obTint = colors.accent + '24';

  return (
    <Screen style={styles.container}>
      <OnboardingHeader onSkip={onSkip} />
      
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
          <Icon name={currentStep.icon} size={44} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{currentStep.title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{currentStep.text}</Text>
      </View>
      
      <View style={styles.dotsContainer}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step
                ? [styles.dotActive, { backgroundColor: colors.accent }]
                : { backgroundColor: colors.border }
            ]}
          />
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={onNext}
      >
        <Text style={styles.buttonText}>
          {step === STEPS.length - 1 ? 'Get Started' : 'Continue'}
        </Text>
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
    justifyContent: 'center',
  },
  iconBox: {
    width: 104,
    height: 104,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.19,
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 26,
    marginTop: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 26,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 26,
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
