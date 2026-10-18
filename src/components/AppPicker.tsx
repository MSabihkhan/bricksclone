import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, TextInput, View } from 'react-native';
import { BlockingModule, InstalledApp } from '../native/BlockingModule';
import { db } from '../db';
import { BlockedApp } from '../db/types';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { AppLetter, CheckRing, Eyebrow, Frame, Glyph, PillButton, RoundButton, Title } from '../ui/kit';

/** The design's USUAL SUSPECTS, matched against what is actually installed. */
export const USUAL_SUSPECTS = [
  'com.instagram.android',
  'com.zhiliaoapp.musically', 'com.ss.android.ugc.trill',
  'com.google.android.youtube',
  'com.facebook.katana',
  'com.snapchat.android',
  'com.twitter.android',
  'com.reddit.frontpage',
  'com.netflix.mediaclient',
];

/** Splits installed apps into the suspects (in the design's order) and everything else. */
export function splitApps(apps: InstalledApp[], query: string): { suspects: InstalledApp[]; others: InstalledApp[] } {
  const q = query.trim().toLowerCase();
  const match = (a: InstalledApp) => !q || a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q);
  const visible = apps.filter(match);
  const suspects = USUAL_SUSPECTS.map(p => visible.find(a => a.packageName === p)).filter((a): a is InstalledApp => !!a);
  const others = visible.filter(a => !USUAL_SUSPECTS.includes(a.packageName)).sort((a, b) => a.label.localeCompare(b.label));
  return { suspects, others };
}

interface Props {
  eyebrow: string;
  onBack: () => void;
  /** Called once the main list is saved. */
  onDone: () => void;
  /** Onboarding offers "Choose later". */
  onLater?: () => void;
}

/** Choose apps / Blocked apps (Fasla Redesign v2). Saves the main blocked-apps list. */
export function AppPicker({ eyebrow, onBack, onDone, onLater }: Props) {
  const pal = usePalette();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([BlockingModule.getInstalledApps().catch(() => [] as InstalledApp[]), db.blockedApps.listBlockedApps()])
      .then(([installed, existing]) => {
        if (!live) return;
        // Keep already-blocked apps listed even if the launcher query misses them.
        const known = new Set(installed.map(a => a.packageName));
        setApps([...installed, ...existing.filter(b => !known.has(b.packageName)).map(b => ({ packageName: b.packageName, label: b.label }))]);
        setSelected(new Set(existing.map(b => b.packageName)));
      })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const { suspects, others } = useMemo(() => splitApps(apps, query), [apps, query]);
  const sections = [
    ...(suspects.length ? [{ key: 'sus', title: 'USUAL SUSPECTS', data: suspects }] : []),
    ...(others.length ? [{ key: 'all', title: 'ALL APPS', data: others }] : []),
  ];

  const toggle = (pkg: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(pkg)) next.delete(pkg); else next.add(pkg);
    return next;
  });

  const n = selected.size;
  const save = async () => {
    if (!n || saving) return;
    setSaving(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const list: BlockedApp[] = apps.filter(a => selected.has(a.packageName)).map(a => ({ packageName: a.packageName, label: a.label, addedAt: now }));
      await db.blockedApps.replaceAll(list);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Frame>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundButton icon="back" label="Back" onPress={onBack} />
        <Eyebrow size={12}>{eyebrow}</Eyebrow>
      </View>
      <Title style={{ marginTop: 18 }}>What should fasla block?</Title>
      <View style={{ marginTop: 18, justifyContent: 'center' }}>
        <Glyph name="search" size={18} color={pal.c85858C} style={{ position: 'absolute', left: 16 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps…"
          placeholderTextColor={pal.c6E6E75}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Search apps"
          style={{ height: 50, paddingLeft: 44, paddingRight: 16, borderRadius: 999, borderWidth: 1, borderColor: focused ? RED : pal.c232327, backgroundColor: pal.c141417, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 15 }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={RED} /></View>
      ) : (
        <SectionList
          style={{ flex: 1, marginTop: 12 }}
          sections={sections}
          keyExtractor={item => item.packageName}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Eyebrow color={section.key === 'sus' ? pal.cFF5A5F : pal.c85858C} style={{ paddingTop: section.key === 'sus' ? 10 : 18, paddingBottom: 6, paddingHorizontal: 4 }}>{section.title}</Eyebrow>
          )}
          renderItem={({ item }) => {
            const on = selected.has(item.packageName);
            return (
              <Pressable onPress={() => toggle(item.packageName)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.label}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: pal.c1C1C20, opacity: pressed ? 0.7 : 1 })}>
                <AppLetter name={item.label} />
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }} numberOfLines={1}>{item.label}</Text>
                <CheckRing on={on} size={24} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.c9A9AA0, textAlign: 'center', marginTop: 40 }}>
              {query ? 'No apps match that search.' : 'Could not load your apps.'}
            </Text>
          }
        />
      )}

      <View style={{ paddingTop: 14, paddingBottom: onLater ? 8 : 18, alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: pal.c1C1C20 }}>
        <PillButton label={n ? `Block ${n} ${n === 1 ? 'app' : 'apps'}` : 'Pick at least one app'} disabled={!n || saving} onPress={() => { save().catch(() => {}); }} style={{ alignSelf: 'stretch' }} />
        {onLater ? <PillButton label="Choose later" kind="ghost" height={40} onPress={onLater} textStyle={{ fontSize: 14 }} /> : null}
      </View>
    </Frame>
  );
}
