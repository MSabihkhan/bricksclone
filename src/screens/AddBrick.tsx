import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, Switch, ScrollView, BackHandler, Alert, AppState } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { nfcService, formatTagId, normalizeTagId } from '../services/nfc';
import { db } from '../db';
import { useFocusStore } from '../state/useFocusStore';
import {
  LOCATIONS, validateBrickName, BRICK_MODES, DURATIONS,
  modeLabel, buildBrickSummary
} from '../utils/onboarding';
import { NfcTag } from '../services/nfc/types';
import { Tag } from '../db/types';
import { describeError } from '../utils/describeError';

type Step = 'scan' | 'detected' | 'name' | 'block' | 'done';

export function AddBrick() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  
  const [step, setStep] = useState<Step>('scan');
  const [registeredTag, setRegisteredTag] = useState<Tag | null>(null);
  
  const [tagId, setTagId] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const [nbName, setNbName] = useState('');
  const [nbLocation, setNbLocation] = useState(LOCATIONS[0].key);
  const [nbMode, setNbMode] = useState<string>('deep');
  const [nbDuration, setNbDuration] = useState('50');
  const [nbStrict, setNbStrict] = useState(true);
  const [globalAppsCount, setGlobalAppsCount] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  // NFC scanning
  useEffect(() => {
    let unmounted = false;
    async function checkNfc() {
      const isSupported = await nfcService.isSupported();
      if (!isSupported) {
        if (!unmounted) setUnsupported(true);
        return;
      }
      const isEnabled = await nfcService.isEnabled();
      if (!isEnabled) {
        if (!unmounted) setDisabled(true);
      }
    }
    checkNfc();
    return () => { unmounted = true; };
  }, []);

  useEffect(() => {
    Promise.all([
      db.blockedApps.listBlockedApps(),
      db.settings.get('strict_mode'),
    ]).then(([apps, strictDefault]) => {
      setGlobalAppsCount(apps.length);
      setNbStrict(strictDefault !== '0');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const supported = await nfcService.isSupported();
      const enabled = supported ? await nfcService.isEnabled() : false;
      setUnsupported(!supported);
      setDisabled(supported && !enabled);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let unmounted = false;
    let unsubscribe: (() => void) | undefined;
    if (step === 'scan' && !disabled && !unsupported) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();

      unsubscribe = nfcService.subscribe(async (tag: NfcTag | null) => {
        if (tag && !unmounted) {
          setTagId(tag.id);
          const existing = await db.tags.getTagById(normalizeTagId(tag.id));
          if (existing && !unmounted) {
            setRegisteredTag(existing);
          } else if (!unmounted) {
            setRegisteredTag(null);
          }
          if (!unmounted) {
            setStep('detected');
          }
        }
      });
    } else {
      pulseAnim.stopAnimation();
    }
    return () => {
      unmounted = true;
      unsubscribe?.();
    };
  }, [step, disabled, unsupported, pulseAnim]);

  // BackHandler to prevent going back after 'done'
  useEffect(() => {
    const onBackPress = () => {
      if (step === 'done') {
        navigation.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step, navigation]);

  const [saving, setSaving] = useState(false);

  const saveBrick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const id = normalizeTagId(tagId);
      const loc = LOCATIONS.find(l => l.key === nbLocation);
      const finalName = nbName.trim() || (loc ? loc.label : 'New Brick');
      await db.tags.registerTag({
        id,
        name: finalName,
        location: nbLocation,
        mode: nbMode,
        categories: {},
        duration: nbDuration,
        strict: nbStrict ? 1 : 0,
        createdAt: Math.floor(Date.now() / 1000)
      });
      setNbName(finalName);
      setStep('done');
    } catch (err) {
      Alert.alert('Could not save this Brick', describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const startFocusingNow = async () => {
    try {
      // Always block the apps the user actually picked. The old path expanded the Brick's
      // categories into a hardcoded package list, which blocked apps that were not installed
      // and missed the ones that were.
      await useFocusStore.getState().startSession(normalizeTagId(tagId));
      navigation.popToTop();
    } catch (err) {
      Alert.alert('Could not start the session', describeError(err));
    }
  };

  const obTint = colors.accent + '24'; // ~14% tint approx

  const renderHeader = (title: string, onBack: () => void) => (
    <View style={styles.headerRow}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="back" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.eyebrow, { color: colors.faint }]}>REGISTER BRICK</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="x" size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );

  if (step === 'scan') {
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    
    return (
      <Screen style={styles.container}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={[styles.closeScan, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="x" size={18} color={colors.muted} />
        </TouchableOpacity>
        
        {disabled || unsupported ? (
          <View style={styles.contentCenter}>
            <View style={[styles.scanIconBox, { backgroundColor: obTint }]}>
              <Icon name="radio" size={44} color={colors.accent} />
            </View>
            <Text style={[styles.scanTitle, { color: colors.text }]}>{disabled ? 'NFC is disabled' : 'NFC unsupported'}</Text>
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent, marginTop: 20 }]} onPress={() => disabled ? nfcService.openSettings() : navigation.goBack()}>
              <Text style={styles.btnPrimaryText}>{disabled ? 'Open NFC settings' : 'Go back'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentCenter}>
            <View style={styles.scannerBox}>
              <Animated.View style={[styles.pulseRing, { borderColor: colors.accent, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
              <View style={[styles.scanIconBox, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
                <Icon name="radio" size={44} color="#fff" />
              </View>
            </View>
            <Text style={[styles.scanTitle, { color: colors.text }]}>Hold your phone{'\n'}near the Brick</Text>
            <Text style={[styles.scanSub, { color: colors.muted }]}>Scanning for your tag…</Text>
          </View>
        )}
      </Screen>
    );
  }

  if (step === 'detected') {
    if (registeredTag) {
      const modeLbl = modeLabel(registeredTag.mode);
      const appsN = Object.values(registeredTag.categories || {}).filter(Boolean).length;
      return (
        <Screen style={styles.container}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={[styles.closeScan, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="x" size={18} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.contentCenter}>
            <View style={[styles.detectedBox, { backgroundColor: '#4DA3FF', shadowColor: '#4DA3FF' }]}>
              <View style={styles.glossyBar} />
              <Icon name="radio" size={46} color="#fff" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4DA3FF' }} />
              <Text style={[styles.detectedEyebrow, { color: '#4DA3FF' }]}>REGISTERED BRICK</Text>
            </View>
            <Text style={[styles.detectedTitle, { color: colors.text, textAlign: 'center' }]}>{registeredTag.name} is already registered</Text>
            <Text style={[styles.detectedId, { color: colors.muted, fontSize: 14 }]}>{modeLbl} · {appsN} apps</Text>
          </View>
          <View style={styles.bottomGap}>
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent }]} onPress={async () => {
               await useFocusStore.getState().startSession(registeredTag.id);
               navigation.popToTop();
            }}>
              <Text style={styles.btnPrimaryText}>Start session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.btnGhostText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </Screen>
      );
    }
    return (
      <Screen style={styles.container}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={[styles.closeScan, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="x" size={18} color={colors.muted} />
        </TouchableOpacity>
        <View style={styles.contentCenter}>
          <View style={[styles.detectedBox, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
            <View style={styles.glossyBar} />
            <Icon name="radio" size={46} color="#fff" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.green }} />
            <Text style={[styles.detectedEyebrow, { color: colors.green }]}>NEW BRICK DETECTED</Text>
          </View>
          <Text style={[styles.detectedTitle, { color: colors.text }]}>Unregistered Brick</Text>
          <Text style={[styles.detectedId, { color: colors.muted }]}>ID · {formatTagId(tagId)}</Text>
        </View>
        <View style={styles.bottomGap}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent }]} onPress={() => setStep('name')}>
            <Text style={styles.btnPrimaryText}>Register this Brick</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.btnGhostText, { color: colors.text }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (step === 'name') {
    const locIcon = LOCATIONS.find(l => l.key === nbLocation)?.icon || 'radio';
    const canContinue = validateBrickName(nbName);
    return (
      <Screen style={{ paddingHorizontal: 0 }}>
        {renderHeader('Step 1 of 2 · Name', () => setStep('detected'))}
        <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scrollPad}>
          <View style={[styles.nameIconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
            <Icon name={locIcon} size={34} color={colors.accent} />
          </View>
          <Text style={[styles.title27, { color: colors.text }]}>Name this Brick</Text>
          <Text style={[styles.sub14, { color: colors.muted }]}>Where does it live? You'll tap it here to start focusing.</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Desk"
            placeholderTextColor={colors.muted}
            value={nbName}
            onChangeText={setNbName}
          />
          
          <Text style={[styles.label11, { color: colors.faint }]}>QUICK PICK</Text>
          <View style={styles.grid3}>
            {LOCATIONS.map(loc => {
              const on = loc.key === nbLocation;
              return (
                <TouchableOpacity key={loc.key} style={[styles.locBtn, { backgroundColor: on ? colors.accent : colors.card, borderColor: on ? colors.accent : colors.border }]} onPress={() => {
                  setNbLocation(loc.key);
                  if (!nbName) setNbName(loc.label);
                }}>
                  <Icon name={loc.icon} size={20} color={on ? '#fff' : colors.muted} />
                  <Text style={[styles.locLabel, { color: on ? '#fff' : colors.muted }]}>{loc.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={[styles.bottomPad, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <TouchableOpacity 
            style={[styles.btnPrimary, { backgroundColor: canContinue ? colors.accent : colors.card2 }]} 
            disabled={!canContinue} 
            onPress={() => setStep('block')}
          >
            <Text style={[styles.btnPrimaryText, { color: canContinue ? '#fff' : colors.faint }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (step === 'block') {
    const activeName = nbName.trim() || 'New Brick';
    return (
      <Screen style={{ paddingHorizontal: 0 }}>
        {renderHeader('Step 2 of 2 · Focus settings', () => setStep('name'))}
        <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scrollPad}>
          <Text style={[styles.title23, { color: colors.text }]}>Configure <Text style={{ color: colors.accent }}>{activeName}</Text></Text>
          <Text style={[styles.sub14, { color: colors.muted }]}>{globalAppsCount} globally selected apps will be blocked. You can change them in Settings.</Text>
          
          <View style={styles.modeList}>
            {BRICK_MODES.map(m => {
              const on = m.key === nbMode;
              return (
                <TouchableOpacity key={m.key} style={[styles.modeRow, { backgroundColor: on ? obTint : colors.card, borderColor: on ? colors.accent : colors.border }]} onPress={() => setNbMode(m.key)}>
                  <View style={[styles.modeDot, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : 'transparent' }]}>
                    {on && <Icon name="check" size={13} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modeTitle, { color: colors.text }]}>{m.label}</Text>
                    <Text style={[styles.modeDesc, { color: colors.muted }]}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <Text style={[styles.label11, { color: colors.faint }]}>SESSION LENGTH</Text>
          <View style={styles.durGrid}>
            {DURATIONS.map(d => {
              const on = nbDuration === d.key;
              return (
                <TouchableOpacity key={d.key} style={[styles.durBtn, { backgroundColor: on ? colors.accent : colors.card, borderColor: on ? colors.accent : colors.border }]} onPress={() => setNbDuration(d.key)}>
                  <Text style={[styles.durLabel, { color: on ? '#fff' : colors.muted }]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={[styles.strictRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.strictIconBox, { backgroundColor: colors.card2 }]}>
              <Icon name="shield" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.strictTitle, { color: colors.text }]}>Strict Mode</Text>
              <Text style={[styles.strictSub, { color: colors.muted }]}>Can't unlock until the session ends</Text>
            </View>
            <Switch accessibilityLabel="Strict Mode for this Brick" value={nbStrict} onValueChange={setNbStrict} trackColor={{ true: colors.accent }} />
          </View>
        </ScrollView>
        <View style={[styles.bottomPad, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
            disabled={saving}
            onPress={saveBrick}
          >
            <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Create Brick'}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (step === 'done') {
    const summaryChips = buildBrickSummary(nbMode, globalAppsCount, nbDuration);
    return (
      <Screen style={styles.container}>
        <View style={styles.contentCenter}>
          <View style={[styles.doneCheck, { backgroundColor: colors.green, shadowColor: colors.green }]}>
            <Icon name="check" size={46} color="#fff" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>"{nbName}" is ready</Text>
          <Text style={[styles.doneSub, { color: colors.muted }]}>Tap this Brick anytime to start a {modeLabel(nbMode)} session.</Text>
          <View style={styles.chipsWrap}>
            {summaryChips.map((sc, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Icon name={sc.icon} size={14} color={colors.accent} />
                <Text style={[styles.chipLabel, { color: colors.text }]}>{sc.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.bottomGap}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent }]} onPress={startFocusingNow}>
            <Text style={styles.btnPrimaryText}>Start focusing now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.btnGhostText, { color: colors.text }]}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
  closeScan: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  contentCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerBox: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 48 },
  pulseRing: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1 },
  scanIconBox: { width: 98, height: 98, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 18 }, shadowRadius: 46, shadowOpacity: 0.5, elevation: 12 },
  scanTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.03 * 26, textAlign: 'center', lineHeight: 30, marginBottom: 12 },
  scanSub: { fontSize: 15, fontWeight: '500' },
  
  detectedBox: { width: 134, height: 134, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowOffset: { width: 0, height: 20 }, shadowRadius: 52, shadowOpacity: 0.4, elevation: 12, overflow: 'hidden' },
  glossyBar: { position: 'absolute', top: 16, left: 18, right: 18, height: 24, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)' },
  detectedEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.16 * 11 },
  detectedTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.03 * 26, marginBottom: 8 },
  detectedId: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  
  bottomGap: { gap: 12 },
  btnPrimary: { width: '100%', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnGhost: { width: '100%', height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { fontSize: 15, fontWeight: '800' },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 58, paddingBottom: 14 },
  circleBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.14 * 11 },
  headerTitle: { fontSize: 15, fontWeight: '800', marginTop: 1 },

  scrollFlex: { flex: 1 },
  scrollPad: { paddingHorizontal: 26, paddingBottom: 26, paddingTop: 10 },
  bottomPad: { paddingHorizontal: 26, paddingBottom: 30, paddingTop: 14 },

  nameIconBox: { width: 76, height: 76, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title27: { fontSize: 27, fontWeight: '800', letterSpacing: -0.03 * 27, marginBottom: 8 },
  sub14: { fontSize: 14, fontWeight: '500', marginBottom: 22, lineHeight: 20 },
  input: { width: '100%', height: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, fontSize: 20, fontWeight: '800' },
  
  label11: { fontSize: 11, fontWeight: '800', letterSpacing: 0.14 * 11, marginTop: 24, marginBottom: 12 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  locBtn: { width: '31%', paddingVertical: 13, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 7 },
  locLabel: { fontSize: 11, fontWeight: '700' },
  
  title23: { fontSize: 23, fontWeight: '800', letterSpacing: -0.03 * 23, marginBottom: 20 },
  modeList: { gap: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, gap: 13 },
  modeDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 15, fontWeight: '800' },
  modeDesc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  catBtn: { width: '31%', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 15, borderWidth: 1, alignItems: 'center', gap: 8 },
  
  durGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durBtn: { flexGrow: 1, flexBasis: '40%', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, alignItems: 'center' },
  durLabel: { fontSize: 13, fontWeight: '700' },

  strictRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginTop: 16, gap: 14 },
  strictIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  strictTitle: { fontSize: 14, fontWeight: '700' },
  strictSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },

  doneCheck: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 26, shadowOffset: { width: 0, height: 18 }, shadowRadius: 46, shadowOpacity: 0.5, elevation: 12 },
  doneTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.03 * 28, textAlign: 'center', marginBottom: 10 },
  doneSub: { fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22.5, paddingHorizontal: 20, marginBottom: 26 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1 },
  chipLabel: { fontSize: 13, fontWeight: '700' },
});
