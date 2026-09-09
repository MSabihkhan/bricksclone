import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MainTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { Insights } from '../screens';
import { Icon, IconName } from '../components/Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const getIconName = (routeName: string): IconName => {
  if (routeName === 'HomeTab') return 'grid';
  if (routeName === 'Insights') return 'barChart';
  if (routeName === 'SettingsTab') return 'settings';
  return 'grid';
};

const getLabel = (routeName: string) => {
  if (routeName === 'HomeTab') return 'Home';
  if (routeName === 'Insights') return 'Insights';
  if (routeName === 'SettingsTab') return 'Settings';
  return '';
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const anim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 250,
    }).start();
  }, [state.index, anim]);

  const tabWidth = width / 3;
  const translateX = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2]
  });

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.indicator,
          { width: tabWidth, transform: [{ translateX }] },
        ]}
      >
        <View style={styles.indicatorBar} />
      </Animated.View>

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={getLabel(route.name)}
            accessibilityState={{ selected: isFocused }}
          >
            <Icon
              name={getIconName(route.name)}
              size={24}
              color={isFocused ? theme.colors.text : theme.colors.faint}
            />
            <Text style={[styles.label, { color: isFocused ? theme.colors.text : theme.colors.faint }]}>
              {getLabel(route.name)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function renderCustomTabBar(props: BottomTabBarProps) {
  return <CustomTabBar {...props} />;
}

export function MainTabsNavigator() {
  return (
    <Tab.Navigator tabBar={renderCustomTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="Insights" component={Insights} />
      <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} />
    </Tab.Navigator>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 16,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    alignItems: 'center',
  },
  indicatorBar: {
    width: '100%',
    height: 3,
    backgroundColor: theme.colors.accent,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
});
