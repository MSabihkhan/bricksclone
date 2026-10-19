import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { BrickCard } from '../components/BrickCard';
import { PermissionsChecklist, usePermissionStatus } from '../components/PermissionsChecklist';
import { Palette, RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Glyph, PillButton, RadialBg } from '../ui/kit';
import { OnboardingStackParamList } from '../navigation/types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { completeOnboarding } from '../state/onboarding';
import { db } from '../db';
import { nfcService, normalizeTagId } from '../services/nfc';
import { LOCATIONS } from '../utils/onboarding';
import { CARD_ASPECT } from '../features/persona';
import { ONBOARDING_POSES, PAGE_COUNT, Pose } from '../features/onboardingPoses';

const STAGE = 290;      // height of the area the card moves in
const CARD_W = 190;

type PairState = 'waiting' | 'paired' | 'off' | 'unsupported';

/**
 * Card-led onboarding: the printed key travels through four pages and its pose follows the
 * swipe exactly (the scroll offset drives it on the native thread). Continue does the same.
 */
export function Welcome() {
  const pal = usePalette();
  const styles = useMemo(() => makeStyles(pal), [pal]);
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGE_COUNT - 1;

  const scrollX = useRef(new Animated.Value(0)).current;
  const pageValue = useRef(new Animated.Value(0)).current;
  // Reduced motion: the card jumps between poses instead of travelling with the finger.
  const progress = useMemo(
    () => (reduceMotion ? pageValue : Animated.divide(scrollX, Math.max(1, width))),
    [pageValue, reduceMotion, scrollX, width],
  );

  const goTo = useCallback((i: number) => {
    const target = Math.max(0, Math.min(PAGE_COUNT - 1, i));
    pager.current?.scrollTo({ x: target * width, animated: !reduceMotion });
    setPage(target);
    pageValue.setValue(target);
  }, [pageValue, reduceMotion, width]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    setPage(i);
    pageValue.setValue(i);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 0) return false;
      goTo(page - 1);
      return true;
    });
    return () => sub.remove();
  }, [goTo, page]);

  // ---- Page 2: pair by tapping (optional; "Pair later" is always there) ----
  const [pair, setPair] = useState<PairState>('waiting');
  const [brickName, setBrickName] = useState('');
  useEffect(() => {
    if (page !== 1 || pair === 'paired') return;
    let live = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      if (!(await nfcService.isSupported())) { if (live) setPair('unsupported'); return; }
      if (!(await nfcService.isEnabled())) { if (live) setPair('off'); return; }
      if (live) setPair('waiting');
      unsubscribe = nfcService.subscribe(async tag => {
        if (!tag || !live) return;
        const id = normalizeTagId(tag.id);
        const existing = await db.tags.getTagById(id);
        let name = existing?.name ?? 'My key';
        if (!existing) {
          const strictDefault = await db.settings.get('strict_mode');
          // Sensible defaults; name, mode and apps can all be changed later in My keys.
          await db.tags.registerTag({
            id, name, location: LOCATIONS[0].key, mode: 'deep', categories: {}, duration: 'inf',
            strict: strictDefault === '0' ? 0 : 1, createdAt: Math.floor(Date.now() / 1000),
          });
        }
        if (!live) return;
        setBrickName(name);
        setPair('paired');
      });
    })().catch(() => {});
    return () => { live = false; unsubscribe?.(); };
  }, [page, pair]);

  // ---- Page 4: what will be blocked ----
  const [appsCount, setAppsCount] = useState(0);
  const [keysCount, setKeysCount] = useState(0);
  useFocusEffect(useCallback(() => {
    Promise.all([db.blockedApps.listBlockedApps(), db.tags.listTags()])
      .then(([apps, tags]) => { setAppsCount(apps.length); setKeysCount(tags.length); }).catch(() => {});
  }, []));
  const paired = pair === 'paired' || keysCount > 0;

  const { status } = usePermissionStatus();

  const finish = async () => {
    await completeOnboarding();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  // ---- Poses ----
  const range = ONBOARDING_POSES.map((_, i) => i);
  const along = (key: keyof Pose, unit = '') => progress.interpolate({
    inputRange: range,
    outputRange: (unit ? ONBOARDING_POSES.map(p => `${p[key]}${unit}`) : ONBOARDING_POSES.map(p => p[key])) as number[],
    extrapolate: 'clamp',
  });
  const cardH = Math.round(CARD_W * CARD_ASPECT);
  const cardStyle = {
    transform: [
      { perspective: 900 },
      { translateX: along('x') }, { translateY: along('y') }, { scale: along('s') },
      { rotateX: along('rx', 'deg') }, { rotateY: along('ry', 'deg') }, { rotateZ: along('rz', 'deg') },
    ],
  };
  const phoneStyle = {
    opacity: along('po'),
    transform: [{ translateX: along('px') }, { translateY: along('py') }, { rotateZ: along('pr', 'deg') }],
  };
  const pairPose = ONBOARDING_POSES[1];

  const pairColor = pair === 'paired' ? pal.c3DDC84 : pal.cFF8A8D;
  const pairStatus = pair === 'paired' ? `Paired · “${brickName}” is yours`
    : pair === 'off' ? 'NFC is off · turn it on in settings'
    : pair === 'unsupported' ? 'This phone can’t read NFC'
    : Platform.OS === 'ios' ? 'Tap “Scan key”, then hold your iPhone to the card'
    : 'Listening for your key…';

  return (
    <Frame gutter={0} style={{ paddingTop: 0 }} bg={<RadialBg spec={{ cx: 0.5, cy: 0.32, rx: 0.9, ry: 0.4, stops: [[pal.c1E0E10, 0], [pal.c0B0B0D, 0.7], [pal.c0B0B0D, 1]] }} />}>
      <View style={styles.header}>
        <OnboardingHeader onSkip={last ? undefined : () => goTo(PAGE_COUNT - 1)} />
      </View>

      <View style={styles.body}>
        <Animated.ScrollView
          ref={pager as never}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={onScrollEnd}
        >
          <View style={[styles.page, { width }]}>
            <Text style={styles.eyebrow}>1 OF 4 · MEET YOUR KEY</Text>
            <Text style={styles.title}>This card is your off switch.</Text>
            <Text style={styles.copy}>Apps you choose stay locked until you tap it. That short walk beats a quick check.</Text>
          </View>

          <View style={[styles.page, { width }]}>
            <Text style={styles.eyebrow}>2 OF 4 · PAIR</Text>
            <Text style={styles.title}>Tap your phone to it.</Text>
            <Text style={styles.copy}>Hold the top of your phone on the card for a second.</Text>
            <View style={styles.statusPill} accessibilityLiveRegion="polite">
              <View style={[styles.dot, { backgroundColor: pairColor }]} />
              <Text style={[styles.statusText, { color: pairColor }]} numberOfLines={1}>{pairStatus}</Text>
            </View>
            {__DEV__ && Platform.OS === 'ios' && pair === 'waiting' ? (
              <PillButton label="Use test key (debug)" kind="outline" height={48} style={{ marginTop: 10, alignSelf: 'center', paddingHorizontal: 32 }}
                onPress={() => nfcService.simulateTap()} />
            ) : null}
            {Platform.OS === 'ios' && pair === 'waiting' ? (
              <PillButton label="Scan key" kind="outline" height={48} style={{ marginTop: 16, alignSelf: 'center', paddingHorizontal: 32 }}
                onPress={() => { nfcService.scan('Hold your iPhone near your key').catch(() => {}); }} />
            ) : null}
          </View>

          <View style={[styles.page, styles.pageTight, { width }]}>
            <Text style={styles.eyebrow}>3 OF 4 · PERMISSIONS</Text>
            <Text style={[styles.title, styles.titleSmall]}>Unlock the essentials.</Text>
            <ScrollView style={styles.checklist} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <PermissionsChecklist status={status} compact />
            </ScrollView>
          </View>

          <View style={[styles.page, { width }]}>
            <Text style={styles.eyebrow}>4 OF 4 · READY</Text>
            <Text style={styles.title}>Tap to start.</Text>
            <Text style={styles.copy}>Tap the card any time. Focus starts right away.</Text>
            <View style={styles.readyCard}>
              <Pressable style={({ pressed }) => [styles.readyRow, pressed && { backgroundColor: pal.c1C1C20 }]} onPress={() => navigation.navigate('SelectApps')} accessibilityRole="button">
                <Text style={styles.readyLabel}>Choose apps to block</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.readyValue, { color: appsCount ? pal.cD8D8DC : pal.cFF5A5F }]}>{appsCount ? `${appsCount} apps` : 'Choose'}</Text>
                  <Glyph name="chevron" size={14} color={pal.c6E6E75} />
                </View>
              </Pressable>
              {!paired ? (
                <Pressable style={({ pressed }) => [styles.readyRow, styles.readyRowTop, pressed && { backgroundColor: pal.c1C1C20 }]} onPress={() => goTo(1)} accessibilityRole="button">
                  <Text style={styles.readyLabel}>Pair your card</Text>
                  <Text style={[styles.readyValue, { color: pal.cFF5A5F }]}>Not paired</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.ScrollView>

        {/* The card and the phone sit above the pages and never take touches. */}
        <View style={[styles.stage, { width }]} pointerEvents="none">
          {page === 1 && pair === 'paired' ? (
            <Ripple x={pairPose.x} y={pairPose.y} still={reduceMotion} color={RED} />
          ) : null}
          <Animated.View style={[styles.phone, phoneStyle]}>
            <View style={styles.phoneSpeaker} />
          </Animated.View>
          <Animated.View style={[styles.card, { marginLeft: -CARD_W / 2, marginTop: -cardH / 2 }, cardStyle]}>
            <BrickCard width={CARD_W} face="idle" />
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGE_COUNT}`}>
          {range.map(i => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Step ${i + 1}`}>
              <View style={[styles.pageDot, { width: i === page ? 28 : 8, backgroundColor: i === page ? RED : i < page ? pal.c5A1C1F : pal.c2A2A2F }]} />
            </Pressable>
          ))}
        </View>
        <PillButton
          label={last ? 'Go to Home' : page === 1 && pair !== 'paired' ? 'Pair later' : 'Continue'}
          onPress={() => { if (last) finish().catch(() => {}); else goTo(page + 1); }}
        />
      </View>
    </Frame>
  );
}

function Ripple({ x, y, still, color }: { x: number; y: number; still: boolean; color: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) { a.setValue(0.5); return; }
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a, still]);
  const ring = (offset: number) => {
    const t = still ? a : Animated.modulo(Animated.add(a, offset), 1);
    return {
      borderColor: color,
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
      transform: [{ translateX: x }, { translateY: y }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) }],
    };
  };
  return (
    <>
      <Animated.View style={[rippleStyles.ring, ring(0)]} />
      <Animated.View style={[rippleStyles.ring, ring(0.45)]} />
    </>
  );
}

const rippleStyles = StyleSheet.create({
  ring: { position: 'absolute', left: '50%', top: '50%', width: 160, height: 160, marginLeft: -80, marginTop: -80, borderRadius: 80, borderWidth: 2 },
});

const makeStyles = (pal: Palette) => StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 18 },
  body: { flex: 1 },
  stage: { position: 'absolute', top: 0, left: 0, height: STAGE },
  card: { position: 'absolute', left: '50%', top: '50%' },
  phone: { position: 'absolute', left: '50%', top: '50%', width: 86, height: 172, marginLeft: -43, marginTop: -86, borderRadius: 22, borderWidth: 3, alignItems: 'center', paddingTop: 12, borderColor: pal.cF5F5F2, backgroundColor: pal.c1F1F23 },
  phoneSpeaker: { width: 26, height: 5, borderRadius: 3, backgroundColor: pal.c6E6E75 },
  page: { paddingHorizontal: 24, paddingTop: STAGE + 4, gap: 12 },
  pageTight: { paddingTop: 104 },
  eyebrow: { color: pal.c85858C, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.68 },
  title: { color: pal.cF5F5F2, fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.8 },
  titleSmall: { fontSize: 36, lineHeight: 38, letterSpacing: -1.62 },
  copy: { color: pal.c9A9AA0, fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  checklist: { flex: 1, marginTop: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c232327, backgroundColor: pal.c141417, alignSelf: 'flex-start', maxWidth: '100%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flexShrink: 1, fontFamily: fonts.mono, fontSize: 12 },
  readyCard: { marginTop: 6, borderRadius: 22, borderWidth: 1, borderColor: pal.c232327, backgroundColor: pal.c17171A, overflow: 'hidden' },
  readyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 18 },
  readyRowTop: { borderTopWidth: 1, borderTopColor: pal.c232327 },
  readyLabel: { color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 15 },
  readyValue: { fontFamily: fonts.mono, fontSize: 12 },
  footer: { paddingHorizontal: 24, gap: 22, paddingTop: 12, paddingBottom: 16 },
  dots: { flexDirection: 'row', gap: 8, alignSelf: 'center' },
  pageDot: { height: 8, borderRadius: 4 },
});
