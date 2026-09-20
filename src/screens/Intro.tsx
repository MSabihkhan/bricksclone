import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { BrickMark } from '../components/BrickMark';

const STEPS = [
  { icon: 'shield', title: 'Block the noise', text: 'Lock away distracting apps in one tap and reclaim hours of your day.' },
  { icon: 'target', title: 'Set your intent', text: 'Choose what to block and for how long. Strict Mode keeps you honest to the finish.' },
  { icon: 'barChart', title: 'Watch focus grow', text: 'Track focused hours, streaks and blocked distractions over time.' }
] as const;

export function Intro() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const [step, setStep] = useState(0);

  const onNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      navigation.navigate('WhyUsageAccess');
    }
  };

  const currentStep = STEPS[step];

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <View style={styles.content}>
        {step === 0 ? <BrickMark size={96} /> : (
          <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name={currentStep.icon} size={36} color={colors.text} />
          </View>
        )}
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
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -1.8,
    lineHeight: 40,
    marginTop: 30,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
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
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
