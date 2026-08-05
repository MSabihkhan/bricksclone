import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { BlockingModule } from '../native/BlockingModule';

export function GrantAccessibility() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const obTint = colors.accent + '24';
  const successTint = '#22c55e' + '24';

  const [hasAccess, setHasAccess] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const access = await BlockingModule.isAccessibilityEnabled();
        if (access) {
          setHasAccess(true);
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onGrant = () => {
    setRequested(true);
    BlockingModule.requestAccessibility();
  };

  const onNext = () => {
    navigation.navigate('BatteryOptimization');
  };

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <View style={styles.content}>
        {hasAccess ? (
          <View style={[styles.iconBox, { backgroundColor: successTint, borderColor: '#22c55e' }]}>
            <Icon name="check" size={44} color="#22c55e" />
          </View>
        ) : (
          <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
            <Icon name="shield" size={44} color={colors.accent} />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>Accessibility</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {hasAccess 
            ? "Permission granted successfully." 
            : "Please enable the Bricks Accessibility Service."}
        </Text>
      </View>
      
      {!hasAccess && requested && (
        <Text style={[styles.hint, { color: colors.muted }]}>Permission required to block apps</Text>
      )}

      {hasAccess ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={onNext}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={onGrant}
        >
          <Text style={styles.buttonText}>Enable accessibility</Text>
        </TouchableOpacity>
      )}
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
  hint: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
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
