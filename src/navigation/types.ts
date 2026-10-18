import { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Welcome: undefined;
  SelectApps: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  /** Register a key. `tagId` comes from the pairing scan; without it the screen scans first. */
  AddBrick: { tagId?: string } | undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  ManageTags: undefined;
  ManageBlockedApps: undefined;
  EmergencyHistory: undefined;
  About: undefined;
  PrayerReminder: undefined;
  Permissions: undefined;
  EditKey: { tagId: string };
};

export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Insights: undefined;
  ComingSoonTab: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type ModalStackParamList = {
  EmergencyOverride: undefined;
};

export type RootStackParamList = {
  OnboardingStack: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  ModalStack: NavigatorScreenParams<ModalStackParamList>;
};
