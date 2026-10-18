import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './types';
import { Settings, ManageTags, ManageBlockedApps, EmergencyHistory, About, PrayerReminder, Permissions, EditKey } from '../screens';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="ManageTags" component={ManageTags} />
      <Stack.Screen name="ManageBlockedApps" component={ManageBlockedApps} />
      <Stack.Screen name="EmergencyHistory" component={EmergencyHistory} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="PrayerReminder" component={PrayerReminder} />
      <Stack.Screen name="Permissions" component={Permissions} />
      <Stack.Screen name="EditKey" component={EditKey} />
    </Stack.Navigator>
  );
}
