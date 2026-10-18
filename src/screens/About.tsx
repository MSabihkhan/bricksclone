import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PRIVACY_POLICY_URL } from '../config/links';
import { APP_VERSION } from '../config/version';
import { faslaAlert } from '../components/FaslaDialog';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, GroupCard, Row, RoundButton } from '../ui/kit';

/** About (Fasla Redesign v2). */
export function About() {
  const pal = usePalette();
  const navigation = useNavigation();

  const handlePrivacy = () => {
    // Full policy on the web; if no browser can open it, the short version still shows in the app.
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
      faslaAlert('Privacy policy', `Your sessions, keys, settings and blocked-app data stay on this phone. fasla has no account and does not send them anywhere.

Full policy: ${PRIVACY_POLICY_URL}`, undefined, { icon: 'shield' });
    });
  };

  const handleLicenses = () => {
    faslaAlert('Open-source licenses', 'fasla uses React Native, React Navigation, Zustand, SQLite, React Native NFC Manager, and React Native SVG. Fonts: Archivo, Geist and JetBrains Mono (SIL Open Font License). Dependency license texts are distributed with their packages.', undefined, { icon: 'doc' });
  };

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
        <View style={{ alignSelf: 'stretch', height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 0 }} />
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 17, color: pal.cF5F5F2 }} accessibilityRole="header">About</Text>
        </View>

        <View style={{ marginTop: 48, width: 112, height: 112, borderRadius: 34, backgroundColor: pal.c17171A, alignItems: 'center', justifyContent: 'center', shadowColor: RED, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 18 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 68, lineHeight: 78, color: RED }}>f</Text>
        </View>
        <Text style={{ marginTop: 22, fontFamily: fonts.display, fontSize: 36, letterSpacing: -1.8, color: pal.cF5F5F2 }}>fasla<Text style={{ color: RED }}>.</Text></Text>
        <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 15, color: pal.c9A9AA0 }}>NFC focus companion</Text>
        <View style={{ marginTop: 14, height: 30, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c2A2A2F, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: pal.cB4B4BA }}>v{APP_VERSION}</Text>
        </View>

        <GroupCard style={{ alignSelf: 'stretch', marginTop: 36 }}>
          <Row label="Privacy policy" sub="How fasla handles your data" minHeight={66} onPress={handlePrivacy} />
          <Row label="Licenses" minHeight={58} onPress={handleLicenses} last />
        </GroupCard>
        <Text style={{ marginTop: 24, fontFamily: fonts.body, fontSize: 13, color: pal.c6E6E75 }}>Made with focus · © 2026</Text>
      </ScrollView>
    </Frame>
  );
}
