import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const ITEMS = [
  ['Automation', 'Combine a ritual, block list, timer, and checklist in one tap.'],
  ['Team attendance / time', 'Shared check-in and check-out for small teams, with corrections.'],
  ['Capture the flag', 'Supervised campus checkpoints using shared NFC tags.'],
  ['Breathing reset', 'Optional five-minute guided reset before a focus session.'],
  ['Private focus circles', 'Small opt-in groups with shared weekly intentions.'],
  ['Public leaderboard / pool', 'Optional consistency leagues using pseudonyms, not raw hours.'],
  ['Weekly experiment', 'One small suggestion, then compare next week with your own history.'],
] as const;

export function ComingSoon() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation();
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back"><Icon name="back" size={20} color={theme.colors.text} /></Pressable>
          <Text style={styles.headerTitle}>Coming soon</Text>
        </View>
        <Text style={styles.title}>Useful next. Not noisy next.</Text>
        <Text style={styles.body}>These stay intentionally small until core rituals prove useful.</Text>
        <Card padding={0} radius={20} style={styles.card}>
          {ITEMS.map(([name, description], index) => (
            <View key={name} style={[styles.row, index < ITEMS.length - 1 && styles.rowBorder]}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          ))}
        </Card>
        <Text style={styles.footnote}>Group, attendance, and public features need accounts and a server. Automation, breathing, and weekly experiments can stay local but remain deferred to keep Bricks fast.</Text>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scroll: { paddingTop: 10, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  title: { color: theme.colors.text, fontFamily: 'BricolageGrotesque', fontSize: 32, lineHeight: 36, letterSpacing: -1.6 },
  body: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 22 }, card: { overflow: 'hidden' },
  row: { padding: 16 }, rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600' }, description: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  footnote: { color: theme.colors.faint, fontFamily: 'IBMPlexMono-Regular', fontSize: 10, lineHeight: 16, marginTop: 18 },
});
