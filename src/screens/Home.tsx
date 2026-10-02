import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BrickMark } from '../components/BrickMark';
import { Icon } from '../components/Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useFocusStore } from '../state/useFocusStore';
import { FocusLock } from './FocusLock';
import { db } from '../db';
import type { Tag } from '../db/types';
import { HomeStackParamList } from '../navigation/types';
import { getFocusBars, getTodayStats, TodayStats } from '../services/stats/statsService';
import type { BarDatum } from '../services/stats/statsService';
import type { Session } from '../db/types';
import { useNfcSessionStart } from '../hooks/useNfcSessionStart';
import { durationLabel, modeLabel } from '../utils/onboarding';
import { formatToday } from './homeHeaderModel';
import { ROUTINES, RoutineType } from '../features/rituals';
import { RitualSheet } from '../components/RitualSheet';
import { OutcomeSheet } from '../components/OutcomeSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

function formatFocused(sec: number) {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function Home() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const { machine, starting, todayFocusSec, hydrate, startSession, endSession } = useFocusStore();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appsCount, setAppsCount] = useState(0);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [weekBars, setWeekBars] = useState<BarDatum[]>([]);
  const [todaySessions, setTodaySessions] = useState(0);
  const [routineType, setRoutineType] = useState<RoutineType>('study');
  const [ritualOpen, setRitualOpen] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Session | null>(null);
  const [dismissedOutcomeId, setDismissedOutcomeId] = useState<number | null>(null);

  useEffect(() => {
    hydrate().catch(() => {});
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') hydrate().catch(() => {});
    });
    return () => subscription.remove();
  }, [hydrate]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    Promise.all([
      db.tags.listTags(),
      db.blockedApps.listBlockedApps(),
      getTodayStats(),
      getFocusBars('week'),
    ]).then(async ([savedTags, apps, stats, bars]) => {
      const now = Math.floor(Date.now() / 1000);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const sessions = await db.sessions.sessionsBetween(Math.floor(start.getTime() / 1000), now);
      if (!mounted) return;
      setTags(savedTags);
      setSelectedId(current => current && savedTags.some(tag => tag.id === current) ? current : savedTags[0]?.id ?? null);
      setAppsCount(apps.length);
      setTodayStats(stats);
      setWeekBars(bars);
      setTodaySessions(sessions.length);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []));

  useEffect(() => {
    if (machine !== 'idle') return;
    Promise.all([db.sessions.getPendingOutcome(), db.sessions.listSessions()]).then(([pending, sessions]) => {
      setPendingOutcome(pending && pending.id !== dismissedOutcomeId ? pending : null);
      setNextStep(sessions.find(session => session.nextStep?.trim())?.nextStep ?? null);
    }).catch(() => {});
  }, [dismissedOutcomeId, machine]);

  const beginSession = useCallback(async (tagId: string, intention: string) => {
    try {
      await startSession(tagId, { routineType, intention });
      setRitualOpen(false);
    } catch (error) {
      Alert.alert('Could not start focus', error instanceof Error ? error.message : String(error));
    }
  }, [routineType, startSession]);

  const handleRegistered = useCallback(async (tagId: string) => {
    if (useFocusStore.getState().machine === 'active') return;
    setSelectedId(tagId);
    setRitualOpen(true);
  }, []);

  useNfcSessionStart({
    onRegistered: handleRegistered,
    onUnregistered: () => navigation.navigate('AddBrick'),
    onEndTap: () => endSession('nfc'),
    registeredTagIds: tags.map(tag => tag.id),
  });

  if (machine === 'active') return <FocusLock />;

  const selected = tags.find(tag => tag.id === selectedId) ?? tags[0];
  const focusSec = todayStats?.focusSec ?? todayFocusSec;
  const visibleBars = weekBars.slice(-7);
  const maxBar = Math.max(1, ...visibleBars.map(bar => bar.value));

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatToday(new Date())}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={12} onPress={() => navigation.getParent()?.navigate('SettingsTab' as never)} style={styles.headerButton}>
            <Icon name="settings" size={21} color={theme.colors.text} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Choose a ritual</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ritualRail} style={styles.ritualRailOuter}>
          {ROUTINES.map(routine => {
            const active = routine.id === routineType;
            return (
              <Pressable key={routine.id} onPress={() => setRoutineType(routine.id)} style={[styles.ritualChip, active && styles.ritualChipActive]} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                <Text style={[styles.ritualText, active && styles.ritualTextActive]}>{routine.shortLabel}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Next session</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRail} style={styles.modeRailOuter}>
          {tags.map(tag => {
            const active = tag.id === selected?.id;
            return (
              <Pressable key={tag.id} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Select ${modeLabel(tag.mode)}`} onPress={() => setSelectedId(tag.id)} style={({ pressed }) => [styles.modeCard, active && styles.modeCardActive, pressed && styles.pressed]}>
                <BrickMark size={38} style={active ? styles.activeMark : undefined} />
                <View>
                  <Text style={[styles.modeName, active && styles.modeActiveText]}>{modeLabel(tag.mode)}</Text>
                  <Text style={[styles.modeMeta, active && styles.modeActiveText]}>{durationLabel(tag.duration).toUpperCase()}</Text>
                  <Text style={[styles.modeMeta, active && styles.modeActiveText]}>{appsCount} APPS BLOCKED</Text>
                </View>
              </Pressable>
            );
          })}
          {tags.length === 0 && (
            <Pressable style={styles.emptyMode} onPress={() => navigation.navigate('AddBrick')}>
              <BrickMark size={38} />
              <Text style={styles.emptyModeTitle}>Connect your first Brick</Text>
            </Pressable>
          )}
        </ScrollView>

        <Button label={selected ? `Set ${ROUTINES.find(routine => routine.id === routineType)?.shortLabel.toLowerCase()} intention` : 'Connect a Brick'} onPress={() => selected ? setRitualOpen(true) : navigation.navigate('AddBrick')} disabled={starting} />
        <View style={styles.tapHint}>
          <Icon name="radio" size={15} color={theme.colors.muted} />
          <Text style={styles.tapHintText}>{selected ? `or tap ${selected.name}` : 'or tap an unregistered Brick'}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryValue}>{formatFocused(focusSec)}</Text>
              <Text style={styles.summaryLabel}>FOCUSED TODAY · {todaySessions} {todaySessions === 1 ? 'SESSION' : 'SESSIONS'}</Text>
            </View>
            <Text style={styles.summaryPeriod}>Week</Text>
          </View>
          <View style={styles.bars}>
            {visibleBars.map((bar, index) => (
              <View key={`${bar.label}-${index}`} style={[styles.bar, { height: 8 + Math.round((bar.value / maxBar) * 22) }, index === visibleBars.length - 1 && styles.barToday]} />
            ))}
          </View>
        </View>

        <View style={styles.statusRow}>
          <Icon name="lock" size={14} color={theme.colors.faint} />
          <Text style={styles.statusText}>Nothing blocked right now</Text>
        </View>
      </ScrollView>
      <RitualSheet visible={ritualOpen} routineType={routineType} nextStep={nextStep} busy={starting} onClose={() => setRitualOpen(false)} onStart={intention => selected && beginSession(selected.id, intention)} />
      <OutcomeSheet
        session={pendingOutcome}
        onSkip={() => { if (pendingOutcome) setDismissedOutcomeId(pendingOutcome.id); setPendingOutcome(null); }}
        onSave={(outcome, next) => {
          if (!pendingOutcome) return;
          db.sessions.saveOutcome(pendingOutcome.id, { outcome, nextStep: next }).then(() => {
            setNextStep(next || null);
            setPendingOutcome(null);
          }).catch(() => {});
        }}
      />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scroll: { paddingHorizontal: 22, paddingBottom: 34, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 34 },
  date: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  sectionLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 10 },
  ritualRailOuter: { marginHorizontal: -22, marginBottom: 24 },
  ritualRail: { paddingHorizontal: 22, gap: 8 },
  ritualChip: { height: 42, borderRadius: 13, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card2, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  ritualChipActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  ritualText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  ritualTextActive: { color: theme.colors.bg },
  modeRailOuter: { marginHorizontal: -22, marginBottom: 20 },
  modeRail: { paddingHorizontal: 22, gap: 12 },
  modeCard: { width: 176, height: 208, borderRadius: 24, padding: 18, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'space-between' },
  modeCardActive: { backgroundColor: theme.mode === 'dark' ? '#F7F7F5' : '#111113', borderColor: theme.mode === 'dark' ? '#F7F7F5' : '#111113' },
  activeMark: { backgroundColor: theme.mode === 'dark' ? '#202224' : '#FFFFFF' },
  modeName: { color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 3 },
  modeMeta: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 12, lineHeight: 17 },
  modeActiveText: { color: theme.mode === 'dark' ? '#111113' : '#F7F7F5' },
  emptyMode: { width: 220, height: 208, borderRadius: 24, padding: 18, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'space-between' },
  emptyModeTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  tapHintText: { color: theme.colors.muted, fontSize: 13, fontWeight: '400' },
  summaryCard: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, padding: 18, marginTop: 'auto', minHeight: 124 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryValue: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 16 },
  summaryLabel: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 11, marginTop: 3 },
  summaryPeriod: { color: theme.colors.text, fontSize: 13 },
  bars: { height: 38, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  bar: { flex: 1, minHeight: 8, borderRadius: 2, backgroundColor: theme.colors.card2 },
  barToday: { backgroundColor: theme.colors.accent },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  statusText: { color: theme.colors.muted, fontSize: 13 },
});
