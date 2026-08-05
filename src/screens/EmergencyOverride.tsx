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
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.card2 }]} onPress={() => navigation.goBack()}>
          <Icon name="x" size={20} color={colors.muted} />
        </TouchableOpacity>

        {step === 'wait' && (
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>Are you sure?</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Ending early will break your streak and let distractions back in.
            </Text>
            <Text style={[styles.countdown, { color: colors.accent }]}>
              Continue in 0{seconds}
            </Text>
          </View>
        )}

        {step === 'hold' && (
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>Still sure?</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Tap and hold the button to confirm.
            </Text>
            <TouchableOpacity 
              activeOpacity={1}
              onPressIn={onHoldIn}
              onPressOut={onHoldOut}
              style={[styles.holdBtn, { backgroundColor: colors.card2 }]}
            >
              <Animated.View style={[styles.holdFill, { backgroundColor: colors.accent, width: holdWidth }]} />
              <Text style={[styles.holdText, { color: colors.text }]}>Hold to end session</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.content}>
            <View style={[styles.checkCircle, { backgroundColor: colors.green }]}>
              <Icon name="check" size={32} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Session over</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              You've earned this break.
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
  scrim: { flex: 1, backgroundColor: 'rgba(15,17,21,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 26, position: 'relative' },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { alignItems: 'center', marginTop: 10 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 30, lineHeight: 21 },
  countdown: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  holdBtn: { width: '100%', height: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdText: { fontSize: 15, fontWeight: '800', zIndex: 1 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  homeBtn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
