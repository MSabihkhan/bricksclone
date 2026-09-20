import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useFocusStore } from '../state/useFocusStore';
import { Icon } from '../components/Icon';
import { BrickMark } from '../components/BrickMark';
import { Button } from '../components/Button';
import { db } from '../db';
import { modeLabel } from '../utils/onboarding';
import { BlockingModule } from '../native/BlockingModule';

export function FocusLock() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { timerTick, activeSession, endSession, enforcementHealth, refreshEnforcementHealth } = useFocusStore();
  const autoEndStarted = useRef(false);
  const [plannedSec, setPlannedSec] = useState<number | null>(null);
  const [modeName, setModeName] = useState('Focus');
  const [brickName, setBrickName] = useState('Brick');
  const [appLabels, setAppLabels] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      activeSession?.tagId ? db.tags.getTagById(activeSession.tagId) : Promise.resolve(undefined),
      db.blockedApps.listBlockedApps(),
    ]).then(([tag, apps]) => {
      if (!mounted) return;
      setPlannedSec(activeSession?.plannedEndTime ? Math.max(1, activeSession.plannedEndTime - activeSession.startTime) : null);
      if (tag) {
        setModeName(modeLabel(tag.mode));
        setBrickName(tag.name);
      }
      const labels = new Map(apps.map(app => [app.packageName, app.label]));
      setAppLabels((activeSession?.apps ?? []).map(pkg => labels.get(pkg) ?? pkg.split('.').pop() ?? pkg));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [activeSession]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    refreshEnforcementHealth().catch(() => {});
    const id = setInterval(refreshEnforcementHealth, 5000);
    return () => clearInterval(id);
  }, [refreshEnforcementHealth]);

  const elapsed = activeSession ? Math.max(0, Math.floor(Date.now() / 1000) - activeSession.startTime + timerTick * 0) : 0;
  const isBrickOnly = plannedSec === null;
  const remaining = isBrickOnly ? 0 : Math.max((plannedSec ?? 0) - elapsed, 0);
  const progress = isBrickOnly ? 0 : Math.min(elapsed / Math.max(1, plannedSec ?? 1), 1);

  useEffect(() => {
    if (isBrickOnly || remaining > 0 || !activeSession || autoEndStarted.current) return;
    autoEndStarted.current = true;
    endSession('timer').catch(error => {
      autoEndStarted.current = false;
      Alert.alert('Could not finish the session', error instanceof Error ? error.message : String(error));
    });
  }, [activeSession, endSession, isBrickOnly, remaining]);

  const formatClock = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const endEarly = () => navigation.navigate('ModalStack', { screen: 'EmergencyOverride' });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Icon name="lock" size={13} color={theme.colors.text} />
          <Text style={styles.identityText}>{modeName}</Text>
        </View>
        <View style={styles.identity}>
          <BrickMark size={28} />
          <Text style={styles.identityText}>{brickName}</Text>
        </View>
      </View>

      {enforcementHealth === 'degraded' && (
        <View style={styles.warning} accessibilityRole="alert">
          <View style={styles.warningTitleRow}>
            <Icon name="info" size={17} color={theme.colors.text} />
            <Text style={styles.warningTitle}>Blocking has stopped</Text>
          </View>
          <Text style={styles.warningText}>Accessibility or usage access was switched off, so blocked apps can open. Your session is still running.</Text>
          <Button label="Turn it back on" onPress={() => BlockingModule.requestAccessibility().catch(() => {})} />
        </View>
      )}

      <View style={styles.timerArea}>
        <Text style={styles.timer}>{formatClock(isBrickOnly ? elapsed : remaining)}</Text>
        <Text style={styles.timerCaption}>{isBrickOnly ? 'Elapsed · ends with Brick' : 'Remaining'}</Text>
        {!isBrickOnly && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.dataLabel}>{formatClock(elapsed)} IN</Text>
              <Text style={styles.dataLabel}>{formatClock(plannedSec ?? 0)}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.appsArea}>
        <Text style={styles.sectionTitle}>Held closed</Text>
        <View style={styles.chips}>
          {appLabels.map(label => <View key={label} style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>)}
          {appLabels.length === 0 && <Text style={styles.emptyText}>No apps selected</Text>}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.brickAction}>
          <Icon name="radio" size={18} color={theme.colors.text} />
          <Text style={styles.brickActionText}>Tap {brickName} to finish</Text>
        </View>
        {!isBrickOnly && (
          <Pressable accessibilityRole="button" onPress={endEarly} style={styles.endEarly}>
            <Text style={styles.endEarlyText}>End early</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  identityText: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  warning: { backgroundColor: theme.mode === 'dark' ? '#332919' : '#FFF4DD', borderColor: theme.mode === 'dark' ? '#5A4723' : '#E9D6AC', borderWidth: 1, borderRadius: 20, padding: 16, gap: 12, marginTop: 12 },
  warningTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  warningTitle: { color: theme.mode === 'dark' ? '#F1CB78' : '#6D531B', fontFamily: 'BricolageGrotesque', fontSize: 21, letterSpacing: -0.7 },
  warningText: { color: theme.mode === 'dark' ? '#D5B872' : '#7B642E', fontSize: 13, lineHeight: 19 },
  timerArea: { marginTop: 48 },
  timer: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 46, letterSpacing: -2 },
  timerCaption: { color: theme.colors.text, fontSize: 14, marginTop: 10 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.colors.track, overflow: 'hidden', marginTop: 30 },
  progressFill: { height: 4, backgroundColor: theme.colors.accent, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dataLabel: { color: theme.colors.text, fontFamily: 'IBMPlexMono-Regular', fontSize: 11 },
  appsArea: { marginTop: 44 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: theme.colors.card2, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  chipText: { color: theme.colors.text, fontSize: 12 },
  emptyText: { color: theme.colors.muted, fontSize: 13 },
  bottom: { marginTop: 'auto', gap: 8 },
  brickAction: { height: 56, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  brickActionText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  endEarly: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  endEarlyText: { color: theme.colors.muted, fontSize: 13 },
});
