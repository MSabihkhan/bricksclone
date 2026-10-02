import React, { useCallback, useMemo, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Switch } from '../components/Switch';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';

export function PrayerReminder() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('30');
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => {
    db.settings.getAll().then(values => {
      setEnabled(values.prayer_reminder_enabled === '1');
      setHour(values.prayer_reminder_hour ?? '12');
      setMinute(values.prayer_reminder_minute ?? '30');
    }).catch(() => {});
  }, []));

  const validHour = Math.max(0, Math.min(23, Number(hour) || 0));
  const validMinute = Math.max(0, Math.min(59, Number(minute) || 0));

  const save = async () => {
    if (enabled && Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await Promise.all([
      db.settings.set('prayer_reminder_enabled', enabled ? '1' : '0'),
      db.settings.set('prayer_reminder_hour', String(validHour)),
      db.settings.set('prayer_reminder_minute', String(validMinute)),
    ]);
    if (enabled) await BlockingModule.schedulePrayerReminder(validHour, validMinute);
    else await BlockingModule.cancelPrayerReminder();
    setHour(String(validHour).padStart(2, '0'));
    setMinute(String(validMinute).padStart(2, '0'));
    setSaved(true);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back"><Icon name="back" size={20} color={theme.colors.text} /></Pressable>
          <Text style={styles.headerTitle}>Prayer reminder</Text>
        </View>
        <Text style={styles.title}>A quiet cue. Nothing more.</Text>
        <Text style={styles.body}>Bricks can remind you once each day. Tapping your Brick starts quiet focus; it never records prayer as completed.</Text>

        <Card padding={0} radius={20} style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}><Text style={styles.rowTitle}>Daily reminder</Text><Text style={styles.rowSub}>Runs locally on this phone</Text></View>
            <Switch value={enabled} onValueChange={value => { setEnabled(value); setSaved(false); }} accessibilityLabel="Daily prayer reminder" />
          </View>
          <View style={styles.timeArea}>
            <Text style={styles.label}>LOCAL TIME · 24 HOUR</Text>
            <View style={styles.timeRow}>
              <TextInput value={hour} onChangeText={value => { setHour(value.replace(/\D/g, '').slice(0, 2)); setSaved(false); }} keyboardType="number-pad" style={styles.timeInput} maxLength={2} accessibilityLabel="Reminder hour" />
              <Text style={styles.colon}>:</Text>
              <TextInput value={minute} onChangeText={value => { setMinute(value.replace(/\D/g, '').slice(0, 2)); setSaved(false); }} keyboardType="number-pad" style={styles.timeInput} maxLength={2} accessibilityLabel="Reminder minute" />
            </View>
          </View>
        </Card>

        <View style={styles.note}><Icon name="info" size={16} color={theme.colors.muted} /><Text style={styles.noteText}>This MVP uses one manual daily time. Prayer-time calculation methods and travel adjustments stay out until device reminder reliability is proven.</Text></View>
        <Button label={saved ? 'Saved' : 'Save reminder'} onPress={save} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scroll: { paddingTop: 10, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  title: { color: theme.colors.text, fontFamily: 'BricolageGrotesque', fontSize: 32, lineHeight: 36, letterSpacing: -1.6 },
  body: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 24 },
  card: { overflow: 'hidden' },
  toggleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  toggleCopy: { flex: 1 }, rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' }, rowSub: { color: theme.colors.muted, fontSize: 12, marginTop: 3 },
  timeArea: { padding: 18 }, label: { color: theme.colors.faint, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  timeInput: { width: 76, height: 64, borderRadius: 13, backgroundColor: theme.colors.card2, color: theme.colors.text, fontFamily: 'IBMPlexMono-Medium', fontSize: 28, textAlign: 'center' },
  colon: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Medium', fontSize: 28, marginHorizontal: 10 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 20 }, noteText: { flex: 1, color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
});
