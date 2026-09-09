import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, BackHandler } from 'react-native';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useFocusStore } from '../state/useFocusStore';
import { Icon } from '../components/Icon';
import { RingProgress } from '../components/RingProgress';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { db } from '../db';
import { modeLabel } from '../utils/onboarding';

export function FocusLock() {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { timerTick, activeSession, liveBlocked, endSession } = useFocusStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  const [plannedSec, setPlannedSec] = useState<number | null>(50 * 60);
  const [modeName, setModeName] = useState('Deep Work');

  useEffect(() => {
    let active = true;
    const fetchTag = async () => {
      if (activeSession?.tagId) {
        const tag = await db.tags.getTagById(activeSession.tagId);
        if (active && tag) {
          setModeName(modeLabel(tag.mode));
          if (tag.duration === 'inf') {
            setPlannedSec(null);
          } else {
            setPlannedSec((Number(tag.duration) || 50) * 60);
          }
          return;
        }
      }
      if (active) {
        setPlannedSec(50 * 60);
        setModeName('Focus');
      }
    };
    fetchTag();
    return () => { active = false; };
  }, [activeSession?.tagId]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSession?.strict === 1) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => backHandler.remove();
    }
  }, [activeSession?.strict]);

  // timerTick only drives the re-render; the value itself always comes from the wall clock
  // so the display survives the app being backgrounded, killed, or the store rehydrating.
  void timerTick;
  const elapsed = activeSession ? Math.max(0, Math.floor(Date.now() / 1000) - activeSession.startTime) : 0;
  const isInf = plannedSec === null;
  const progress = isInf ? 0 : Math.min(elapsed / (plannedSec || 1), 1);
  const remainingSec = isInf ? 0 : Math.max((plannedSec || 0) - elapsed, 0);

  const formatClock = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    if (activeSession?.strict === 1) {
      navigation.navigate('ModalStack', { screen: 'EmergencyOverride' });
    } else {
      endSession('override');
    }
  };

  const rScale = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  const rOp = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0, 0.5] });

  return (
    <View style={styles.container}>
      <View style={styles.glow} />

      <View style={styles.header}>
        <Icon name="lock" size={15} color={theme.colors.accent} />
        <Text style={styles.headerText}>FOCUS LOCKED</Text>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: rScale }], opacity: rOp }]} />
        <RingProgress size={230} stroke={6} color={theme.colors.accent} trackColor={theme.colors.track} progress={progress}>
          <Text style={styles.deepWork}>{modeName.toUpperCase()}</Text>
          <Text style={styles.timer}>{formatClock(elapsed)}</Text>
          <Text style={styles.remaining}>
            {isInf
              ? `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m elapsed`
              : `${Math.floor(remainingSec / 3600)}h ${Math.floor((remainingSec % 3600) / 60)}m remaining`}
          </Text>
        </RingProgress>
      </View>

      <View style={styles.pill}>
        <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
        <Text style={styles.pillText}>{liveBlocked} distractions blocked</Text>
      </View>

      <Text style={styles.tapHint}>Tap your Brick to unlock</Text>

      <View style={styles.bottom}>
        <Button label="End Session" onPress={handleEnd} variant="ghost" icon="stop" iconColor={theme.colors.text} />
        <Text style={styles.note}>
          {activeSession?.strict === 1
            ? 'Strict Mode is on. Ending early will break your streak.'
            : 'You can end this session at any time.'}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    paddingTop: 88,
    paddingBottom: 40,
    paddingHorizontal: 30,
    zIndex: 10,
  },
  glow: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: theme.colors.accent,
    opacity: 0.16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: theme.colors.accent,
  },
  center: {
    position: 'relative',
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 14, left: 14, right: 14, bottom: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  deepWork: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.54,
    color: theme.colors.muted,
  },
  timer: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2.08,
    color: theme.colors.text,
    lineHeight: 52,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  remaining: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.muted,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 99,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 34,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tapHint: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.2,
  },
  bottom: {
    marginTop: 'auto',
    width: '100%',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.faint,
    fontWeight: '600',
    marginTop: 14,
  }
});
