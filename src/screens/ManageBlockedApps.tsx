import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { AppPicker } from '../components/AppPicker';
import { showToast } from '../ui/kit';

/** Blocked apps, from Settings: the same picker, saving the main list. */
export function ManageBlockedApps() {
  const navigation = useNavigation();
  return (
    <AppPicker
      eyebrow="BLOCKED APPS"
      onBack={() => navigation.goBack()}
      onDone={() => { showToast('Blocked apps saved'); navigation.goBack(); }}
    />
  );
}
