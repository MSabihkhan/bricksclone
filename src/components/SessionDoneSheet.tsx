import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { BrickCard } from './BrickCard';
import { Button } from './Button';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export interface SessionSummary { focusSec: number; attempts: number }

interface Props {
  summary: SessionSummary | null;
  personaOn: boolean;
  onClose: () => void;
}

export function protectedLine(focusSec: number): string {
  const minutes = Math.round(focusSec / 60);
  if (minutes < 1) return 'Under a minute, protected.';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, protected.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m ? `${m}m ` : ''}protected.`;
}

function shortDuration(focusSec: number): string {
  const minutes = Math.round(focusSec / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** After a session ends: the card celebrates (session_completed) and shows what it was worth. */
export function SessionDoneSheet({ summary, personaOn, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Modal visible={!!summary} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.hero}>
            <BrickCard width={170} face={personaOn ? 'session_completed' : null} say={personaOn} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{summary ? protectedLine(summary.focusSec) : ''}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{summary ? shortDuration(summary.focusSec) : ''}</Text>
              <Text style={styles.metricLabel}>focused</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{summary?.attempts ?? 0}</Text>
              <Text style={styles.metricLabel}>{summary?.attempts === 1 ? 'pull resisted' : 'pulls resisted'}</Text>
            </View>
          </View>
          <Button label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, gap: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.faint },
  hero: { marginTop: 58, marginBottom: 6 },   // room for the bubble above the card
  title: { color: theme.colors.text, fontFamily: 'BricolageGrotesque', fontSize: 26, lineHeight: 30, letterSpacing: -1.2, textAlign: 'center' },
  metrics: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  metric: { flex: 1, backgroundColor: theme.colors.card2, borderRadius: 17, padding: 12 },
  metricValue: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Medium', fontSize: 20, letterSpacing: -0.4 },
  metricLabel: { color: theme.colors.muted, fontFamily: 'IBMPlexMono-Regular', fontSize: 11, marginTop: 2 },
});
