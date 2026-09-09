import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon } from '../components/Icon';
import { useTheme, useThemeControls } from '../theme/ThemeContext';
import { ColorMode } from '../theme';
import { SettingsStackParamList } from '../navigation/types';
import { db } from '../db';
import { getPeriodStats } from '../services/stats/statsService';
import { initialsFor } from './homeHeaderModel';

type NavProp = NativeStackNavigationProp<SettingsStackParamList>;

export function Settings() {
  const theme = useTheme();
  const { mode: appearance, setMode: setAppearance } = useThemeControls();
  const navigation = useNavigation<NavProp>();
  
  const [streak, setStreak] = useState(0);
  const [blockedAppsCount, setBlockedAppsCount] = useState(0);

  const [strictMode, setStrictMode] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(210);
  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const stats = await getPeriodStats('day');
          const apps = await db.blockedApps.listBlockedApps();
          const sets = await db.settings.getAll();
          
          if (active) {
            setStreak(stats.streakDays || 0);
            setBlockedAppsCount(apps.length);
            
            setStrictMode(sets.strict_mode === '1');
            if (sets.daily_goal) setDailyGoal(Math.floor(Number(sets.daily_goal) / 60));
            setUserName(sets.user_name || '');
          }
        } catch (err) {
          console.error(err);
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const updateSetting = async (key: string, val: string) => {
    await db.settings.set(key, val);
  };

  const commitName = () => {
    setEditingName(false);
    updateSetting('user_name', userName.trim());
  };

  const handleGoalChange = (val: number) => {
    setDailyGoal(val);
    updateSetting('daily_goal', String(val * 60));
  };

  const formatGoal = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>Settings</Text>
        </View>

        <Card radius={20} padding={18}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>{initialsFor(userName)}</Text>
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <TextInput
                  style={[styles.profileName, styles.profileNameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.faint}
                  autoFocus
                  returnKeyType="done"
                  onBlur={commitName}
                  onSubmitEditing={commitName}
                />
              ) : (
                <Pressable onPress={() => setEditingName(true)}>
                  <Text style={[styles.profileName, { color: theme.colors.text }]}>
                    {userName || 'Add your name'}
                  </Text>
                </Pressable>
              )}
              <Text style={[styles.profileSub, { color: theme.colors.muted }]}>{streak}d streak</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={editingName ? 'Save profile name' : 'Edit profile name'} onPress={() => (editingName ? commitName() : setEditingName(true))} hitSlop={10}>
              <Icon name={editingName ? 'check' : 'chevron'} size={20} color={theme.colors.faint} />
            </Pressable>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: theme.colors.faint }]}>FOCUS</Text>
          <Card radius={20} padding={0} style={{ overflow: 'hidden' }}>
            <View style={styles.listRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
                <Icon name="shield" size={18} color={theme.colors.text} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Default Strict Mode</Text>
                <Text style={[styles.rowSub, { color: theme.colors.muted }]}>Applied to newly registered Bricks</Text>
              </View>
              <Switch accessibilityLabel="Default Strict Mode" value={strictMode} onValueChange={(v) => { setStrictMode(v); updateSetting('strict_mode', v ? '1' : '0'); }} />
            </View>
          </Card>
        </View>

        <Card radius={20} padding={20}>
          <View style={styles.sliderRowTop}>
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>Daily goal</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.accent, fontVariant: ['tabular-nums'] }]}>{formatGoal(dailyGoal)}</Text>
          </View>
          <Slider accessibilityLabel="Daily focus goal" value={dailyGoal} min={30} max={480} step={15} onValueChange={handleGoalChange} accentColor={theme.colors.accent} />
        </Card>

        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: theme.colors.faint }]}>APP</Text>
          <Card radius={20} padding={0} style={{ overflow: 'hidden' }}>
            <View style={styles.listRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
                <Icon name="moon" size={18} color={theme.colors.text} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Appearance</Text>
              </View>
              <View style={{ width: 140 }}>
                <SegmentedControl
                  options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }]}
                  value={appearance}
                  onChange={(v) => setAppearance(v as ColorMode)}
                />
              </View>
            </View>
          </Card>
        </View>

        <Card radius={20} padding={0} style={{ overflow: 'hidden' }}>
          <Pressable style={styles.listRow} onPress={() => navigation.navigate('ManageTags')}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="grid" size={18} color={theme.colors.text} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Bricks</Text>
            </View>
            <Icon name="chevron" size={20} color={theme.colors.faint} />
          </Pressable>
          <Pressable style={[styles.listRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate('ManageBlockedApps')}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="smartphone" size={18} color={theme.colors.text} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Blocked apps</Text>
            </View>
            <Text style={[styles.navValue, { color: theme.colors.muted }]}>{blockedAppsCount} apps</Text>
            <Icon name="chevron" size={20} color={theme.colors.faint} />
          </Pressable>
          <Pressable style={[styles.listRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate('EmergencyHistory')}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="clock" size={18} color={theme.colors.text} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>History</Text>
            </View>
            <Icon name="chevron" size={20} color={theme.colors.faint} />
          </Pressable>
          <Pressable style={[styles.listRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate('About')}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="info" size={18} color={theme.colors.text} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>About Bricks</Text>
            </View>
            <Icon name="chevron" size={20} color={theme.colors.faint} />
          </Pressable>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.faint }]}>Bricks · v1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    marginBottom: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileNameInput: { borderBottomWidth: 1, paddingVertical: 2, minWidth: 160 },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.14 * 11,
    marginLeft: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sliderRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  sliderDivider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  navValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
