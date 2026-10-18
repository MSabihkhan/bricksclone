import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { Insights, ComingSoon } from '../screens';
import { useWalkthroughTarget } from '../walkthrough/Walkthrough';
import { useFocusStore } from '../state/useFocusStore';
import { useFocusUi } from '../state/useFocusUi';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Glyph } from '../ui/kit';
import type { IconKey } from '../ui/icons';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TABS: Record<keyof MainTabsParamList, { label: string; icon: IconKey }> = {
  HomeTab: { label: 'Home', icon: 'grid' },
  Insights: { label: 'Insights', icon: 'insights' },
  ComingSoonTab: { label: 'Soon', icon: 'zap' },
  SettingsTab: { label: 'Settings', icon: 'gear' },
};

/** Screens inside a tab that take the whole display (the design hides the bar on these). */
const FULL_SCREEN = new Set(['AddBrick', 'EditKey', 'ManageBlockedApps']);

function focusedChild(route: BottomTabBarProps['state']['routes'][number]): string | undefined {
  const nested = route.state as { index?: number; routes?: Array<{ name: string }> } | undefined;
  if (!nested?.routes) return undefined;
  return nested.routes[nested.index ?? nested.routes.length - 1]?.name;
}

/** Floating pill tab bar (Fasla Redesign v2). Active tab shows its label on a red-tinted pill. */
function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const insightsTarget = useWalkthroughTarget('tabs.insights');
  const focusRunning = useFocusStore(s => s.machine === 'active');
  const minimized = useFocusUi(s => s.minimized);

  const current = state.routes[state.index];
  const child = focusedChild(current);
  const onFocusScreen = current.name === 'HomeTab' && focusRunning && !minimized && (child === undefined || child === 'Home');
  if (onFocusScreen || (child && FULL_SCREEN.has(child))) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 18 + insets.bottom }]}>
      <View style={[styles.bar, { backgroundColor: pal.tab, borderColor: pal.c26262B }]}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name as keyof MainTabsParamList];
          const active = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const live = route.name === 'HomeTab' && focusRunning;
          return (
            <Pressable
              key={route.key}
              ref={route.name === 'Insights' ? insightsTarget : undefined}
              onPress={onPress}
              style={[styles.tab, active && { backgroundColor: pal.c2A1416 }]}
              accessibilityRole="tab"
              accessibilityLabel={live ? `${meta.label}, focus is running` : meta.label}
              accessibilityState={{ selected: active }}
            >
              <View>
                <Glyph name={meta.icon} size={20} width={1.8} color={active ? pal.cFF5A5F : pal.c85858C} />
                {live ? <View style={[styles.liveDot, { borderColor: active ? pal.c2A1416 : pal.c17171A }]} /> : null}
              </View>
              {active ? <Text style={[styles.label, { color: pal.cFF5A5F }]} numberOfLines={1}>{meta.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function renderTabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

export function MainTabsNavigator() {
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="Insights" component={Insights} />
      <Tab.Screen name="ComingSoonTab" component={ComingSoon} />
      <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  bar: { height: 64, borderRadius: 999, borderWidth: 1, flexDirection: 'row', padding: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  tab: { flex: 1, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  liveDot: { position: 'absolute', top: -3, right: -5, width: 9, height: 9, borderRadius: 5, backgroundColor: '#E5242B', borderWidth: 1.5 },
});
