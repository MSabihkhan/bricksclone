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

export function GrantUsageAccess() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const obTint = colors.accent + '24';

  const [hasAccess, setHasAccess] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const access = await BlockingModule.hasUsageAccess();
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
    BlockingModule.requestUsageAccess();
  };

  const onNext = () => {
    navigation.navigate('WhyAccessibility');
  };

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <View style={styles.content}>
        {hasAccess ? (
          <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="check" size={40} color={colors.text} />
          </View>
        ) : (
          <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
            <Icon name="shield" size={44} color={colors.accent} />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>Usage Access</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {hasAccess 
            ? "Permission granted successfully." 
            : "Please grant Usage Access to Bricks in your device settings."}
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
          <Text style={styles.buttonText}>Allow usage access</Text>
        </TouchableOpacity>
      )}
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
  hint: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
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
