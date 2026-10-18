import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../db';
import { Tag } from '../db/types';
import { SettingsStackParamList } from '../navigation/types';
import { validateBrickName } from '../utils/onboarding';
import { KeyNameInput, PlaceGrid } from '../components/KeyForm';
import { BrickAppsSheet } from '../components/BrickAppsSheet';
import { faslaAlert } from '../components/FaslaDialog';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Glyph, IconTile, PillButton, RoundButton, SectionLabel, showToast, Title } from '../ui/kit';

/** Edit key (Fasla Redesign v2): rename, place, which apps it blocks, delete. */
export function EditKey() {
  const pal = usePalette();
  const navigation = useNavigation();
  const { tagId } = useRoute<RouteProp<SettingsStackParamList, 'EditKey'>>().params;
  const [tag, setTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('desk');
  const [apps, setApps] = useState<string[] | null>(null);
  const [mainCount, setMainCount] = useState(0);
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    Promise.all([db.tags.getTagById(tagId), db.blockedApps.listBlockedApps()]).then(([t, main]) => {
      setMainCount(main.length);
      if (!t) { navigation.goBack(); return; }
      setTag(t);
      setName(t.name);
      setLocation(t.location ?? 'desk');
      setApps(t.apps ?? null);
    }).catch(() => {});
  }, [navigation, tagId]);

  const canSave = validateBrickName(name);
  const save = async () => {
    if (!canSave) return;
    await db.tags.updateTag(tagId, { name: name.trim(), location, apps });
    showToast('Key saved');
    navigation.goBack();
  };

  const askDelete = () => faslaAlert(
    `Delete “${tag?.name ?? name}”?`,
    'You’ll need to pair it again to use it. Your history stays.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.tags.deleteTag(tagId);
        showToast('Key deleted');
        navigation.goBack();
      } },
    ],
    { icon: 'trash' },
  );

  const appsValue = apps?.length ? `Its own ${apps.length} ${apps.length === 1 ? 'app' : 'apps'}` : `Your main list · ${mainCount} apps`;

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} />
        <Title style={{ marginTop: 20 }}>Edit key</Title>
        <KeyNameInput value={name} onChange={setName} placeholder="e.g. Desk" />
        <SectionLabel style={{ marginTop: 18 }}>QUICK PICK</SectionLabel>
        <PlaceGrid location={location} name={name} tileHeight={68} onPick={(loc, n) => { setLocation(loc); setName(n); }} />

        <Pressable onPress={() => setAppsOpen(true)} accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingHorizontal: 16, borderRadius: 20, backgroundColor: pressed ? pal.c1C1C20 : pal.c17171A })}>
          <IconTile icon="phone" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Blocks</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }}>{appsValue}</Text>
          </View>
          <Glyph name="chevron" size={14} color={pal.c6E6E75} />
        </Pressable>

        <View style={{ flex: 1, minHeight: 24 }} />
        <PillButton label="Delete key" kind="danger" height={52} onPress={askDelete} textStyle={{ fontSize: 15 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 18 }}>
          <PillButton label="Cancel" kind="outline" height={56} onPress={() => navigation.goBack()} style={{ flex: 1 }} />
          <PillButton label="Save" height={56} disabled={!canSave} onPress={() => { save().catch(() => {}); }} style={{ flex: 1 }} />
        </View>
      </ScrollView>
      <BrickAppsSheet
        visible={appsOpen}
        brickName={name.trim() || 'this key'}
        value={apps}
        onClose={() => setAppsOpen(false)}
        onSave={next => { setApps(next); setAppsOpen(false); }}
      />
    </Frame>
  );
}
