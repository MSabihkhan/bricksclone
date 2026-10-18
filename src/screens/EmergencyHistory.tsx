import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db } from '../db';
import { historyRows, HistoryRow } from '../features/historyModel';
import { formatDuration } from '../features/insightsModel';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, Frame, Glyph, RoundButton, SectionLabel, Title } from '../ui/kit';

/** History (Fasla Redesign v2). */
export function EmergencyHistory() {
  const pal = usePalette();
  const navigation = useNavigation();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [totalSec, setTotalSec] = useState(0);
  const [blocked, setBlocked] = useState(0);

  useFocusEffect(useCallback(() => {
    let live = true;
    Promise.all([db.sessions.listSessions(), db.tags.listTags(), db.blockedAttempts.countTotal()]).then(([sessions, tags, attempts]) => {
      if (!live) return;
      const now = Math.floor(Date.now() / 1000);
      const list = historyRows(sessions, Object.fromEntries(tags.map(t => [t.id, t.name])), now);
      setRows(list);
      setTotalSec(sessions.filter(s => s.endTime !== null && s.endedVia !== 'start_failed').reduce((sum, s) => sum + (s.durationSec ?? 0), 0));
      setBlocked(attempts);
    }).catch(() => {});
    return () => { live = false; };
  }, []));

  const stats = [
    { v: String(rows.length), l: 'SESSIONS' },
    { v: formatDuration(totalSec), l: 'TOTAL TIME' },
    { v: String(blocked), l: 'BLOCKED' },
  ];

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} />
          <Title>History</Title>
        </View>

        <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
          {stats.map(s => (
            <View key={s.l} style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 22, backgroundColor: pal.c17171A, gap: 6 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.78, color: pal.cF5F5F2 }} numberOfLines={1} adjustsFontSizeToFit>{s.v}</Text>
              <Eyebrow size={10}>{s.l}</Eyebrow>
            </View>
          ))}
        </View>

        {rows.length ? (
          <>
            <SectionLabel>RECENT</SectionLabel>
            <View style={{ borderRadius: 24, backgroundColor: pal.c17171A, overflow: 'hidden' }}>
              {rows.map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: pal.c222226 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: r.done ? RED : pal.c3A3A40 }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }} numberOfLines={1}>{r.title}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }} numberOfLines={1}>{r.meta}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: pal.cD8D8DC }}>{r.dur}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={{ marginTop: 80, alignItems: 'center', gap: 16 }}>
            <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: pal.c1C0E10, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name="clock" size={40} color={RED} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: pal.cF5F5F2 }}>No sessions yet</Text>
          </View>
        )}
      </ScrollView>
    </Frame>
  );
}
