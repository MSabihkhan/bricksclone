import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import {
  BarDatum,
  getAvgSessionSec,
  getCompletionByMode,
  getFocusBars,
  getPeriodComparison,
  getPeriodStats,
  periodRange,
  Period,
  PeriodStats,
} from '../services/stats/statsService';

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

function dateRange(period: Period) {
  const { start, end } = periodRange(period);
  const a = new Date(start * 1000);
  const b = new Date(end * 1000);
  const month = b.toLocaleDateString(undefined, { month: 'long' });
  if (period === 'day') return b.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  if (period === 'month') return month;
  return `${a.getDate()} – ${b.getDate()} ${month}`;
}

export function Insights() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [bars, setBars] = useState<BarDatum[]>([]);
  const [comparison, setComparison] = useState(0);
  const [modes, setModes] = useState<Array<{ mode: string; label: string; completed: number; total: number; pct: number }>>([]);
  const [average, setAverage] = useState(0);
  const [endedEarly, setEndedEarly] = useState(0);
  const [outcomes, setOutcomes] = useState({ done: 0, recorded: 0, planned: 0, nextStep: '' });

  useFocusEffect(useCallback(() => {
    let mounted = true;
    const range = periodRange(period);
    Promise.all([
      getPeriodStats(period),
      getFocusBars(period),
      getPeriodComparison(period),
      getCompletionByMode(period),
      getAvgSessionSec(period),
      db.sessions.sessionsBetween(range.start, range.end),
    ]).then(([nextStats, nextBars, nextComparison, nextModes, nextAverage, sessions]) => {
      if (!mounted) return;
      setStats(nextStats);
      setBars(nextBars);
      setComparison(nextComparison.deltaPct);
      setModes(nextModes);
      setAverage(nextAverage);
      setEndedEarly(sessions.filter(session => session.endedVia === 'override').length);
      const planned = sessions.filter(session => !!session.intention?.trim());
      const recorded = planned.filter(session => !!session.outcome);
      setOutcomes({
        done: recorded.filter(session => session.outcome === 'done').length,
        recorded: recorded.length,
        planned: planned.length,
        nextStep: sessions.find(session => session.nextStep?.trim())?.nextStep ?? '',
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [period]));

  const maximum = Math.max(1, ...bars.map(bar => bar.value));
  const currentIndex = bars.length - 1;
  const longest = bars.reduce<BarDatum | null>((best, bar) => !best || bar.value > best.value ? bar : best, null);

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Insights</Text>
        <SegmentedControl options={[{ label: 'Day', value: 'day' }, { label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }]} value={period} onChange={value => setPeriod(value as Period)} />

        <View style={styles.overview}>
          <Text style={styles.range}>{dateRange(period)}</Text>
          <Text style={styles.total}>{formatDuration(stats?.focusSec ?? 0)}</Text>
          <Text style={styles.comparison}>across {stats?.sessions ?? 0} sessions · {comparison === 0 ? 'same as last period' : `${Math.abs(comparison)}% ${comparison > 0 ? 'more' : 'less'} than last ${period}`}</Text>
        </View>

        <View style={styles.chart}>
          {bars.map((bar, index) => (
            <View key={`${bar.label}-${index}`} style={styles.chartColumn}>
              <View style={[styles.chartBar, { height: 24 + Math.round((bar.value / maximum) * 72) }, index === currentIndex && styles.chartBarCurrent]} />
              <Text style={styles.chartLabel}>{bar.label.slice(0, 1)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chartNote}>{longest && longest.value > 0 ? `${longest.label} was the longest at ${formatDuration(longest.value)}.` : 'No completed focus sessions in this period yet.'}</Text>

        <View style={styles.ledger}>
          <View style={styles.ledgerTop}>
            <Text style={styles.ledgerTitle}>Outcome ledger</Text>
            <Text style={styles.ledgerValue}>{outcomes.done}/{outcomes.planned}</Text>
          </View>
          <Text style={styles.ledgerBody}>{outcomes.planned === 0 ? 'Set a concrete intention before focus to start your ledger.' : `${outcomes.done} planned ${outcomes.done === 1 ? 'task' : 'tasks'} done · ${outcomes.recorded} outcomes recorded`}</Text>
          {outcomes.nextStep ? <Text style={styles.nextStep}>NEXT · {outcomes.nextStep}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>By mode</Text>
        <View>
          {modes.length === 0 ? (
            <Text style={styles.empty}>Mode totals appear after your first completed session.</Text>
          ) : modes.slice(0, 4).map(item => (
            <View key={item.mode} style={styles.modeRow}>
              <View style={styles.modeTop}>
                <Text style={styles.modeName}>{item.label}</Text>
                <Text style={styles.modeValue}>{item.completed}/{item.total} complete</Text>
              </View>
              <View style={styles.modeTrack}><View style={[styles.modeFill, { width: `${Math.max(4, item.pct)}%` }]} /></View>
            </View>
          ))}
        </View>

        <View style={styles.footerMetrics}>
          <View><Text style={styles.metric}>{formatDuration(average)}</Text><Text style={styles.metricLabel}>Average</Text></View>
          <View><Text style={styles.metric}>{endedEarly}</Text><Text style={styles.metricLabel}>Ended early</Text></View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scroll: { paddingHorizontal: 22, paddingBottom: 36 },
  title: { ...theme.typography.screenTitle, color: theme.colors.text, marginBottom: 24 },
  overview: { marginTop: 28 },
  range: { color: theme.colors.text, fontSize: 14 },
  total: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 18, marginTop: 2 },
  comparison: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  chart: { height: 142, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 22 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 9 },
  chartBar: { width: '100%', minHeight: 24, borderRadius: 5, backgroundColor: theme.colors.card2 },
  chartBarCurrent: { backgroundColor: theme.colors.accent },
  chartLabel: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 11 },
  chartNote: { color: theme.colors.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  ledger: { backgroundColor: theme.colors.card, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: 17, marginTop: 24 },
  ledgerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ledgerTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  ledgerValue: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Medium', fontSize: 18 },
  ledgerBody: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  nextStep: { color: theme.colors.accent, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, lineHeight: 15, marginTop: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, marginTop: 28, marginBottom: 10 },
  empty: { color: theme.colors.muted, fontSize: 13, paddingVertical: 20 },
  modeRow: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 12 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modeName: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  modeValue: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 12 },
  modeTrack: { height: 3, backgroundColor: theme.colors.track, overflow: 'hidden' },
  modeFill: { height: 3, backgroundColor: theme.colors.text },
  footerMetrics: { flexDirection: 'row', gap: 36, marginTop: 20 },
  metric: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 15 },
  metricLabel: { color: theme.colors.text, fontSize: 12, marginTop: 2 },
});
