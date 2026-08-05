import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { Home, FocusLock, AddBrick } from '../screens';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="FocusLock" component={FocusLock} options={{ gestureEnabled: false }} />
      <Stack.Screen name="AddBrick" component={AddBrick} />
    </Stack.Navigator>
  );
}
