import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { RingProgress } from '../components/RingProgress';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { useTheme } from '../theme/ThemeContext';
import { 
  getPeriodStats, getFocusBars, getTopBlocked, 
  getPeriodComparison, getCompletionByMode, getBestDay, getAvgSessionSec,
  Period, PeriodStats, BarDatum, TopApp 
} from '../services/stats/statsService';

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Insights() {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [bars, setBars] = useState<BarDatum[]>([]);
  const [topApps, setTopApps] = useState<TopApp[]>([]);
  
  const [cmp, setCmp] = useState<{ focusSec: number; prevFocusSec: number; deltaPct: number } | null>(null);
  const [completion, setCompletion] = useState<Array<{ mode: string; label: string; completed: number; total: number; pct: number }>>([]);
  const [bestDay, setBestDay] = useState<{ label: string; minutes: number } | null>(null);
  const [avgSec, setAvgSec] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const [s, b, t, c, comp, best, avg] = await Promise.all([
            getPeriodStats(period),
            getFocusBars(period),
            getTopBlocked(period),
            getPeriodComparison(period),
            getCompletionByMode(period),
            getBestDay(period),
            getAvgSessionSec(period)
          ]);
          if (active) {
            setStats(s);
            setBars(b);
            setTopApps(t);
            setCmp(c);
            setCompletion(comp);
            setBestDay(best);
            setAvgSec(avg);
          }
        } catch (err) {
          console.error(err);
        }
      };
      load();
      return () => { active = false; };
    }, [period])
  );

  const getPeriodLabel = () => {
    let title = 'This week';
    if (period === 'day') title = 'Today';
    if (period === 'month') title = 'This month';
    return title;
  };

  const maxAppCount = topApps.length > 0 ? topApps[0].count : 1;

  let deltaStr = '—';
  let deltaColor = theme.colors.muted;
  if (cmp) {
    if (cmp.deltaPct > 0) {
      deltaStr = `+${cmp.deltaPct}% vs last ${period}`;
      deltaColor = '#3DD68C'; // green
    } else if (cmp.deltaPct < 0) {
      deltaStr = `${cmp.deltaPct}% vs last ${period}`;
      deltaColor = '#E82127'; // accent
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>Insights</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{getPeriodLabel()}</Text>
        </View>

        <SegmentedControl
          options={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />

        <Card radius={22} style={styles.totalCard}>
          <Text style={[styles.eyebrow, { color: theme.colors.muted }]}>TOTAL FOCUS</Text>
          <Text style={[theme.typography.statLarge, { color: theme.colors.text, fontVariant: ['tabular-nums'] }]}>
            {stats ? formatDuration(stats.focusSec) : '0m'}
          </Text>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="flame" size={14} color={theme.colors.accent} />
              <Text style={[styles.chipText, { color: theme.colors.text }]}>{stats?.streakDays || 0}-day streak</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: theme.colors.card2 }]}>
              <Icon name="clock" size={14} color={theme.colors.muted} />
              <Text style={[styles.chipText, { color: theme.colors.text }]}>avg {formatDuration(avgSec)}</Text>
            </View>
          </View>
          <View style={[styles.statsRow, { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: theme.colors.text }]}>{stats?.sessions || 0}</Text>
              <Text style={[styles.statCap, { color: theme.colors.muted }]}>sessions</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: theme.colors.text }]}>{stats?.blocked || 0}</Text>
              <Text style={[styles.statCap, { color: theme.colors.muted }]}>blocked</Text>
            </View>
          </View>
        </Card>

        <View style={styles.ringsGrid}>
          <Card radius={18} padding={0} style={styles.ringCard}>
            <View style={styles.ringInner}>
              <RingProgress size={66} stroke={6} progress={(stats?.goalPct || 0)/100} color={theme.colors.accent} trackColor={theme.colors.track}>
                <Text style={[styles.ringVal, { color: theme.colors.text }]}>{stats?.goalPct || 0}%</Text>
              </RingProgress>
              <Text style={[styles.ringLbl, { color: theme.colors.muted }]}>Goal met</Text>
            </View>
          </Card>
          <Card radius={18} padding={0} style={styles.ringCard}>
            <View style={styles.ringInner}>
              <RingProgress size={66} stroke={6} progress={(stats?.consistencyPct || 0)/100} color={theme.colors.blue} trackColor={theme.colors.track}>
                <Text style={[styles.ringVal, { color: theme.colors.text }]}>{stats?.consistencyPct || 0}%</Text>
              </RingProgress>
              <Text style={[styles.ringLbl, { color: theme.colors.muted }]}>Consistency</Text>
            </View>
          </Card>
          <Card radius={18} padding={0} style={styles.ringCard}>
            <View style={styles.ringInner}>
              <RingProgress size={66} stroke={6} progress={Math.min((stats?.streakDays || 0)/7, 1)} color={theme.colors.green} trackColor={theme.colors.track}>
                <Text style={[styles.ringVal, { color: theme.colors.text }]}>{stats?.streakDays || 0}</Text>
              </RingProgress>
              <Text style={[styles.ringLbl, { color: theme.colors.muted }]}>Streak</Text>
            </View>
          </Card>
        </View>

        <Card radius={22} style={styles.barsCard}>
          <View style={styles.barsHeader}>
            <Text style={[styles.eyebrow, { color: theme.colors.muted }]}>FOCUS TREND</Text>
            <Text style={[styles.deltaLbl, { color: deltaColor }]}>{deltaStr}</Text>
          </View>
          <View style={styles.barsContainer}>
            {bars.map((b, i) => {
              const maxVal = Math.max(...bars.map(x => x.value), 1);
              const pct = (b.value / maxVal) * 100;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barVal, { color: theme.colors.faint }]}>{b.value > 0 ? Math.round(b.value/60) : ''}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.barFill, { 
                      height: `${pct}%`, 
                      backgroundColor: b.isMax ? theme.colors.accent : theme.colors.track,
                      borderTopLeftRadius: 8, borderTopRightRadius: 8,
                      borderBottomLeftRadius: 4, borderBottomRightRadius: 4
                    }]} />
                  </View>
                  <Text style={[styles.barLbl, { color: theme.colors.muted }]}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {completion.length > 0 && (
          <>
            <SectionHeader title="COMPLETION" />
            <Card radius={22} style={styles.completionCard}>
              {completion.map((c, i) => (
                <View key={c.mode} style={[styles.compRow, i > 0 && { marginTop: 12 }]}>
                  <View style={styles.compTextRow}>
                    <Text style={[styles.compLabel, { color: theme.colors.text }]}>{c.label}</Text>
                    <Text style={[styles.compCount, { color: theme.colors.muted }]}>{c.completed}/{c.total}</Text>
                  </View>
                  <View style={[styles.compTrack, { backgroundColor: theme.colors.track }]}>
                    <View style={[styles.compFill, { width: `${c.pct}%`, backgroundColor: theme.colors.accent }]} />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={[styles.twoCellCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cell}>
            <Text style={[styles.cellVal, { color: theme.colors.text }]}>{bestDay ? bestDay.label : '—'}</Text>
            <Text style={[styles.cellLbl, { color: theme.colors.faint }]}>BEST DAY</Text>
          </View>
          <View style={[styles.cellDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.cell}>
            <Text style={[styles.cellVal, { color: theme.colors.text }]}>{formatDuration(avgSec)}</Text>
            <Text style={[styles.cellLbl, { color: theme.colors.faint }]}>AVG SESSION</Text>
          </View>
        </View>

        <Card radius={22} style={styles.appsCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Most blocked</Text>
          {topApps.map((app, i) => {
            const pct = (app.count / maxAppCount) * 100;
            return (
              <View key={i} style={styles.appRow}>
                <Text style={[styles.appName, { color: theme.colors.text }]} numberOfLines={1}>{app.name}</Text>
                <View style={[styles.appTrack, { backgroundColor: theme.colors.track }]}>
                  <View style={[styles.appFill, { width: `${pct}%`, backgroundColor: i === 0 ? theme.colors.accent : theme.alpha(theme.colors.accent, 0.35) }]} />
                </View>
                <Text style={[styles.appCount, { color: theme.colors.muted, fontVariant: ['tabular-nums'] }]}>{app.count}</Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  totalCard: {
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.16 * 11,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  statCap: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
  },
  ringsGrid: {
    flexDirection: 'row',
    gap: 11,
  },
  ringCard: {
    flex: 1,
  },
  ringInner: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  ringVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  ringLbl: {
    fontSize: 11,
    fontWeight: '700',
  },
  barsCard: {
    gap: 16,
  },
  barsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deltaLbl: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  barsContainer: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 32,
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  barFill: {
    width: '100%',
  },
  barVal: {
    fontSize: 9,
    fontWeight: '700',
  },
  barLbl: {
    fontSize: 11,
    fontWeight: '700',
  },
  completionCard: {
    gap: 0,
  },
  compRow: {},
  compTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  compCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  compTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  compFill: {
    height: '100%',
    borderRadius: 3,
  },
  twoCellCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  cellVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  cellLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.14 * 11,
  },
  cellDivider: {
    width: 1,
    height: '100%',
  },
  appsCard: {
    gap: 16,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    width: 74,
  },
  appTrack: {
    flex: 1,
    height: 9,
    borderRadius: 99,
  },
  appFill: {
    height: '100%',
    borderRadius: 99,
  },
  appCount: {
    fontSize: 13,
    fontWeight: '800',
    width: 30,
    textAlign: 'right',
  },
});
