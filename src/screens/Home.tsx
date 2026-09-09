import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { RingProgress } from '../components/RingProgress';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useFocusStore } from '../state/useFocusStore';
import { FocusLock } from './FocusLock';
import { db } from '../db';
import type { Tag, BlockedAttempt } from '../db/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { getTodayStats, TodayStats } from '../services/stats/statsService';
import { useNfcSessionStart } from '../hooks/useNfcSessionStart';
import { modeLabel } from '../utils/onboarding';
import { formatToday, greetingFor, initialsFor, relativeTime } from './homeHeaderModel';

const locIcon: Record<string, IconName> = {
  desk: 'monitor',
  bedroom: 'bed',
  office: 'building',
  kitchen: 'coffee',
  studio: 'music',
  car: 'car',
};

export function Home() {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { machine, starting, todayFocusSec, hydrate, startSession, endSession, liveBlocked } = useFocusStore();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeAppsCount, setActiveAppsCount] = useState(0);
  const [activity, setActivity] = useState<BlockedAttempt[]>([]);
  const [userName, setUserName] = useState('');

  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);

  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    hydrate();
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const stats = await getTodayStats();
        const t = await db.tags.listTags();
        const apps = await db.blockedApps.listBlockedApps();
        const name = await db.settings.get('user_name');

        const now = Math.floor(Date.now() / 1000);
        const d = new Date(now * 1000);
        d.setHours(0, 0, 0, 0);
        const start = Math.floor(d.getTime() / 1000);
        const sessions = await db.sessions.sessionsBetween(start, now);

        // Live Activity mirrors the most recent session, running or finished.
        const latest = sessions[0];
        const attempts = latest ? await db.blockedAttempts.attemptsForSession(latest.id) : [];

        if (active) {
          setTodayStats(stats);
          setTags(t);
          setActiveAppsCount(apps.length);
          setTodaySessionsCount(sessions.length);
          setActivity(attempts.slice(0, 5));
          setUserName(name || '');
          if (stats) {
            useFocusStore.setState({ liveBlocked: Math.max(useFocusStore.getState().liveBlocked, stats.blocked) });
          }
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const beginSession = async (tagId: string) => {
    try {
      await startSession(tagId);
    } catch (error) {
      Alert.alert('Could not start focus', error instanceof Error ? error.message : String(error));
    }
  };

  const onStartFocus = () => {
    if (tags.length > 0) {
      beginSession(tags[0].id);
    } else {
      navigation.navigate('AddBrick');
    }
  };

  const handleRegistered = useCallback(async (tagId: string) => {
    if (useFocusStore.getState().machine === 'active') return;
    try {
      await startSession(tagId);
    } catch (error) {
      Alert.alert('Could not start focus', error instanceof Error ? error.message : String(error));
    }
  }, [startSession]);

  const handleUnregistered = useCallback(() => {
    if (useFocusStore.getState().machine === 'active') return;
    navigation.navigate('AddBrick');
  }, [navigation]);

  // Tapping the same Brick again is the only non-penalised way out of a session.
  const handleEndTap = useCallback(async () => {
    if (useFocusStore.getState().machine !== 'active') return;
    await endSession('nfc');
  }, [endSession]);

  useNfcSessionStart({
    onRegistered: handleRegistered,
    onUnregistered: handleUnregistered,
    onEndTap: handleEndTap,
    registeredTagIds: tags.map(t => t.id)
  });

  if (machine === 'active') {
    return <FocusLock />;
  }

  const focusSec = todayStats ? todayStats.focusSec : todayFocusSec;
  const goalSec = todayStats ? todayStats.goalSec : 210 * 60;

  const h = Math.floor(focusSec / 3600);
  const m = Math.floor((focusSec % 3600) / 60);
  const goalH = Math.floor(goalSec / 3600);
  const goalM = Math.floor((goalSec % 3600) / 60);

  const goalPct = goalSec > 0 ? Math.min(focusSec / goalSec, 1) : 0;
  const goalPctStr = `${Math.floor(goalPct * 100)}%`;

  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const greeting = userName ? `${greetingFor(now)}, ${userName}` : greetingFor(now);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateLine}>{formatToday(now)}</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(userName)}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>FOCUS TODAY</Text>
            {todayStats && todayStats.streakDays > 0 ? (
              <View style={[styles.activePill, { backgroundColor: theme.colors.card2 }]}>
                <Icon name="flame" size={14} color={theme.colors.accent} />
                <Text style={styles.activePillText}>{todayStats.streakDays}-day streak</Text>
              </View>
            ) : (
              <View style={styles.activePill}>
                <Animated.View style={[styles.liveDot, { opacity: dotAnim }]} />
                <Text style={styles.activePillText}>{activeAppsCount} apps blocked</Text>
              </View>
            )}
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroRing}>
              <RingProgress size={98} stroke={9} color={theme.colors.accent} trackColor={theme.colors.track} progress={goalPct}>
                <Text style={styles.heroRingPct}>{goalPctStr}</Text>
                <Text style={styles.heroRingOf}>OF GOAL</Text>
              </RingProgress>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTime}>{h}h {m}m</Text>
              <Text style={styles.heroGoal}>{h}h {m}m of {goalH}h {goalM > 0 ? `${goalM}m ` : ''}goal</Text>
            </View>
          </View>
          <Button label={starting ? 'Starting…' : 'Start Focus Session'} icon="play" onPress={onStartFocus} disabled={starting} />
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}><Icon name="clock" size={18} color={theme.colors.blue} /></View>
            <View>
              <Text style={styles.metricVal}>{todaySessionsCount}</Text>
              <Text style={styles.metricLabel}>Sessions</Text>
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}><Icon name="shield" size={18} color={theme.colors.accent} /></View>
            <View>
              <Text style={styles.metricVal}>{liveBlocked}</Text>
              <Text style={styles.metricLabel}>Blocked</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="My Bricks" right="Tap a Brick to focus" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 11 }}>
          {tags.map((tag) => {
            const iconName = locIcon[tag.location || 'desk'] || 'grid';
            return (
              <Pressable key={tag.id} style={styles.brickCard} disabled={starting} accessibilityRole="button" accessibilityLabel={`Start ${tag.name} focus session`} onPress={() => beginSession(tag.id)}>
                <View style={styles.brickCardTop}>
                  <View style={styles.brickIconBox}>
                    <Icon name={iconName} size={20} color={theme.colors.accent} />
                  </View>
                  <View style={styles.brickDot} />
                </View>
                <View>
                  <Text style={styles.brickName}>{tag.name}</Text>
                  <Text style={styles.brickMeta}>{modeLabel(tag.mode)} · {activeAppsCount} global apps</Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable style={styles.addBrickCard} onPress={() => navigation.navigate('AddBrick')}>
            <View style={styles.brickIconBox}>
              <Icon name="plus" size={20} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.brickName}>Add a Brick</Text>
              <Text style={styles.brickMeta}>Tap to scan a new tag</Text>
            </View>
          </Pressable>
        </ScrollView>

        <SectionHeader title="Live Activity" right={<View style={styles.livePill}><Animated.View style={[styles.livePillDot, { opacity: dotAnim }]} /><Text style={styles.livePillText}>Live</Text></View>} />
        <View style={styles.activityCard}>
          {activity.length === 0 ? (
            <View style={styles.activityRow}>
              <Text style={styles.activityEmpty}>No blocked attempts yet today.</Text>
            </View>
          ) : (
            activity.map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <View style={styles.activityIconBox}>
                  <Icon name="shield" size={16} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{a.label}</Text>
                  <Text style={styles.activitySub}>Blocked</Text>
                </View>
                <Text style={styles.activityTime}>{relativeTime(a.createdAt, nowSec)}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  dateLine: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
  greeting: { fontSize: 25, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.75, marginTop: 3 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.card2, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.text, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  heroCard: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 24, padding: 22, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.76, color: theme.colors.muted },
  activePill: { backgroundColor: theme.colors.card2, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.colors.green },
  activePillText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 22, marginBottom: 20 },
  heroRing: { position: 'relative', width: 98, height: 98 },
  heroRingPct: { fontSize: 19, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.38 },
  heroRingOf: { fontSize: 9, color: theme.colors.muted, fontWeight: '700', letterSpacing: 0.72 },
  heroTime: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  heroGoal: { fontSize: 13, color: theme.colors.muted, fontWeight: '600', marginTop: 8 },

  metricsGrid: { flexDirection: 'row', gap: 11, marginTop: 14 },
  metricCard: { flex: 1, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 13, gap: 12 },
  metricIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.card2, alignItems: 'center', justifyContent: 'center' },
  metricVal: { fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: '600', marginTop: 1 },

  brickCard: { width: 150, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 16, minHeight: 118, justifyContent: 'space-between' },
  brickCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brickIconBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: theme.colors.card2, alignItems: 'center', justifyContent: 'center' },
  brickDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.green, marginTop: 5 },
  brickName: { fontSize: 16, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.32 },
  brickMeta: { fontSize: 11, fontWeight: '600', color: theme.colors.muted, marginTop: 2 },

  addBrickCard: { width: 150, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 18, padding: 16, minHeight: 118, justifyContent: 'space-between', borderStyle: 'dashed' },

  livePill: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  livePillDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.colors.green },
  livePillText: { fontSize: 12, fontWeight: '700', color: theme.colors.green },

  activityCard: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.border },
  activityIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.card2, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  activitySub: { fontSize: 11, fontWeight: '600', color: theme.colors.muted, marginTop: 1 },
  activityTime: { fontSize: 11, fontWeight: '600', color: theme.colors.faint, fontVariant: ['tabular-nums'] },
  activityEmpty: { color: theme.colors.faint, fontSize: 12, fontWeight: '600' },
});
