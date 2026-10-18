import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { PillButton, Sheet, Glyph } from '../ui/kit';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { nfcService } from '../services/nfc';

export type ScanFor = 'start' | 'end' | 'pair';

interface Props {
  visible: boolean;
  scanFor: ScanFor;
  /** The key was read; shows the success state. The caller decides what happens next. */
  done: boolean;
  keyName?: string;
  appsCount?: number;
  onClose: () => void;
  /** "Having trouble scanning?" */
  onTrouble: () => void;
}

/**
 * "Ready to scan": waits for the key tap. NFC itself is handled by whoever owns the session
 * (Home's listener) — this sheet only shows what's happening and offers a way out.
 */
export function ScanSheet({ visible, scanFor, done, keyName = 'your key', appsCount = 0, onClose, onTrouble }: Props) {
  const pal = usePalette();
  const reduce = useReducedMotion();
  const [nfcOff, setNfcOff] = useState(false);
  const ring = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Promise.all([nfcService.isSupported(), nfcService.isEnabled()]).then(([s, e]) => setNfcOff(!s || !e)).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!visible || done || reduce) return;
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [done, reduce, ring, visible]);

  useEffect(() => {
    if (!done) { pop.setValue(0); return; }
    if (reduce) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [done, pop, reduce]);

  const title = done ? (scanFor === 'start' ? 'Locked in' : scanFor === 'pair' ? 'Key found' : 'Unlocked') : 'Ready to scan';
  const sub = done
    ? scanFor === 'start' ? `${appsCount} apps held closed` : scanFor === 'pair' ? 'Let’s give it a name.' : 'Nice work. Apps are back.'
    : nfcOff ? 'NFC is off. Turn it on to tap your key.'
    : scanFor === 'pair' ? 'Hold your phone to the new key' : `Hold the top of your phone near ${keyName}`;
  const status = done ? 'CARD DETECTED' : nfcOff ? 'NFC IS OFF' : 'LISTENING FOR NFC';

  const ringStyle = (offset: number) => {
    const t = Animated.modulo(Animated.add(ring, offset), 1);
    return {
      position: 'absolute' as const, top: 40, left: 40, right: 40, bottom: 40, borderRadius: 60, borderWidth: 1.5, borderColor: RED,
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
    };
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ marginTop: 22, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.84, color: pal.cF5F5F2 }} accessibilityLiveRegion="polite">{title}</Text>
        <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 15, color: pal.c9A9AA0, textAlign: 'center' }}>{sub}</Text>
        <View style={{ width: 200, height: 200, marginTop: 20, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
          {!done ? (
            <>
              {!reduce && !nfcOff ? <><Animated.View style={ringStyle(0)} /><Animated.View style={ringStyle(0.5)} /></> : null}
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: pal.c26262B, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={34} height={44} viewBox="0 0 34 44" fill="none" stroke={pal.cF5F5F2} strokeWidth={2.2}>
                  <Rect x={3} y={2} width={28} height={40} rx={6} />
                  <Path d="M13 7h8" strokeLinecap="round" />
                </Svg>
              </View>
            </>
          ) : (
            <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
              <Glyph name="check" size={40} color="#FFFFFF" width={2.6} />
            </Animated.View>
          )}
        </View>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.76, color: pal.cFF5A5F }}>{status}</Text>
        <Pressable onPress={nfcOff && !done ? () => nfcService.openSettings().catch(() => {}) : onTrouble} hitSlop={8} accessibilityRole="button" style={{ marginTop: 18 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.cD8D8DC, textDecorationLine: 'underline' }}>{nfcOff && !done ? 'Open NFC settings' : 'Having trouble scanning?'}</Text>
        </Pressable>
      </View>
      <PillButton label="Cancel" onPress={onClose} kind="muted" height={56} style={{ marginTop: 16 }} textStyle={{ fontFamily: fonts.bodyMedium }} />
    </Sheet>
  );
}
