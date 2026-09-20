import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../components/Icon';
import { useFocusStore } from '../state/useFocusStore';
import { WAIT_SECONDS, HOLD_MS, OverrideStep, getNextStep } from './emergencyOverrideModel';

export function EmergencyOverride() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { endSession } = useFocusStore();

  const [step, setStep] = useState<OverrideStep>('wait');
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const holdAnim = useRef(new Animated.Value(0)).current;

  // Step 1 timer
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
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        setStep(getNextStep('hold'));
      }
    });
  };

  const onHoldOut = () => {
    if (step !== 'hold') return;
    holdAnim.stopAnimation();
    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  const onReturnHome = async () => {
    await endSession('override');
    navigation.goBack();
  };

  const holdWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.scrim}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.faint }]} />
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.card2 }]} onPress={() => navigation.goBack()}>
          <Icon name="x" size={20} color={colors.muted} />
        </TouchableOpacity>

        {step === 'wait' && (
          <View style={styles.content}>
            <Text style={[styles.kicker, { color: colors.faint }]}>FOCUS IS STILL ACTIVE</Text>
            <Text style={[styles.title, { color: colors.text }]}>End session early?</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Blocked apps will be available again. Your session will be recorded as ended early.
            </Text>
            <TouchableOpacity style={[styles.keepBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.goBack()}>
              <Text style={styles.keepText}>Keep focusing</Text>
            </TouchableOpacity>
            <Text style={[styles.countdown, { color: colors.muted }]}>
              END SESSION AVAILABLE IN 0{seconds}
            </Text>
          </View>
        )}

        {step === 'hold' && (
          <View style={styles.content}>
            <Text style={[styles.kicker, { color: colors.faint }]}>CONFIRM ENDING</Text>
            <Text style={[styles.title, { color: colors.text }]}>Hold to end focus</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Keep holding until the bar is full. This prevents an accidental tap.
            </Text>
            <TouchableOpacity 
              activeOpacity={1}
              onPressIn={onHoldIn}
              onPressOut={onHoldOut}
              style={[styles.holdBtn, { backgroundColor: colors.card2 }]}
            >
              <Animated.View style={[styles.holdFill, { backgroundColor: colors.accent, width: holdWidth }]} />
              <Text style={styles.holdText}>Hold to end session</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.content}>
            <View style={[styles.checkCircle, { backgroundColor: colors.card2 }]}>
              <Icon name="check" size={32} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Session ended</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Your focus time has been saved.
            </Text>
            <TouchableOpacity style={[styles.homeBtn, { backgroundColor: colors.accent }]} onPress={onReturnHome}>
              <Text style={styles.homeBtnText}>Return home</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  card: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34, position: 'relative' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.5, marginBottom: 20 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { alignItems: 'stretch', marginTop: 8 },
  kicker: { fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.6, marginBottom: 12, textAlign: 'center' },
  title: { fontFamily: 'BricolageGrotesque', fontSize: 30, fontWeight: '400', letterSpacing: -1.6, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, fontWeight: '400', textAlign: 'center', marginBottom: 26, lineHeight: 21, paddingHorizontal: 10 },
  keepBtn: { height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  keepText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  countdown: { fontFamily: 'IBMPlexMono-Regular', fontSize: 10, letterSpacing: 0.3, textAlign: 'center', marginTop: 18 },
  holdBtn: { width: '100%', height: 56, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdText: { color: '#fff', fontSize: 15, fontWeight: '700', zIndex: 1 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  homeBtn: { width: '100%', height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
