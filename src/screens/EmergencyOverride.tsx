import React, { useState, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusStore } from '../state/useFocusStore';
import { WAIT_SECONDS, HOLD_MS, OverrideStep, getNextStep } from './emergencyOverrideModel';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, Frame, Glyph, PillButton, RadialBg, RoundButton } from '../ui/kit';

/** End early: wait, then hold to confirm (Fasla Redesign v2 language). */
export function EmergencyOverride() {
  const pal = usePalette();
  const navigation = useNavigation();
  const { endSession } = useFocusStore();

  const [step, setStep] = useState<OverrideStep>('wait');
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const holdAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step !== 'wait') return;
    const timer = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timer);
          setStep(getNextStep('wait'));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const onHoldIn = () => {
    if (step !== 'hold') return;
    Animated.timing(holdAnim, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setStep(getNextStep('hold'));
    });
  };

  const onHoldOut = () => {
    if (step !== 'hold') return;
    holdAnim.stopAnimation();
    Animated.timing(holdAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const onReturnHome = async () => {
    await endSession('override');
    navigation.goBack();
  };

  const holdWidth = holdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const title = { marginTop: 12, fontFamily: fonts.display, fontSize: 36, letterSpacing: -1.44, lineHeight: 38, color: pal.cF5F5F2, textAlign: 'center' as const };
  const body = { marginTop: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0, textAlign: 'center' as const, maxWidth: 300 };

  return (
    <Frame gutter={24} bg={<RadialBg spec={{ cx: 0.5, cy: 0.3, rx: 0.8, ry: 0.45, stops: [[pal.c241012, 0], [pal.c0B0B0D, 0.7], [pal.c0B0B0D, 1]] }} />}>
      <View style={{ alignItems: 'flex-end' }}>
        {step !== 'done' ? <RoundButton icon="close" label="Keep focusing" onPress={() => navigation.goBack()} /> : <View style={{ height: 44 }} />}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: step === 'done' ? RED : pal.c2A1012, borderWidth: step === 'done' ? 0 : 1, borderColor: pal.c5A1C1F, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Glyph name={step === 'done' ? 'check' : step === 'hold' ? 'lock' : 'timer'} size={30} color={step === 'done' ? '#FFFFFF' : pal.cFF5A5F} width={step === 'done' ? 3 : 2} />
        </View>
        {step === 'wait' ? (
          <>
            <Eyebrow color={pal.cFF8A8D} spacing={0.2}>FOCUS IS STILL ACTIVE</Eyebrow>
            <Text style={title} accessibilityRole="header">End session early?</Text>
            <Text style={body}>Blocked apps will be available again. Your session will be recorded as ended early.</Text>
          </>
        ) : step === 'hold' ? (
          <>
            <Eyebrow color={pal.cFF8A8D} spacing={0.2}>CONFIRM ENDING</Eyebrow>
            <Text style={title} accessibilityRole="header">Hold to end focus</Text>
            <Text style={body}>Keep holding until the bar is full. This prevents an accidental tap.</Text>
          </>
        ) : (
          <>
            <Text style={title} accessibilityRole="header">Session ended</Text>
            <Text style={body}>Your focus time has been saved.</Text>
          </>
        )}
      </View>

      <View style={{ paddingBottom: 18, gap: 12 }}>
        {step === 'wait' ? (
          <>
            <PillButton label="Keep focusing" onPress={() => navigation.goBack()} />
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.2, color: pal.c85858C, textAlign: 'center' }} accessibilityLiveRegion="polite">
              END SESSION AVAILABLE IN {String(seconds).padStart(2, '0')}
            </Text>
          </>
        ) : step === 'hold' ? (
          <>
            <Pressable onPressIn={onHoldIn} onPressOut={onHoldOut} accessibilityRole="button" accessibilityLabel="Hold to end session" accessibilityHint="Press and hold for three seconds"
              style={{ height: 58, borderRadius: 999, overflow: 'hidden', backgroundColor: pal.c26262B, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: holdWidth, backgroundColor: RED }} />
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#FFFFFF' }}>Hold to end session</Text>
            </Pressable>
            <PillButton label="Keep focusing" kind="ghost" height={44} onPress={() => navigation.goBack()} textStyle={{ fontSize: 15 }} />
          </>
        ) : (
          <PillButton label="Return home" onPress={() => { onReturnHome().catch(() => {}); }} />
        )}
      </View>
    </Frame>
  );
}
