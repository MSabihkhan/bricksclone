import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useFocusStore } from '../state/useFocusStore';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';
import { getRoutine } from '../features/rituals';
import { NotificationAccessSheet } from '../components/NotificationAccessSheet';
import { BrickCard } from '../components/BrickCard';
import { ScanSheet } from '../components/ScanSheet';
import { usePersonaEnabled } from '../hooks/usePersonaEnabled';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { faslaAlert } from '../components/FaslaDialog';
import { EASE_OUT, segment } from '../brand/launchTimeline';
import { focusClock, focusCaption, parkedThoughts } from './focusLockModel';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Glyph, LiveDot, PillButton, RadialBg, RoundButton, Toggle, showToast } from '../ui/kit';

interface Props {
  /** Leave this screen for Home; the session keeps running. */
  onMinimize: () => void;
  /** Play the entrance animation (a session was just started in the app). */
  animateIn?: boolean;
}

const ENTRANCE_MS = 900;

/** Locked in (Fasla Redesign v2). */
export function FocusLock({ onMinimize, animateIn = false }: Props) {
  const pal = usePalette();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { timerTick, activeSession, endSession, enforcementHealth, refreshEnforcementHealth } = useFocusStore();
  const autoEndStarted = useRef(false);
  const [plannedSec, setPlannedSec] = useState<number | null>(null);
  const [keyName, setKeyName] = useState('your key');
  const [appLabels, setAppLabels] = useState<string[]>([]);
  const [parked, setParked] = useState<string[]>([]);
  const [parkOpen, setParkOpen] = useState(false);
  const [parkText, setParkText] = useState('');
  const [access, setAccess] = useState<boolean | null>(null);
  const [silenceOn, setSilenceOn] = useState(true);
  const [heldCount, setHeldCount] = useState(0);
  const [silenceSheet, setSilenceSheet] = useState(false);
  const [endScan, setEndScan] = useState(false);
  const personaOn = usePersonaEnabled();
  const reduceMotion = useReducedMotion();

  const poll = useCallback(() => {
    BlockingModule.hasNotificationAccess().then(setAccess).catch(() => {});
    BlockingModule.getSilenceEnabled().then(setSilenceOn).catch(() => {});
    BlockingModule.getHeldNotificationCount().then(setHeldCount).catch(() => {});
  }, []);
  useEffect(() => { poll(); const id = setInterval(poll, 5000); return () => clearInterval(id); }, [poll]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      activeSession?.tagId ? db.tags.getTagById(activeSession.tagId) : Promise.resolve(undefined),
      db.blockedApps.listBlockedApps(),
    ]).then(([tag, apps]) => {
      if (!mounted) return;
      setPlannedSec(activeSession?.plannedEndTime ? Math.max(1, activeSession.plannedEndTime - activeSession.startTime) : null);
      if (tag) setKeyName(tag.name);
      setParked(parkedThoughts(activeSession?.laterNote ?? null));
      const labels = new Map(apps.map(app => [app.packageName, app.label]));
      setAppLabels((activeSession?.apps ?? []).map(pkg => labels.get(pkg) ?? pkg.split('.').pop() ?? pkg));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [activeSession]);

  // Back goes to Home rather than closing the app; the session keeps running.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onMinimize(); return true; });
    return () => sub.remove();
  }, [onMinimize]);

  useEffect(() => {
    refreshEnforcementHealth().catch(() => {});
    const id = setInterval(refreshEnforcementHealth, 5000);
    return () => clearInterval(id);
  }, [refreshEnforcementHealth]);

  const nowSec = Math.floor(Date.now() / 1000) + timerTick * 0;
  const elapsed = activeSession ? Math.max(0, nowSec - activeSession.startTime) : 0;
  const keyOnly = plannedSec === null;
  const remaining = keyOnly ? 0 : Math.max((plannedSec ?? 0) - elapsed, 0);

  useEffect(() => {
    if (keyOnly || remaining > 0 || !activeSession || autoEndStarted.current) return;
    autoEndStarted.current = true;
    endSession('timer').catch(error => {
      autoEndStarted.current = false;
      faslaAlert('Could not finish the session', error instanceof Error ? error.message : String(error));
    });
  }, [activeSession, endSession, keyOnly, remaining]);

  const endEarly = () => { setEndScan(false); navigation.navigate('ModalStack', { screen: 'EmergencyOverride' }); };
  // "End early" lives behind the scan sheet for every session, so nobody is locked in without their key.
  const endTrouble = () => faslaAlert(
    'Can’t tap your key?',
    `Hold the top of your phone flat on ${keyName} for a second. If it’s not with you, End early still works, after a short wait.`,
    [{ text: 'Keep focusing', style: 'cancel' }, { text: 'End early', style: 'destructive', onPress: endEarly }],
  );

  const submitPark = () => {
    const t = parkText.trim();
    setParkText('');
    setParkOpen(false);
    if (!t || !activeSession) return;
    const next = [...parked, t];
    setParked(next);
    db.sessions.saveLaterNote(activeSession.id, next.join('\n')).catch(() => {});
    showToast('Parked for later');
  };

  const silenced = !!access && silenceOn;
  const onSilence = (v: boolean) => {
    if (!access) { setSilenceSheet(true); return; }
    setSilenceOn(v);
    BlockingModule.setSilenceEnabled(v).catch(() => {});
    showToast(v ? 'Blocked apps silenced' : 'Notifications back on');
  };

  // ---- Entrance: the card drops in and tilts into place, then the rest settles in order. ----
  const t = useRef(new Animated.Value(animateIn ? 0 : ENTRANCE_MS)).current;
  useEffect(() => {
    if (!animateIn || reduceMotion) { t.setValue(ENTRANCE_MS); return; }
    Animated.timing(t, { toValue: ENTRANCE_MS, duration: ENTRANCE_MS, easing: Easing.linear, useNativeDriver: true }).start();
  }, [animateIn, reduceMotion, t]);
  const tr = (a: number, b: number, from: number, to: number) => t.interpolate({ ...segment(a, b, from, to, EASE_OUT), extrapolate: 'clamp' });
  const rise = (a: number) => ({ opacity: tr(a, a + 300, 0, 1), transform: [{ translateY: tr(a, a + 300, 14, 0) }] });
  const cardIn = {
    opacity: tr(0, 260, 0, 1),
    transform: [
      { translateY: tr(0, 520, -28, 0) },
      { scale: tr(0, 520, 0.86, 1) },
      { rotate: tr(0, 620, 6, -4).interpolate({ inputRange: [-4, 6], outputRange: ['-4deg', '6deg'] }) },
    ],
  };

  const mode = getRoutine(activeSession?.routineType ?? 'study').shortLabel;
  const card = { borderRadius: 24, backgroundColor: pal.c17171A };

  return (
    <Frame bg={<RadialBg spec={{ cx: 0.5, cy: 0.18, rx: 0.9, ry: 0.4, stops: [[pal.c241012, 0], [pal.c0B0B0D, 0.7]] }} />}>
      <View style={{ height: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <RoundButton icon="chevronDown" label="Go to Home. Focus keeps running." size={36} kind="solid" iconSize={16} onPress={onMinimize} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: pal.c17171A, flexShrink: 1 }}>
            <Glyph name="lock" size={14} color={pal.cF5F5F2} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: pal.cF5F5F2, flexShrink: 1 }} numberOfLines={1}>{mode} · {keyName}</Text>
          </View>
        </View>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: pal.c3A1A1C, backgroundColor: pal.c1A0D0E }, rise(150)]}>
          <LiveDot size={7} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: pal.cFF8A8D }}>Locked in</Text>
        </Animated.View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[{ height: 104, marginTop: 16, alignItems: 'center', justifyContent: 'center' }, cardIn]}>
          <BrickCard width={144} face={personaOn ? 'session_started' : null} />
        </Animated.View>

        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <Animated.Text style={[{ fontFamily: fonts.monoMedium, fontSize: 72, letterSpacing: -3.6, lineHeight: 78, color: pal.cF5F5F2 }, rise(260)]}
            accessibilityLabel={`${keyOnly ? 'Elapsed' : 'Remaining'} ${focusClock(keyOnly ? elapsed : remaining)}`}>
            {focusClock(keyOnly ? elapsed : remaining)}
          </Animated.Text>
          <Animated.Text style={[{ fontFamily: fonts.body, fontSize: 14, color: pal.c9A9AA0, marginTop: 10, textAlign: 'center' }, rise(330)]}>
            {focusCaption(keyOnly, keyName, activeSession?.plannedEndTime ?? null)}
          </Animated.Text>
        </View>

        {enforcementHealth === 'degraded' ? (
          <View style={{ marginTop: 18, padding: 16, gap: 10, borderRadius: 22, borderWidth: 1, borderColor: pal.c4A1A1D, backgroundColor: pal.c1C0E10 }} accessibilityRole="alert">
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>Blocking has stopped</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.cC9A3A5 }}>Accessibility or usage access was switched off, so blocked apps can open. Your session is still running.</Text>
            <PillButton label="Turn it back on" height={48} onPress={() => BlockingModule.requestAccessibility().catch(() => {})} />
          </View>
        ) : null}

        {activeSession?.intention ? (
          <Animated.View style={[card, { marginTop: 22, paddingVertical: 16, paddingHorizontal: 20, gap: 6 }, rise(420)]}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.54, color: pal.cFF5A5F }}>YOU'RE HERE TO</Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.44, lineHeight: 25, color: pal.cF5F5F2 }}>{activeSession.intention}</Text>
          </Animated.View>
        ) : null}

        <Animated.View style={[card, { marginTop: 10, overflow: 'hidden' }, rise(500)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, paddingLeft: 20, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: pal.c232327 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Held closed</Text>
            {appLabels.length ? (
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={appLabels.join(', ')}>
                {appLabels.slice(0, 4).map(label => (
                  <View key={label} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: pal.c26262B, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: pal.cD8D8DC }}>{(label[0] ?? '?').toUpperCase()}</Text>
                  </View>
                ))}
                {appLabels.length > 4 ? (
                  <View style={{ height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pal.c26262B, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: pal.cD8D8DC }}>+{appLabels.length - 4}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'SettingsTab', params: { screen: 'ManageBlockedApps' } } as never)}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: pal.c2A1416, justifyContent: 'center' }} accessibilityRole="button">
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.cFF8A8D }}>Choose apps</Text>
              </Pressable>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 62, paddingLeft: 20, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: pal.c232327 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Silence their notifications</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }}>
                {silenced ? (heldCount > 0 ? `Silenced until you tap out · ${heldCount} held` : 'Silenced until you tap out') : 'They can still ping you'}
              </Text>
            </View>
            <Toggle value={silenced} onChange={onSilence} label="Silence notifications" />
          </View>

          {parked.length ? (
            <View style={{ gap: 6, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 4 }}>
              {parked.map((p, i) => (
                <View key={`${p}${i}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pal.cFF5A5F }} />
                  <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: pal.cB4B4BA }}>{p}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {parkOpen ? (
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 }}>
              <TextInput value={parkText} onChangeText={setParkText} placeholder="Text Sam about Friday…" placeholderTextColor={pal.c6E6E75} autoFocus
                onSubmitEditing={submitPark} returnKeyType="done" maxLength={120}
                style={{ flex: 1, minWidth: 0, height: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c2A2A2F, backgroundColor: pal.c0F0F11, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 14 }} />
              <Pressable onPress={submitPark} accessibilityRole="button" style={{ height: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: pal.cF5F5F2, justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.c0B0B0D }}>Park</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setParkOpen(true)} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingLeft: 20, paddingRight: 18, backgroundColor: pressed ? pal.c1C1C20 : 'transparent' })}>
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Park a distraction for later</Text>
              <Glyph name="plus" size={18} color={pal.c9A9AA0} />
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View style={[{ paddingBottom: 14 }, rise(580)]}>
        <Pressable onPress={() => setEndScan(true)} accessibilityRole="button" accessibilityHint="Opens the scan sheet. End early is there too."
          style={({ pressed }) => ({ height: 58, borderRadius: 999, borderWidth: 1, borderColor: pressed ? '#E5242B' : pal.c3A3A40, backgroundColor: pal.c0B0B0D, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 })}>
          <Glyph name="nfc" size={20} color={pal.cFF5A5F} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: pal.cF5F5F2 }} numberOfLines={1}>Tap {keyName} to finish</Text>
        </Pressable>
      </Animated.View>

      <ScanSheet visible={endScan} scanFor="end" done={false} keyName={keyName} onClose={() => setEndScan(false)} onTrouble={endTrouble} />
      <NotificationAccessSheet visible={silenceSheet} onClose={() => { setSilenceSheet(false); poll(); }} onChanged={() => poll()} />
    </Frame>
  );
}

