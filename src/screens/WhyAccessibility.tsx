import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';

export function WhyAccessibility() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const obTint = colors.accent + '24';

  const onNext = () => {
    navigation.navigate('GrantAccessibility');
  };

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
          <Icon name="shield" size={44} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Why accessibility?</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Bricks uses an Accessibility Service to instantly redirect blocked apps to a locked screen when you try to open them mid-session. It reads only app-open events, nothing else.
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={onNext}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
    width: 104,
    height: 104,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -1.8,
    lineHeight: 38,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    marginTop: 16,
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
