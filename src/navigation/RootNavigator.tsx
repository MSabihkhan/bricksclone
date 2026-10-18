import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabsNavigator } from './MainTabsNavigator';
import { ModalNavigator } from './ModalNavigator';
import { isOnboarded } from '../state/onboarding';
import { LaunchSplash } from '../components/LaunchSplash';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [status, setStatus] = useState<'loading' | 'onboarded' | 'new'>('loading');

  useEffect(() => {
    isOnboarded()
      .then(v => setStatus(v ? 'onboarded' : 'new'))
      .catch(() => setStatus('new'));
  }, []);

  if (status === 'loading') return <LaunchSplash animated={false} />;

  return (
    <NavigationContainer>
      {/*
        Both stacks are always registered. Rendering only one of them made the
        `reset({ routes: [{ name: 'MainTabs' }] })` at the end of onboarding target a
        screen that did not exist, leaving the user stuck on the last onboarding step.
      */}
      <Stack.Navigator
        initialRouteName={status === 'new' ? 'OnboardingStack' : 'MainTabs'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="OnboardingStack" component={OnboardingNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
        <Stack.Screen
          name="ModalStack"
          component={ModalNavigator}
          options={{ presentation: 'transparentModal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
