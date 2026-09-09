import { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Intro: undefined;
  WhyUsageAccess: undefined;
  GrantUsageAccess: undefined;
  WhyAccessibility: undefined;
  GrantAccessibility: undefined;
  BatteryOptimization: undefined;
  RegisterTag: undefined;
  SelectApps: undefined;
  OnboardingDone: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  AddBrick: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  ManageTags: undefined;
  ManageBlockedApps: undefined;
  EmergencyHistory: undefined;
  About: undefined;
};

export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Insights: undefined;
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
