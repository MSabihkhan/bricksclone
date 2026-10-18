import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';
import { ensureNotificationPermission } from '../utils/permissions';
import { describeError } from '../utils/describeError';
import {
  addFiveDailyPrayers,
  formatTime,
  hasAllFiveDailyPrayers,
  MAX_PRAYER_REMINDERS,
  newReminderId,
  parseReminders,
  PrayerReminderConfig,
  SETTINGS_KEY,
  sortReminders,
} from '../features/prayer';
import { faslaAlert } from '../components/FaslaDialog';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, Frame, Glyph, PillButton, RoundButton, Sheet, showToast, Toggle } from '../ui/kit';

interface Draft { id: string | null; label: string; hour: number; minute: number }

const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** Prayer reminders + New reminder sheet (Fasla Redesign v2). */
export function PrayerReminder() {
  const pal = usePalette();
  const navigation = useNavigation();
  const [reminders, setReminders] = useState<PrayerReminderConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [nameFocus, setNameFocus] = useState(false);

  useFocusEffect(useCallback(() => {
    db.settings.getAll().then(values => {
      setReminders(parseReminders(values));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []));

  // Every change is saved and rescheduled immediately — there is no separate Save step to forget.
  const persist = async (next: PrayerReminderConfig[]) => {
    const sorted = sortReminders(next);
    setReminders(sorted);
    try {
      if (sorted.some(r => r.enabled)) await ensureNotificationPermission();
      await db.settings.set(SETTINGS_KEY, JSON.stringify(sorted));
      await BlockingModule.setPrayerReminders(sorted);
    } catch (err) {
      faslaAlert('Could not save reminders', describeError(err));
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const entry: PrayerReminderConfig = { id: draft.id ?? newReminderId(), label: draft.label.trim() || 'Prayer', hour: draft.hour, minute: draft.minute, enabled: true };
    const next = draft.id ? reminders.map(r => (r.id === draft.id ? { ...entry, enabled: r.enabled } : r)) : [...reminders, entry];
    setDraft(null);
    persist(next).then(() => showToast(`Reminder set for ${formatTime(entry.hour, entry.minute)}`)).catch(() => {});
  };

  const deleteDraft = () => {
    if (!draft?.id) return;
    const id = draft.id;
    setDraft(null);
    persist(reminders.filter(r => r.id !== id)).catch(() => {});
  };

  const atLimit = reminders.length >= MAX_PRAYER_REMINDERS;

  const stepper = (label: string, value: number, step: number, n: number, set: (v: number) => void) => (
    <View style={{ alignItems: 'center', gap: 4, padding: 6, borderRadius: 20, backgroundColor: pal.c0F0F11, borderWidth: 1, borderColor: pal.c2A2A2F }}>
      <Pressable onPress={() => set(wrap(value + step, n))} accessibilityRole="button" accessibilityLabel={`${label} up`}
        style={({ pressed }) => ({ width: 76, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.c1C1C20 : 'transparent' })}>
        <Glyph name="chevronUp" size={18} color={pal.c9A9AA0} />
      </Pressable>
      <Text style={{ fontFamily: fonts.monoMedium, fontSize: 36, color: pal.cF5F5F2 }} accessibilityLabel={`${label} ${value}`}>{String(value).padStart(2, '0')}</Text>
      <Pressable onPress={() => set(wrap(value - step, n))} accessibilityRole="button" accessibilityLabel={`${label} down`}
        style={({ pressed }) => ({ width: 76, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.c1C1C20 : 'transparent' })}>
        <Glyph name="chevronDown" size={18} color={pal.c9A9AA0} />
      </Pressable>
    </View>
  );

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} />
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cB4B4BA }}>Prayer reminders</Text>
        </View>
        <Text style={{ marginTop: 22, fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.36, lineHeight: 36, color: pal.cF5F5F2 }} accessibilityRole="header">A quiet cue. Nothing more.</Text>
        <Text style={{ marginTop: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>
          A gentle notification at each time you set. Tap your key if you want the phone to stay quiet. fasla never records whether you prayed.
        </Text>

        {loaded && reminders.length === 0 ? (
          <View style={{ marginTop: 20, borderRadius: 24, backgroundColor: pal.c17171A, padding: 20, gap: 6 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: pal.cF5F5F2 }}>No reminders yet</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c9A9AA0 }}>Add the five daily prayers in one tap, then adjust each time to your local timetable.</Text>
          </View>
        ) : reminders.length ? (
          <View style={{ marginTop: 20, borderRadius: 24, backgroundColor: pal.c17171A, overflow: 'hidden' }}>
            {reminders.map((r, i) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 66, paddingLeft: 20, paddingRight: 16, borderBottomWidth: i === reminders.length - 1 ? 0 : 1, borderBottomColor: pal.c222226 }}>
                <Pressable onPress={() => setDraft({ id: r.id, label: r.label, hour: r.hour, minute: r.minute })} accessibilityRole="button" accessibilityLabel={`Edit ${r.label} at ${formatTime(r.hour, r.minute)}`}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 66 }}>
                  <Text style={{ fontFamily: fonts.monoMedium, fontSize: 24, letterSpacing: -0.48, color: r.enabled ? pal.cF5F5F2 : pal.c6E6E75 }}>{formatTime(r.hour, r.minute)}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: r.enabled ? pal.cD8D8DC : pal.c6E6E75 }} numberOfLines={1}>{r.label}</Text>
                </Pressable>
                <Toggle value={r.enabled} onChange={v => { persist(reminders.map(x => (x.id === r.id ? { ...x, enabled: v } : x))).catch(() => {}); }} label={`${r.label} reminder`} />
              </View>
            ))}
          </View>
        ) : null}

        {!hasAllFiveDailyPrayers(reminders) && !atLimit ? (
          <PillButton label="Add the five daily prayers" kind="muted" height={54} onPress={() => { persist(addFiveDailyPrayers(reminders)).catch(() => {}); }} style={{ marginTop: 10 }} textStyle={{ fontSize: 15 }} />
        ) : null}
        <Pressable disabled={atLimit} onPress={() => setDraft({ id: null, label: '', hour: 12, minute: 0 })} accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 10, height: 58, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: pressed ? RED : pal.c3A3A40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: atLimit ? 0.5 : 1 })}>
          <Glyph name="plus" size={18} color={pal.cF5F5F2} />
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>{atLimit ? `Limit of ${MAX_PRAYER_REMINDERS} reached` : 'Add a reminder'}</Text>
        </Pressable>

        <View style={{ marginTop: 20, flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
          <Glyph name="info" size={16} color={pal.c85858C} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: pal.c85858C }}>
            These are fixed clock times. Real prayer times shift a little every day, so check them against your local timetable every few weeks. Android may also deliver a reminder a few minutes late to save battery.
          </Text>
        </View>
      </ScrollView>

      <Sheet visible={draft !== null} onClose={() => setDraft(null)}>
        <Text style={{ marginTop: 16, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.98, color: pal.cF5F5F2 }}>{draft?.id ? 'Edit reminder' : 'New reminder'}</Text>
        <Eyebrow style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 4 }}>NAME</Eyebrow>
        <TextInput
          value={draft?.label ?? ''}
          onChangeText={label => setDraft(d => (d ? { ...d, label } : d))}
          placeholder="e.g. Asr"
          placeholderTextColor={pal.c6E6E75}
          maxLength={40}
          onFocus={() => setNameFocus(true)}
          onBlur={() => setNameFocus(false)}
          accessibilityLabel="Reminder name"
          style={{ height: 54, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, borderColor: nameFocus ? RED : pal.c2A2A2F, backgroundColor: pal.c0F0F11, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 16 }}
        />
        <Eyebrow style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 4 }}>TIME · 24 HOUR</Eyebrow>
        {draft ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {stepper('Hour', draft.hour, 1, 24, hour => setDraft(d => (d ? { ...d, hour } : d)))}
            {stepper('Minute', draft.minute, 5, 60, minute => setDraft(d => (d ? { ...d, minute } : d)))}
          </View>
        ) : null}
        <PillButton label="Save" onPress={saveDraft} style={{ marginTop: 20 }} />
        {draft?.id ? <PillButton label="Delete reminder" kind="ghost" height={44} onPress={deleteDraft} style={{ marginTop: 6 }} textStyle={{ color: pal.cFF5A5F, fontSize: 15 }} /> : null}
      </Sheet>
    </Frame>
  );
}
