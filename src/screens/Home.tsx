import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusStore } from '../state/useFocusStore';
import { useFocusUi } from '../state/useFocusUi';
import { FocusLock } from './FocusLock';
import { db } from '../db';
import type { Session, Tag } from '../db/types';
import { HomeStackParamList, MainTabsParamList } from '../navigation/types';
import { useNfcSessionStart } from '../hooks/useNfcSessionStart';
import { usePairScan } from '../hooks/usePairScan';
import { durationLabel } from '../utils/onboarding';
import { formatToday } from './homeHeaderModel';
import { OUTCOME_ROUTINE_TYPES, RoutineType } from '../features/rituals';
import { HOME_RITUALS, homeRitual } from '../features/intentionIdeas';
import { OutcomeSheet } from '../components/OutcomeSheet';
import { BreathingReset } from '../components/BreathingReset';
import { IntentionSheet } from '../components/IntentionSheet';
import { ScanSheet } from '../components/ScanSheet';
import { BrickStack } from '../components/BrickStack';
import { FaslaMark } from '../components/FaslaMark';
import { FocusBanner } from '../components/FocusBanner';
import { faslaAlert } from '../components/FaslaDialog';
import { useAutoTour, useWalkthroughTarget } from '../walkthrough/Walkthrough';
import { readPermissions } from '../services/permissionsService';
import { canBlock } from '../features/permissions';
import { appsForBrick } from '../features/brickApps';
import { bringToFront, cycle, orderByRecentUse, reconcileOrder } from '../features/brickStack';
import { usePersonaEnabled } from '../hooks/usePersonaEnabled';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, Glyph, PillButton, RadialBg, RoundButton, Segmented, TAB_CLEARANCE, showToast } from '../ui/kit';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type SheetKind = null | 'intention' | 'scanStart' | 'pair';

const HERO_BG = (pal: ReturnType<typeof usePalette>) => ({ cx: 0.5, cy: 0.4, rx: 1.2, ry: 0.9, stops: [[pal.c2A1012, 0], [pal.c150C0D, 0.55], [pal.c111113, 1]] as Array<[string, number]> });

/** Home (Fasla Redesign v2). */
export function Home() {
  const pal = usePalette();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const { machine, starting, hydrate, startSession, endSession, activeSession } = useFocusStore();
  const minimized = useFocusUi(s => s.minimized);
  const setMinimized = useFocusUi(s => s.setMinimized);
  const personaOn = usePersonaEnabled();

  const [tags, setTags] = useState<Tag[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [mainApps, setMainApps] = useState<string[]>([]);
  const [routineType, setRoutineType] = useState<RoutineType>('study');
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Session | null>(null);
  const [dismissedOutcomeId, setDismissedOutcomeId] = useState<number | null>(null);
  const [breathOpen, setBreathOpen] = useState(false);
  const [blockingReady, setBlockingReady] = useState<boolean | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [scanDone, setScanDone] = useState(false);
  const [entering, setEntering] = useState(false);
  const pendingIntention = useRef('');
  const ritualTarget = useWalkthroughTarget('home.ritualPicker');
  const brickTarget = useWalkthroughTarget('home.brickRail');
  const startTarget = useWalkthroughTarget('home.startButton');

  useEffect(() => {
    hydrate().catch(() => {});
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      hydrate().catch(() => {});
      // Coming back to fasla mid-session (e.g. "Back to focus" on the lock screen) lands on focus.
      setMinimized(false);
    });
    return () => sub.remove();
  }, [hydrate, setMinimized]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    readPermissions().then(p => { if (mounted) setBlockingReady(canBlock(p)); }).catch(() => {});
    Promise.all([db.tags.listTags(), db.blockedApps.listBlockedApps(), db.sessions.listSessions()])
      .then(([savedTags, apps, sessions]) => {
        if (!mounted) return;
        setTags(savedTags);
        const startWith = useFocusUi.getState().startWith;
        setOrder(current => {
          const next = reconcileOrder(current, orderByRecentUse(savedTags, sessions));
          return startWith && savedTags.some(t => t.id === startWith) ? bringToFront(next, startWith) : next;
        });
        setMainApps(apps.map(a => a.packageName));
        if (startWith) { useFocusUi.getState().setStartWith(null); setSheet('intention'); }
      }).catch(() => {});
    return () => { mounted = false; };
  }, []));

  useEffect(() => {
    if (machine !== 'idle') return;
    Promise.all([db.sessions.getPendingOutcome(OUTCOME_ROUTINE_TYPES), db.sessions.listSessions()]).then(([pending, sessions]) => {
      setPendingOutcome(pending && pending.id !== dismissedOutcomeId ? pending : null);
      setNextStep(sessions.find(session => session.nextStep?.trim())?.nextStep ?? null);
    }).catch(() => {});
  }, [dismissedOutcomeId, machine]);

  const beginSession = useCallback(async (tagId: string, intention: string) => {
    setEntering(true);
    setMinimized(false);
    try {
      await startSession(tagId, { routineType, intention });
    } catch (error) {
      setEntering(false);
      faslaAlert('Could not start focus', error instanceof Error ? error.message : String(error));
    }
  }, [routineType, setMinimized, startSession]);

  useEffect(() => {
    if (!entering || machine !== 'active') return;
    const id = setTimeout(() => setEntering(false), 1200);
    return () => clearTimeout(id);
  }, [entering, machine]);

  // A tap on a known key starts focus. If the scan sheet is open, show "Locked in" first.
  const sheetRef = useRef<SheetKind>(null);
  sheetRef.current = sheet;
  const handleRegistered = useCallback((tagId: string) => {
    if (useFocusStore.getState().machine === 'active') return;
    setOrder(current => bringToFront(current, tagId));
    const fromSheet = sheetRef.current === 'scanStart';
    const intention = fromSheet ? pendingIntention.current : nextStep?.trim() ?? '';
    if (!fromSheet) { beginSession(tagId, intention); return; }
    setScanDone(true);
    setTimeout(() => { setSheet(null); setScanDone(false); beginSession(tagId, intention); }, 750);
  }, [beginSession, nextStep]);

  useNfcSessionStart({
    onRegistered: handleRegistered,
    onUnregistered: tagId => navigation.navigate('AddBrick', { tagId }),
    onEndTap: () => endSession('nfc'),
    registeredTagIds: tags.map(tag => tag.id),
  });

  const pairFound = usePairScan(sheet === 'pair', tagId => { setSheet(null); navigation.navigate('AddBrick', { tagId }); });

  useAutoTour('home', machine === 'idle' && tags.length > 0);

  // Session over: the design's toast, then (for study and work) the outcome question.
  const wasActive = useRef(machine === 'active');
  useEffect(() => {
    const ended = wasActive.current && machine === 'idle';
    wasActive.current = machine === 'active';
    if (!ended) return;
    setMinimized(false);
    db.sessions.listSessions().then(sessions => {
      const last = sessions.find(s => s.endTime !== null && s.endedVia !== 'start_failed');
      if (!last) return;
      const mins = Math.max(1, Math.round((last.durationSec ?? Math.max(0, (last.endTime ?? last.startTime) - last.startTime)) / 60));
      showToast(`Session complete · ${mins} min focused`);
    }).catch(() => {});
  }, [machine, setMinimized]);

  const focusRunning = machine === 'active';
  if (focusRunning && !minimized) return <FocusLock onMinimize={() => setMinimized(true)} animateIn={entering} />;

  const stackTags = order.map(id => tags.find(tag => tag.id === id)).filter((tag): tag is Tag => !!tag);
  const selected = stackTags[0] ?? tags[0];
  const runningKey = tags.find(tag => tag.id === activeSession?.tagId);
  const paired = tags.length > 0;
  const setupNeeded = blockingReady === false || mainApps.length === 0;
  const banner = focusRunning || setupNeeded;
  const multi = stackTags.length > 1;
  const heroInner = width - 40;
  const cardWidth = Math.min(heroInner - 40, multi ? (banner ? 216 : 264) : banner ? 240 : 300);
  const ritual = homeRitual(routineType);
  const settingsNav = () => navigation.getParent<NavigationProp<MainTabsParamList>>();

  const openStartScan = (intention: string) => { pendingIntention.current = intention; setScanDone(false); setSheet('scanStart'); };
  const primary = () => {
    if (focusRunning) { setMinimized(false); return; }
    if (selected) setSheet('intention');
    else { setScanDone(false); setSheet('pair'); }
  };
  const startTrouble = () => faslaAlert(
    'Start without your key?',
    `Use this if ${selected?.name ?? 'your key'} isn’t nearby or NFC isn’t working. You can still end with your key, or with End early.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Start now', onPress: () => { setSheet(null); if (selected) beginSession(selected.id, pendingIntention.current); } }],
  );
  const pairTrouble = () => faslaAlert(
    'Can’t find the key?',
    'Check that NFC is on, then hold the top of your phone flat on the card for a second. Cases thicker than a few millimetres can get in the way.',
  );
  const keyMeta = selected
    ? `${appsForBrick(selected, mainApps).length || 'No'} apps · ${durationLabel(selected.duration)}${selected.strict ? ' · Strict' : ''}${multi ? ` · ${stackTags.length} keys` : ''}`
    : '';

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_CLEARANCE }}>
        <View style={{ height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }}>{formatToday(new Date())}</Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.52, color: pal.cF5F5F2, lineHeight: 30 }}>Ready to focus?</Text>
          </View>
          <RoundButton icon="gear" label="Settings" kind="solid" iconSize={20} onPress={() => settingsNav()?.navigate('SettingsTab', { screen: 'Settings' })} />
        </View>

        {focusRunning ? <FocusBanner keyName={runningKey?.name} onOpen={() => setMinimized(false)} /> : null}
        {!focusRunning && setupNeeded ? (
          <Pressable
            onPress={() => (blockingReady === false ? settingsNav()?.navigate('SettingsTab', { screen: 'Permissions' }) : settingsNav()?.navigate('SettingsTab', { screen: 'ManageBlockedApps' }))}
            accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: 12, height: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: pal.c4A1A1D, backgroundColor: pressed ? pal.c24100F : pal.c1C0E10 })}
          >
            <Glyph name="info" size={20} color={pal.cFF5A5F} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>Blocking isn’t set up yet</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.cC9A3A5 }}>{blockingReady === false ? 'Sessions run, but apps won’t be blocked.' : 'Choose which apps to block.'}</Text>
            </View>
            <Glyph name="chevron" size={16} color={pal.cC9A3A5} />
          </Pressable>
        ) : null}

        {paired && selected ? (
          <>
            <View ref={brickTarget} collapsable={false} style={{ marginTop: 14, height: banner ? 200 : 268, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <RadialBg spec={HERO_BG(pal)} radius={28} />
              <BrickStack
                items={stackTags.map(tag => ({ id: tag.id, name: tag.name }))}
                width={cardWidth}
                topFace={personaOn ? 'idle' : null}
                onCycle={() => setOrder(cycle)}
                onBringToFront={id => { setOrder(current => bringToFront(current, id)); const k = tags.find(t => t.id === id); if (k) showToast(`Switched to ${k.name}`); }}
                onLongPress={() => settingsNav()?.navigate('SettingsTab', { screen: 'ManageTags' })}
                onPressTop={() => (focusRunning ? setMinimized(false) : openStartScan(nextStep?.trim() ?? ''))}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingHorizontal: 4 }}>
              <View style={{ gap: 3, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.2, color: pal.cF5F5F2 }} numberOfLines={1}>{selected.name}</Text>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: pal.c3DDC84 }} accessibilityLabel="Paired" />
                </View>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }} numberOfLines={1}>{keyMeta}</Text>
              </View>
              <Pressable onPress={() => settingsNav()?.navigate('SettingsTab', { screen: 'ManageTags' })} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c2A2A2F, backgroundColor: pressed ? pal.c17171A : 'transparent' })}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: pal.cF5F5F2 }}>Manage</Text>
                <Glyph name="chevron" size={14} color={pal.cF5F5F2} />
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable ref={brickTarget} onPress={() => { setScanDone(false); setSheet('pair'); }} accessibilityRole="button"
            style={{ marginTop: 14, height: 268, borderRadius: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: pal.c3A2224, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, overflow: 'hidden' }}>
            <RadialBg spec={{ cx: 0.5, cy: 0.3, rx: 1.2, ry: 0.9, stops: [[pal.c1E0E10, 0], [pal.c111113, 1]] }} radius={28} />
            <FaslaMark size={64} />
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.44, color: pal.cF5F5F2 }}>Pair your key</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: pal.c9A9AA0, textAlign: 'center', maxWidth: 240 }}>Tap here, then hold your phone to it. Takes ten seconds.</Text>
          </Pressable>
        )}

        <View style={{ marginTop: 18, gap: 10 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0, paddingHorizontal: 4 }}>This session is for</Text>
          <View ref={ritualTarget} collapsable={false}>
            <Segmented options={HOME_RITUALS.map(r => ({ value: r.id, label: r.label }))} value={routineType} onChange={setRoutineType} />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c6E6E75, paddingHorizontal: 4 }}>{ritual.desc}</Text>
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setBreathOpen(true)} accessibilityRole="button" accessibilityLabel="Breathe first"
            style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: pal.c2A2A2F, backgroundColor: pressed ? pal.c1C1C20 : pal.c141417, alignItems: 'center', justifyContent: 'center' })}>
            <Glyph name="moon" size={20} width={1.8} color={pal.cF5F5F2} />
          </Pressable>
          <View ref={startTarget} collapsable={false} style={{ flex: 1 }}>
            <PillButton height={56} disabled={starting}
              label={focusRunning ? 'Back to focus' : selected ? `Set ${ritual.label.toLowerCase()} intention` : 'Connect a key'}
              onPress={primary} />
          </View>
        </View>
      </ScrollView>

      <IntentionSheet visible={sheet === 'intention'} routineType={routineType} keyName={selected?.name} nextStep={nextStep}
        onClose={() => setSheet(null)} onContinue={openStartScan} />
      <ScanSheet visible={sheet === 'scanStart'} scanFor="start" done={scanDone} keyName={selected?.name}
        appsCount={selected ? appsForBrick(selected, mainApps).length : 0} onClose={() => setSheet(null)} onTrouble={startTrouble} />
      <ScanSheet visible={sheet === 'pair'} scanFor="pair" done={pairFound} onClose={() => setSheet(null)} onTrouble={pairTrouble} />
      <BreathingReset visible={breathOpen} onClose={() => setBreathOpen(false)} />
      <OutcomeSheet
        session={sheet ? null : pendingOutcome}
        onSkip={() => { if (pendingOutcome) setDismissedOutcomeId(pendingOutcome.id); setPendingOutcome(null); }}
        onSave={(outcome, next) => {
          if (!pendingOutcome) return;
          db.sessions.saveOutcome(pendingOutcome.id, { outcome, nextStep: next }).then(() => {
            setNextStep(next || null);
            setPendingOutcome(null);
          }).catch(() => {});
        }}
      />
    </Frame>
  );
}
