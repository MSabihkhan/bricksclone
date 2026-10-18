import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { normalizeTagId } from '../services/nfc';
import { db } from '../db';
import { BRICK_MODES, DURATIONS, durationLabel, LOCATIONS, modeLabel, validateBrickName } from '../utils/onboarding';
import { describeError } from '../utils/describeError';
import { appsForBrick } from '../features/brickApps';
import { useFocusUi } from '../state/useFocusUi';
import { usePairScan } from '../hooks/usePairScan';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ScanSheet } from '../components/ScanSheet';
import { BrickCard } from '../components/BrickCard';
import { KeyNameInput, PlaceGrid, placeIcon, StepBar } from '../components/KeyForm';
import { faslaAlert } from '../components/FaslaDialog';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, Frame, Glyph, IconTile, PillButton, RadialBg, RoundButton, SectionLabel, Title, Toggle } from '../ui/kit';

type Step = 'name' | 'focus' | 'ready';
type NavProp = NativeStackNavigationProp<HomeStackParamList>;

/**
 * Register key (Fasla Redesign v2): Step 1 · Name → Step 2 · Focus settings → Key ready.
 * Opened from a pairing scan with the new key's id; without one it scans first.
 */
export function AddBrick() {
  const pal = usePalette();
  const reduce = useReducedMotion();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<HomeStackParamList, 'AddBrick'>>();
  const [tagId, setTagId] = useState<string | null>(route.params?.tagId ? normalizeTagId(route.params.tagId) : null);
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0].key);
  const [mode, setMode] = useState<string>('deep');
  const [duration, setDuration] = useState('50');
  const [strict, setStrict] = useState(true);
  const [appsCount, setAppsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([db.blockedApps.listBlockedApps(), db.settings.get('strict_mode')]).then(([apps, strictDefault]) => {
      setAppsCount(apps.length);
      setStrict(strictDefault !== '0');
    }).catch(() => {});
  }, []);

  const found = usePairScan(!tagId, id => setTagId(id));

  // Hardware back walks the steps; Key ready goes home.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'focus') { setStep('name'); return true; }
      if (step === 'ready') { navigation.popToTop(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [navigation, step]);

  useEffect(() => {
    if (step !== 'ready') return;
    rise.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.timing(rise, { toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, rise, step]);

  const create = async () => {
    if (saving || !tagId) return;
    setSaving(true);
    try {
      const finalName = name.trim() || LOCATIONS.find(l => l.key === location)?.label || 'New key';
      await db.tags.registerTag({
        id: tagId, name: finalName, location, mode, categories: {}, duration, strict: strict ? 1 : 0,
        createdAt: Math.floor(Date.now() / 1000),
      });
      const apps = await db.blockedApps.listBlockedApps();
      setAppsCount(appsForBrick({ apps: null }, apps.map(a => a.packageName)).length);
      setName(finalName);
      setStep('ready');
    } catch (err) {
      faslaAlert('Could not save this key', describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const startNow = () => {
    if (tagId) useFocusUi.getState().setStartWith(tagId);
    navigation.popToTop();
  };

  const pairTrouble = () => faslaAlert(
    'Can’t find the key?',
    'Check that NFC is on, then hold the top of your phone flat on the card for a second. Cases thicker than a few millimetres can get in the way.',
  );

  if (!tagId) {
    return (
      <Frame>
        <ScanSheet visible scanFor="pair" done={found} onClose={() => navigation.goBack()} onTrouble={pairTrouble} />
      </Frame>
    );
  }

  const header = (title: string, onBack: () => void) => (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundButton icon="back" label="Back" onPress={onBack} />
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>REGISTER KEY</Eyebrow>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>{title}</Text>
        </View>
        <RoundButton icon="close" label="Close" iconSize={16} onPress={() => navigation.popToTop()} />
      </View>
      <StepBar step={step === 'name' ? 1 : 2} />
    </>
  );

  if (step === 'name') {
    const canContinue = validateBrickName(name);
    return (
      <Frame>
        {header('Step 1 of 2 · Name', () => navigation.goBack())}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ marginTop: 26, width: 72, height: 72, borderRadius: 22, backgroundColor: pal.c2A1012, borderWidth: 1, borderColor: pal.c5A1C1F, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name={placeIcon(location)} size={30} color={pal.cFF5A5F} />
          </View>
          <Title style={{ marginTop: 18 }}>Name this key</Title>
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>Where does it live? You’ll tap it here to start focusing.</Text>
          <KeyNameInput value={name} onChange={setName} placeholder="e.g. Desk" />
          <SectionLabel style={{ marginTop: 20 }}>QUICK PICK</SectionLabel>
          <PlaceGrid location={location} name={name} onPick={(loc, n) => { setLocation(loc); setName(n); }} />
          <View style={{ flex: 1, minHeight: 24 }} />
          <PillButton label="Continue" disabled={!canContinue} onPress={() => setStep('focus')} style={{ marginBottom: 18 }} />
        </ScrollView>
      </Frame>
    );
  }

  if (step === 'focus') {
    return (
      <Frame>
        {header('Step 2 of 2 · Focus settings', () => setStep('name'))}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <SectionLabel style={{ marginTop: 22 }}>FOCUS MODE</SectionLabel>
          <View style={{ gap: 8 }}>
            {BRICK_MODES.map(m => {
              const on = m.key === mode;
              return (
                <Pressable key={m.key} onPress={() => setMode(m.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: on ? pal.c5A1C1F : pal.c232327, backgroundColor: on ? pal.c1C0E10 : pal.c141417 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? RED : pal.c3A3A40, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? RED : 'transparent' }} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 15, color: pal.cF5F5F2 }}>{m.label}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }}>{m.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel style={{ marginTop: 22 }}>SESSION LENGTH</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DURATIONS.map(d => {
              const on = d.key === duration;
              return (
                <Pressable key={d.key} onPress={() => setDuration(d.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{ width: '48.6%', height: 52, borderRadius: 999, borderWidth: 1, borderColor: on ? RED : pal.c232327, backgroundColor: on ? RED : pal.c141417, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: on ? '#FFFFFF' : pal.cB4B4BA }}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: pal.c17171A }}>
            <IconTile icon="lock" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Strict mode</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }}>Can’t unlock until the session ends</Text>
            </View>
            <Toggle value={strict} onChange={setStrict} label="Strict mode for this key" />
          </View>
        </ScrollView>
        <View style={{ paddingTop: 14, paddingBottom: 18, borderTopWidth: 1, borderTopColor: pal.c1C1C20 }}>
          <PillButton label={saving ? 'Saving…' : 'Create key'} disabled={saving} onPress={() => { create().catch(() => {}); }} />
        </View>
      </Frame>
    );
  }

  const fade = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
  const chips = [modeLabel(mode), `${appsCount || 'No'} apps`, durationLabel(duration)];
  return (
    <Frame gutter={24} bg={<RadialBg spec={{ cx: 0.5, cy: 0.28, rx: 0.8, ry: 0.4, stops: [[pal.c2A1012, 0], [pal.c0B0B0D, 0.7], [pal.c0B0B0D, 1]] }} />}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Eyebrow color={pal.c3DDC84} spacing={0.2} style={{ marginTop: 20 }}>PAIRED</Eyebrow>
        <View style={{ height: 282, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ rotate: '-6deg' }] }}><BrickCard width={240} face="session_completed" /></View>
        </View>
        <Animated.Text style={[{ fontFamily: fonts.display, fontSize: 38, letterSpacing: -1.7, lineHeight: 40, color: pal.cF5F5F2, textAlign: 'center' }, fade]} accessibilityRole="header">
          “{name}” is ready
        </Animated.Text>
        <Animated.Text style={[{ marginTop: 12, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: pal.c9A9AA0, textAlign: 'center', maxWidth: 290 }, fade]}>
          Tap this key any time to start a {modeLabel(mode)} session.
        </Animated.Text>
        <Animated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 22 }, fade]}>
          {chips.map(c => (
            <View key={c} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c2A2A2F, backgroundColor: pal.c141417, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RED }} />
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.cF5F5F2 }}>{c}</Text>
            </View>
          ))}
        </Animated.View>
        <View style={{ flex: 1 }} />
        <PillButton label="Start focusing now" onPress={startNow} style={{ alignSelf: 'stretch' }} />
        <PillButton label="Back to home" kind="outline" height={56} onPress={() => navigation.popToTop()} style={{ alignSelf: 'stretch', marginTop: 10, marginBottom: 16 }} />
      </View>
    </Frame>
  );
}
