import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import {
  Intro,
  WhyUsageAccess,
  GrantUsageAccess,
  WhyAccessibility,
  GrantAccessibility,
  BatteryOptimization,
  RegisterTag,
  SelectApps,
  OnboardingDone,
} from '../screens';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="WhyUsageAccess" component={WhyUsageAccess} />
      <Stack.Screen name="GrantUsageAccess" component={GrantUsageAccess} />
      <Stack.Screen name="WhyAccessibility" component={WhyAccessibility} />
      <Stack.Screen name="GrantAccessibility" component={GrantAccessibility} />
      <Stack.Screen name="BatteryOptimization" component={BatteryOptimization} />
      <Stack.Screen name="RegisterTag" component={RegisterTag} />
      <Stack.Screen name="SelectApps" component={SelectApps} />
      <Stack.Screen name="OnboardingDone" component={OnboardingDone} />
    </Stack.Navigator>
  );
}
