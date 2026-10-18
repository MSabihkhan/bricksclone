import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { completeOnboarding } from '../state/onboarding';
import { AppPicker } from '../components/AppPicker';

/** Choose apps, from the last onboarding page. */
export function SelectApps() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  // Back to the onboarding page once the list is saved. If this is ever the only screen in the
  // stack, finish onboarding rather than strand the user.
  const finish = () => {
    if (navigation.canGoBack()) { navigation.goBack(); return; }
    completeOnboarding()
      .then(() => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'MainTabs' }] }))
      .catch(() => {});
  };

  return <AppPicker eyebrow="CHOOSE APPS" onBack={finish} onDone={finish} onLater={finish} />;
}
