import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../db';
import { Tag } from '../db/types';
import { SettingsStackParamList } from '../navigation/types';
import { orderByRecentUse } from '../features/brickStack';
import { usePairScan } from '../hooks/usePairScan';
import { ScanSheet } from '../components/ScanSheet';
import { keyMeta, MiniKey } from '../components/KeyForm';
import { faslaAlert } from '../components/FaslaDialog';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Glyph, RoundButton, Title } from '../ui/kit';

type NavProp = NativeStackNavigationProp<SettingsStackParamList>;

/** My keys (Fasla Redesign v2). + pairs a new key, a row opens Edit key. */
export function ManageTags() {
  const pal = usePalette();
  const navigation = useNavigation<NavProp>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pairOpen, setPairOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    Promise.all([db.tags.listTags(), db.sessions.listSessions()]).then(([list, sessions]) => {
      if (!live) return;
      setTags(list);
      setActiveId(orderByRecentUse(list, sessions)[0] ?? null);
    }).catch(() => {});
    return () => { live = false; };
  }, []));

  const found = usePairScan(pairOpen, tagId => {
    setPairOpen(false);
    navigation.getParent()?.navigate('HomeTab', { screen: 'AddBrick', params: { tagId } });
  });

  const pairTrouble = () => faslaAlert(
    'Can’t find the key?',
    'Check that NFC is on, then hold the top of your phone flat on the card for a second. Cases thicker than a few millimetres can get in the way.',
  );

  return (
    <Frame>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} />
        <Pressable onPress={() => setPairOpen(true)} accessibilityRole="button" accessibilityLabel="Add key"
          style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? '#F0353C' : RED, alignItems: 'center', justifyContent: 'center' })}>
          <Glyph name="plus" size={22} color="#FFFFFF" width={2.4} />
        </Pressable>
      </View>
      <Title style={{ marginTop: 20 }}>My keys</Title>
      <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 15, color: pal.c9A9AA0 }}>The physical keys to your focus.</Text>

      {tags.length ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 22, paddingBottom: 40 }}>
          {tags.map(tag => (
            <Pressable key={tag.id} onPress={() => navigation.navigate('EditKey', { tagId: tag.id })} accessibilityRole="button" accessibilityLabel={`Edit ${tag.name}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: 24, borderWidth: 1, borderColor: pal.c232327, backgroundColor: pressed ? pal.c1C1C20 : pal.c17171A })}>
              <MiniKey />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: pal.cF5F5F2 }} numberOfLines={1}>{tag.name}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }} numberOfLines={1}>{keyMeta(tag, tag.id === activeId)}</Text>
              </View>
              <Glyph name="chevron" size={16} color={pal.c6E6E75} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 60 }}>
          <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: pal.c17171A, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 56, color: RED, lineHeight: 64 }}>f</Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.72, color: pal.cF5F5F2 }}>No keys yet</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0, maxWidth: 260, textAlign: 'center' }}>Tap + and hold your phone to your key to pair it.</Text>
        </View>
      )}

      <ScanSheet visible={pairOpen} scanFor="pair" done={found} onClose={() => setPairOpen(false)} onTrouble={pairTrouble} />
    </Frame>
  );
}
