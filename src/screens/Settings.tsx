import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Switch } from '../components/Switch';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon, IconName } from '../components/Icon';
import { useTheme, useThemeControls } from '../theme/ThemeContext';
import { ColorMode } from '../theme';
import { SettingsStackParamList } from '../navigation/types';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';

type NavProp = NativeStackNavigationProp<SettingsStackParamList>;
type SessionEndMode = 'brick' | 'timer';
interface RowProps { icon: IconName; label: string; value?: string; onPress?: () => void; last?: boolean; children?: React.ReactNode }

export function Settings() {
  const theme = useTheme();
  const { mode: appearance, setMode: setAppearance } = useThemeControls();
  const navigation = useNavigation<NavProp>();
  const [brickSummary, setBrickSummary] = useState('None');
  const [blockedAppsCount, setBlockedAppsCount] = useState(0);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [sessionEndMode, setSessionEndMode] = useState<SessionEndMode>('brick');

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([db.tags.listTags(), db.blockedApps.listBlockedApps(), db.settings.getAll(), BlockingModule.hasUsageAccess(), BlockingModule.isAccessibilityEnabled()])
      .then(([tags, apps, sets, usage, accessibility]) => {
        if (!active) return;
        setBrickSummary(tags.length === 0 ? 'None' : tags.length === 1 ? tags[0].name : `${tags.length} Bricks`);
        setBlockedAppsCount(apps.length);
        setStrictMode(sets.strict_mode === '1');
        setSessionEndMode(sets.session_end_mode === 'timer' ? 'timer' : 'brick');
        setPermissionsReady(usage && accessibility);
      }).catch(error => console.warn('Could not load settings', error));
    return () => { active = false; };
  }, []));

  const updateSetting = async (key: string, value: string) => db.settings.set(key, value);
  const updateEndMode = (value: string) => {
    const mode: SessionEndMode = value === 'timer' ? 'timer' : 'brick';
    setSessionEndMode(mode);
    updateSetting('session_end_mode', mode);
  };
  const openPermissions = async () => {
    if (!(await BlockingModule.hasUsageAccess())) return BlockingModule.requestUsageAccess();
    if (!(await BlockingModule.isAccessibilityEnabled())) return BlockingModule.requestAccessibility();
  };

  const Row = ({ icon, label, value, onPress, last, children }: RowProps) => (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.card2 }]}><Icon name={icon} size={18} color={theme.colors.text} /></View>
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      {children || (value ? <Text style={[styles.rowValue, { color: theme.colors.muted }]}>{value}</Text> : null)}
      {onPress ? <Icon name="chevron" size={18} color={theme.colors.faint} /> : null}
    </Pressable>
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.faint }]}>YOUR SETUP</Text>
          <Card padding={0} radius={20} style={styles.clipped}>
            <Row icon="radio" label="My Bricks" value={brickSummary} onPress={() => navigation.navigate('ManageTags')} />
            <Row icon="smartphone" label="Blocked apps" value={`${blockedAppsCount} apps`} onPress={() => navigation.navigate('ManageBlockedApps')} />
            <Row icon="shield" label="Permissions" value={permissionsReady ? 'All set' : 'Action needed'} onPress={openPermissions} last />
          </Card>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.faint }]}>FOCUS</Text>
          <Card padding={0} radius={20} style={styles.clipped}>
            <View style={[styles.modeBlock, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.modeTitleRow}>
                <View style={[styles.rowIcon, { backgroundColor: theme.colors.card2 }]}><Icon name="timer" size={18} color={theme.colors.text} /></View>
                <View style={styles.modeCopy}>
                  <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Session ending</Text>
                  <Text style={[styles.modeHint, { color: theme.colors.muted }]}>Choose how a focus session can finish.</Text>
                </View>
              </View>
              <SegmentedControl options={[{ label: 'Brick only', value: 'brick' }, { label: 'Time limit', value: 'timer' }]} value={sessionEndMode} onChange={updateEndMode} />
              <Text style={[styles.modeFootnote, { color: theme.colors.muted }]}>{sessionEndMode === 'brick' ? 'Only tapping the same Brick ends focus.' : 'Focus ends at the Brick’s saved time limit.'}</Text>
            </View>
            <Row icon="lock" label="Strict mode by default" last>
              <Switch accessibilityLabel="Strict mode by default" value={strictMode} onValueChange={value => { setStrictMode(value); updateSetting('strict_mode', value ? '1' : '0'); }} />
            </Row>
          </Card>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.faint }]}>APPEARANCE</Text>
          <Card padding={14} radius={20}><SegmentedControl options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }]} value={appearance} onChange={value => setAppearance(value as ColorMode)} /></Card>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.faint }]}>ABOUT</Text>
          <Card padding={0} radius={20} style={styles.clipped}>
            <Row icon="clock" label="Session history" onPress={() => navigation.navigate('EmergencyHistory')} />
            <Row icon="info" label="About Bricks" onPress={() => navigation.navigate('About')} last />
          </Card>
        </View>
        <Text style={[styles.version, { color: theme.colors.faint }]}>BRICKS  ·  VERSION 1.1.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 18, paddingBottom: 42, gap: 26 }, section: { gap: 10 },
  sectionLabel: { fontFamily: 'IBMPlexMono-Medium', fontSize: 11, letterSpacing: 0.5, marginLeft: 4 }, clipped: { overflow: 'hidden' },
  row: { minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed: { opacity: 0.62 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' }, rowValue: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, maxWidth: 120 },
  modeBlock: { padding: 16, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth }, modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeCopy: { flex: 1, gap: 2 }, modeHint: { fontSize: 12, lineHeight: 17 }, modeFootnote: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, lineHeight: 16 },
  version: { fontFamily: 'IBMPlexMono-Regular', fontSize: 10, textAlign: 'center', letterSpacing: 0.4 },
});
