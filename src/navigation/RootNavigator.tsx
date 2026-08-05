import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabsNavigator } from './MainTabsNavigator';
import { ModalNavigator } from './ModalNavigator';
import { isOnboarded } from '../state/onboarding';
import { Splash } from '../components/Splash';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [status, setStatus] = useState<'loading' | 'onboarded' | 'new'>('loading');

  useEffect(() => {
    isOnboarded()
      .then(v => setStatus(v ? 'onboarded' : 'new'))
      .catch(() => setStatus('new'));
  }, []);

  if (status === 'loading') return <Splash />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'new' ? (
          <Stack.Screen name="OnboardingStack" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
        )}
        <Stack.Screen 
          name="ModalStack" 
          component={ModalNavigator} 
          options={{ presentation: 'transparentModal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
