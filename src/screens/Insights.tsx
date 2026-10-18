import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../db';
import type { Period } from '../services/stats/statsService';
import { buildInsights, comparisonWindow, formatDuration, InsightsView, periodWindow } from '../features/insightsModel';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Segmented, TAB_CLEARANCE, Title } from '../ui/kit';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
const BAR_MAX = 92;
const LEDGER_SLOTS = 17;

/** Insights (Fasla Redesign v2). */
export function Insights() {
  const pal = usePalette();
  const [period, setPeriod] = useState<Period>('week');
  const [view, setView] = useState<InsightsView | null>(null);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    const now = Math.floor(Date.now() / 1000);
    const w = periodWindow(period, 0, now);
    const cmp = comparisonWindow(period, 0, now);
    Promise.all([db.sessions.sessionsOverlapping(w.start, w.end), db.sessions.sessionsOverlapping(cmp.start, cmp.end)])
      .then(([current, previous]) => { if (mounted) setView(buildInsights(period, 0, now, current, previous)); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [period]));

  const max = Math.max(1, ...(view?.bars.map(b => b.value) ?? [0]));
  const { finished, recorded } = view?.outcomes ?? { finished: 0, recorded: 0 };
  const slots = Math.min(recorded, LEDGER_SLOTS);
  const filled = recorded ? Math.round((finished / recorded) * slots) : 0;
  const ritualColors = [RED, pal.cFF8A8D, pal.c7A3236];
  const card = { borderRadius: 24, backgroundColor: pal.c17171A };
  const positive = !!view?.deltaText.startsWith('+');

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: TAB_CLEARANCE }}>
        <Title spacing={-0.03}>Insights</Title>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} active="red" />

        <View style={[card, { padding: 20 }]}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }}>{view?.window.label ?? ''}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: -1.32, lineHeight: 46, color: pal.cF5F5F2 }}>{formatDuration(view?.focusSec ?? 0)}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: positive ? pal.c3DDC84 : pal.c9A9AA0 }}>{view?.deltaText ?? ''}</Text>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c6E6E75, marginTop: 4 }}>across {view?.sessions ?? 0} {view?.sessions === 1 ? 'session' : 'sessions'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 20 }} accessibilityLabel="Focus over time">
            {(view?.bars ?? []).map((b, i) => {
              const h = b.value > 0 ? Math.max(8, Math.round((b.value / max) * BAR_MAX)) : 4;
              return (
                <View key={`${b.label}${i}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' }}>
                  <View style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: b.highlight ? RED : b.value ? pal.c3A2224 : pal.c232327 }} />
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: b.highlight ? pal.cF5F5F2 : pal.c6E6E75 }} numberOfLines={1}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[card, { paddingVertical: 18, paddingHorizontal: 20, gap: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Outcome ledger</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 20, color: pal.cF5F5F2 }}>{finished}/{recorded}</Text>
          </View>
          {slots > 0 ? (
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden>
              {Array.from({ length: slots }, (_, i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < filled ? RED : pal.c2A2A2F }} />)}
            </View>
          ) : null}
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }}>
            {recorded ? 'Intentions you finished before tapping out.' : 'Finish a study or work session to start your ledger.'}
          </Text>
        </View>

        <View style={[card, { paddingVertical: 6, paddingHorizontal: 20 }]}>
          {view && view.rituals.length ? view.rituals.map((r, i) => (
            <View key={r.id} style={{ gap: 8, paddingVertical: 14, borderBottomWidth: i === view.rituals.length - 1 ? 0 : 1, borderBottomColor: pal.c232327 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>{r.label}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: pal.cB4B4BA }}>{formatDuration(r.focusSec)}</Text>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: pal.c232327, overflow: 'hidden' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${Math.round(r.share * 100)}%`, backgroundColor: ritualColors[Math.min(i, 2)] }} />
              </View>
            </View>
          )) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0, paddingVertical: 16 }}>Time per ritual appears after your first session.</Text>
          )}
        </View>
      </ScrollView>
    </Frame>
  );
}
