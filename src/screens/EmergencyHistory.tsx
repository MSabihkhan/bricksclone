import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { Session } from '../db/types';
import { useFocusEffect } from '@react-navigation/native';

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function fmtTime(unix: number) {
  const d = new Date(unix * 1000);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getDayLabel(unix: number) {
  const d = new Date(unix * 1000);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0 && now.getDate() === d.getDate()) return 'Today';
  if (diffDays === 1 || (diffDays === 0 && now.getDate() !== d.getDate())) return 'Yesterday';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

type SessionEnriched = Session & { 
  blockedCount: number; 
  tagName: string;
};

export function EmergencyHistory() {
  const { colors } = useTheme();
  
  const [sessions, setSessions] = useState<SessionEnriched[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [totalBlocked, setTotalBlocked] = useState(0);

  const load = async () => {
    const rawSessions = await db.sessions.listSessions();
    const tags = await db.tags.listTags();
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t.name]));
    
    let tTime = 0;
    const enriched: SessionEnriched[] = [];
    
    for (const s of rawSessions) {
      const attempts = await db.blockedAttempts.attemptsForSession(s.id);
      const blockedCount = attempts.length;
      const tagName = s.tagId ? tagMap[s.tagId] : (s.tagId === 'recovered' ? 'Manual' : 'Unknown Brick');
      
      const dur = s.endTime ? (s.durationSec || 0) : (Math.floor(Date.now() / 1000) - s.startTime);
      tTime += dur;
      
      enriched.push({ ...s, blockedCount, tagName });
    }
    
    const countTot = await db.blockedAttempts.countTotal();
    
    setSessions(enriched);
    setTotalSessions(rawSessions.length);
    setTotalTime(tTime);
    setTotalBlocked(countTot);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const grouped = sessions.reduce((acc, s) => {
    const label = getDayLabel(s.startTime);
    if (!acc[label]) acc[label] = [];
    acc[label].push(s);
    return acc;
  }, {} as Record<string, SessionEnriched[]>);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad}>
        <View style={styles.statsRow}>
          <View style={[styles.statCell, { backgroundColor: colors.card }]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{totalSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.faint }]}>SESSIONS</Text>
          </View>
          <View style={[styles.statCell, { backgroundColor: colors.card }]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{fmtHM(totalTime)}</Text>
            <Text style={[styles.statLabel, { color: colors.faint }]}>TOTAL TIME</Text>
          </View>
          <View style={[styles.statCell, { backgroundColor: colors.card }]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{totalBlocked}</Text>
            <Text style={[styles.statLabel, { color: colors.faint }]}>BLOCKED</Text>
          </View>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyCenter}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.accent + '14' }]}>
              <Icon name="clock" size={44} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([dayLabel, daySessions]) => (
            <View key={dayLabel} style={styles.dayGroup}>
              <Text style={[styles.dayTitle, { color: colors.text }]}>{dayLabel}</Text>
              <View style={styles.dayList}>
                {daySessions.map(s => {
                  const dur = s.endTime ? (s.durationSec || 0) : (Math.floor(Date.now() / 1000) - s.startTime);
                  const icon = dur > 0 ? 'flame' : 'clock';
                  
                  let badgeColor = colors.blue;
                  let badgeText = 'Active';
                  if (s.endTime) {
                    if (s.endedVia === 'nfc' || s.endedVia === 'timer') {
                      badgeColor = colors.green;
                      badgeText = 'Completed';
                    } else if (s.endedVia === 'override') {
                      badgeColor = colors.accent;
                      badgeText = 'Overridden';
                    } else {
                      badgeColor = colors.muted;
                      badgeText = 'Interrupted';
                    }
                  }

                  return (
                    <View key={s.id} style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.sIconBox, { backgroundColor: colors.card2 }]}>
                        <Icon name={icon} size={22} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sTitle, { color: colors.text }]}>{fmtHM(dur) || '0m'}</Text>
                        <Text style={[styles.sSub, { color: colors.muted }]}>{s.tagName} · {fmtTime(s.startTime)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
                          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                        </View>
                        {s.blockedCount > 0 && (
                          <View style={[styles.blockedPill, { backgroundColor: colors.card2 }]}>
                            <Text style={[styles.blockedText, { color: colors.text }]}>{s.blockedCount} blocked</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.03 * 28 },
  scrollPad: { paddingHorizontal: 22, paddingBottom: 40 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statCell: { flex: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.14 * 11 },

  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },

  dayGroup: { marginBottom: 24 },
  dayTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  dayList: { gap: 10 },
  
  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  sIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sTitle: { fontSize: 16, fontWeight: '800' },
  sSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  
  blockedPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  blockedText: { fontSize: 10, fontWeight: '700' },
});
