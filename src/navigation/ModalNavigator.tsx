import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ModalStackParamList } from './types';
import { EmergencyOverride } from '../screens';

const Stack = createNativeStackNavigator<ModalStackParamList>();

export function ModalNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="EmergencyOverride" component={EmergencyOverride} />
    </Stack.Navigator>
  );
}
