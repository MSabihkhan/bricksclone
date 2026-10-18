import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BlockingModule, InstalledApp } from '../native/BlockingModule';
import { db } from '../db';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { AppLetter, CheckRing, PillButton, RoundButton, Segmented, Sheet } from '../ui/kit';

interface Props {
  visible: boolean;
  brickName: string;
  /** null = this key uses the main list. */
  value: string[] | null;
  onClose: () => void;
  onSave: (apps: string[] | null) => void;
}

/** Choose whether a key blocks the main list or its own set of apps. */
export function BrickAppsSheet({ visible, brickName, value, onClose, onSave }: Props) {
  const pal = usePalette();
  const [mode, setMode] = useState<'main' | 'own'>(value?.length ? 'own' : 'main');
  const [selected, setSelected] = useState<Set<string>>(new Set(value ?? []));
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [mainCount, setMainCount] = useState(0);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode(value?.length ? 'own' : 'main');
    setQuery('');
    db.blockedApps.listBlockedApps().then(main => {
      setMainCount(main.length);
      // Starting a custom list from the main one is the usual edit, not from empty.
      setSelected(new Set(value?.length ? value : main.map(a => a.packageName)));
    }).catch(() => {});
    BlockingModule.getInstalledApps()
      .then(list => setApps([...list].sort((a, b) => a.label.localeCompare(b.label))))
      .catch(() => setApps([]));
  }, [visible, value]);

  const filtered = (apps ?? []).filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  const toggle = (pkg: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(pkg)) next.delete(pkg); else next.add(pkg);
    return next;
  });
  const canSave = mode === 'main' || selected.size > 0;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
        <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.9, color: pal.cF5F5F2 }} numberOfLines={1}>What {brickName} blocks</Text>
        <RoundButton icon="close" label="Close" kind="muted" size={40} onPress={onClose} />
      </View>
      <Segmented
        options={[{ label: `Main list (${mainCount})`, value: 'main' }, { label: 'Its own apps', value: 'own' }]}
        value={mode}
        onChange={v => setMode(v === 'own' ? 'own' : 'main')}
        active="red"
        track={pal.c0F0F11}
        style={{ marginTop: 16 }}
      />
      {mode === 'main' ? (
        <Text style={{ marginTop: 14, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: pal.c9A9AA0 }}>
          Sessions from {brickName} block your main list. Change that list in Settings → Blocked apps.
        </Text>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search apps…"
            placeholderTextColor={pal.c6E6E75}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="Search apps"
            style={{ marginTop: 14, height: 48, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: focused ? RED : pal.c232327, backgroundColor: pal.c0F0F11, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 15 }}
          />
          {apps === null ? (
            <ActivityIndicator color={RED} style={{ paddingVertical: 30 }} />
          ) : (
            <FlatList
              style={{ maxHeight: 320, marginTop: 6 }}
              data={filtered}
              keyExtractor={a => a.packageName}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = selected.has(item.packageName);
                return (
                  <Pressable onPress={() => toggle(item.packageName)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.label}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: 1, borderBottomColor: pal.c222226 }}>
                    <AppLetter name={item.label} size={34} radius={10} />
                    <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }} numberOfLines={1}>{item.label}</Text>
                    <CheckRing on={on} size={24} />
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}
      <PillButton
        label={mode === 'main' ? 'Use main list' : selected.size > 0 ? `Block ${selected.size} ${selected.size === 1 ? 'app' : 'apps'}` : 'Pick at least one app'}
        disabled={!canSave}
        onPress={() => onSave(mode === 'main' ? null : [...selected])}
        style={{ marginTop: 18 }}
      />
    </Sheet>
  );
}
