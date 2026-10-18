import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { breathAt, breathsFor, formatClock, RESET_MINUTES } from '../features/breathing';
import { Eyebrow, PillButton, RadialBg, RoundButton, Segmented, showToast } from '../ui/kit';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Breathe setup → Breathing (Fasla Redesign v2). */
export function BreathingReset({ visible, onClose }: Props) {
  const pal = usePalette();
  const reduce = useReducedMotion();
  const [minutes, setMinutes] = useState<number>(2);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const scale = useRef(new Animated.Value(0.55)).current;
  const lastBreath = useRef(0);

  useEffect(() => { if (!visible) { setStartedAt(null); lastBreath.current = 0; scale.setValue(0.55); } }, [scale, visible]);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [startedAt]);

  // One native loop per breath: 2 s in, 1 s top-up, 4 s out.
  useEffect(() => {
    if (startedAt === null) return;
    if (reduce) { scale.setValue(0.8); return; }
    scale.setValue(0.55);
    const breath = Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.55, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    ]);
    const run = Animated.loop(breath, { iterations: breathsFor(minutes) });
    run.start();
    return () => run.stop();
  }, [minutes, reduce, scale, startedAt]);

  const state = startedAt === null ? null : breathAt(now - startedAt, minutes);

  useEffect(() => {
    if (!state) return;
    if (state.done) { onClose(); showToast('Settled. Ready when you are.'); return; }
    if (state.breath !== lastBreath.current) { lastBreath.current = state.breath; Vibration.vibrate(25); }
  }, [onClose, state]);

  const begin = () => { lastBreath.current = 0; setNow(Date.now()); setStartedAt(Date.now()); };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: pal.c0B0B0D }}>
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 }}>
          {state === null ? (
            <>
              <RoundButton icon="back" label="Back" onPress={onClose} />
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
                  <RadialBg spec={{ cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5, stops: [[pal.c3A1214, 0], [pal.c1A0D0E, 0.6], [pal.c0B0B0D, 0.72], [pal.c0B0B0D, 1]] }} radius={75} />
                  <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, borderColor: '#E5242B', backgroundColor: 'rgba(229,36,43,0.12)' }} />
                </View>
                <Eyebrow color={pal.cFF5A5F} spacing={0.2} style={{ marginTop: 22 }}>BREATHING RESET</Eyebrow>
                <Text style={{ marginTop: 12, fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.02, lineHeight: 36, color: pal.cF5F5F2, textAlign: 'center' }} accessibilityRole="header">Two breaths in, one long breath out.</Text>
                <Text style={{ marginTop: 14, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0, textAlign: 'center' }}>In through your nose, one more short sip of air, then let it all out slowly through your mouth.</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Segmented options={RESET_MINUTES.map(m => ({ value: String(m), label: `${m} min` }))} value={String(minutes)} onChange={v => setMinutes(Number(v))} height={46} />
              <PillButton label="Begin" onPress={begin} style={{ marginTop: 12 }} />
              <Text style={{ marginTop: 14, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: pal.c6E6E75, textAlign: 'center' }}>Stop if you feel lightheaded. This is a relaxation exercise, not medical treatment.</Text>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: pal.c9A9AA0 }}>{formatClock(state.secondsLeft)} left</Text>
                <RoundButton icon="close" label="Close breathing reset" onPress={onClose} kind="solid" iconSize={16} />
              </View>
              <View style={{ width: 320, height: 320, marginTop: 60, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 160, borderWidth: 1, borderStyle: 'dashed', borderColor: pal.c2A2A2F }} />
                <Animated.View style={{ width: 300, height: 300, borderRadius: 150, borderWidth: 1.5, borderColor: '#E5242B', overflow: 'hidden', transform: [{ scale }] }}>
                  <RadialBg spec={{ cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5, stops: [[pal.c4A1215, 0], [pal.c2A0E10, 0.55], [pal.c1A0B0C, 1]] }} radius={150} />
                </Animated.View>
              </View>
              <Text style={{ marginTop: 56, fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.96, color: pal.cF5F5F2 }} accessibilityLiveRegion="polite">{state.cue}</Text>
              <Text style={{ marginTop: 10, fontFamily: fonts.mono, fontSize: 13, color: pal.c9A9AA0 }}>Breath {Math.min(state.breath, state.breaths)} of {state.breaths}</Text>
              <View style={{ flex: 1 }} />
              <PillButton label="Stop" onPress={onClose} kind="outline" height={52} style={{ alignSelf: 'center', minWidth: 128 }} textStyle={{ fontSize: 15 }} />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
