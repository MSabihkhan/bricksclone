import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { PillButton, RoundButton, Sheet, Glyph } from '../ui/kit';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  title: string;
  lead?: string;
  points: Array<{ t: string; d: string }>;
  note?: React.ReactNode;
  cta: string;
  onCta: () => void;
  onClose: () => void;
  declineLabel?: string;
}

/** The redesign's explainer sheet ("Silence blocked apps"): title, what-it-does rows, agree, not now. */
export function InfoSheet({ visible, title, lead, points, note, cta, onCta, onClose, declineLabel = 'Not now' }: Props) {
  const pal = usePalette();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.98, color: pal.cF5F5F2, lineHeight: 32 }} accessibilityRole="header">{title}</Text>
        <RoundButton icon="close" label="Close" onPress={onClose} size={40} kind="muted" />
      </View>
      <ScrollView style={{ maxHeight: 430, marginTop: 8 }} showsVerticalScrollIndicator={false}>
        {lead ? <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: pal.c9A9AA0, paddingTop: 6 }}>{lead}</Text> : null}
        {points.map(p => (
          <View key={p.t} style={{ gap: 4, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: pal.c232327 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>{p.t}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: pal.c9A9AA0 }}>{p.d}</Text>
          </View>
        ))}
        {note ? (
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 14, paddingBottom: 4 }}>
            <Glyph name="info" size={16} color={pal.c9A9AA0} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>{note}</View>
          </View>
        ) : null}
      </ScrollView>
      <PillButton label={cta} onPress={onCta} style={{ marginTop: 14 }} />
      <PillButton label={declineLabel} onPress={onClose} kind="ghost" height={44} style={{ marginTop: 4 }} textStyle={{ fontSize: 15 }} />
    </Sheet>
  );
}
