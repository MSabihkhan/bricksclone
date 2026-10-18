import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  canBlink, CARD_ASPECT, CARD_EDGE, CARD_RADIUS, CARD_VIEWBOX, EYE_STROKE, FACE_INK, facePaths,
  MOUTH_STROKE, PERSONA, PersonaFace,
} from '../features/persona';

const FRONT = require('../assets/card/front.png');
const BACK = require('../assets/card/back.png');

interface Props {
  width: number;
  /** null = the plain printed card, no face (persona switched off, or the back side). */
  face?: PersonaFace | null;
  /** Show the state's line in a bubble above the card. */
  say?: boolean;
  side?: 'front' | 'back';
  style?: ViewStyle;
}

/**
 * The key as it is printed: the card's own artwork (taken from its 3D model), its white
 * PVC edge, and — when the persona is on — a face drawn in the wordmark's ink.
 * All motion is transform/opacity on the native driver, so it stays smooth on low-end phones.
 */
export function BrickCard({ width, face = 'idle', say = false, side = 'front', style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const height = Math.round(width * CARD_ASPECT);
  const radius = width * CARD_RADIUS;
  const edge = Math.max(1, Math.round(width * CARD_EDGE));

  const motion = useRef(new Animated.Value(0)).current;   // drives the state's movement
  const faceOpacity = useRef(new Animated.Value(1)).current;   // dips while one face swaps for the next
  const bubble = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<PersonaFace | null>(face);
  const [blinking, setBlinking] = useState(false);
  const spec = shown ? PERSONA[shown] : null;

  // Swap faces behind a quick dip, so the change reads as the card reacting.
  useEffect(() => {
    if (face === shown) return;
    if (reduceMotion || shown === null || face === null) { setShown(face); return; }
    Animated.timing(faceOpacity, { toValue: 0, duration: 70, useNativeDriver: true }).start(() => {
      setShown(face);
      Animated.timing(faceOpacity, { toValue: 1, duration: 110, useNativeDriver: true }).start();
    });
  }, [faceOpacity, face, reduceMotion, shown]);

  // Each state's movement. Reduced motion: none at all.
  useEffect(() => {
    motion.stopAnimation();
    motion.setValue(0);
    if (reduceMotion || !spec || spec.motion === 'none') return;
    const run = spec.motion === 'float'
      ? Animated.loop(Animated.sequence([
          Animated.timing(motion, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(motion, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]))
      : Animated.timing(motion, { toValue: 1, duration: spec.motion === 'hop' ? 760 : spec.motion === 'tilt' ? 420 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [motion, reduceMotion, spec]);

  // Idle blink every few seconds.
  useEffect(() => {
    if (!shown || !canBlink(shown, reduceMotion)) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        timer = setTimeout(() => { setBlinking(false); schedule(); }, 130);
      }, 3200 + Math.random() * 2400);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduceMotion, shown]);

  const showLine = say && !!spec?.line;
  useEffect(() => {
    if (reduceMotion) { bubble.setValue(showLine ? 1 : 0); return; }
    Animated.timing(bubble, { toValue: showLine ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [bubble, reduceMotion, showLine]);

  const transform = useMemo(() => {
    switch (spec?.motion) {
      case 'float': return [
        { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
        { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-1deg'] }) },
      ];
      case 'lockin': return [{ scale: motion.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [1, 0.93, 1.04, 1] }) }];
      case 'hop': return [
        { translateY: motion.interpolate({ inputRange: [0, 0.3, 0.55, 0.75, 1], outputRange: [0, -16, 0, -6, 0] }) },
        { rotate: motion.interpolate({ inputRange: [0, 0.3, 0.75, 1], outputRange: ['0deg', '-4deg', '2deg', '0deg'] }) },
      ];
      case 'tilt': return [
        { translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
        { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) },
      ];
      default: return [];
    }
  }, [motion, spec?.motion]);

  const paths = shown ? facePaths(shown, blinking) : null;

  return (
    <View style={[{ width, height: height + edge }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: bubble, transform: [{ translateY: bubble.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]} pointerEvents="none">
        <Text style={[styles.bubbleText, { color: theme.colors.text }]} numberOfLines={1}>{spec?.line}</Text>
        <View style={[styles.tail, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} />
      </Animated.View>

      <Animated.View style={[styles.card, { width, height: height + edge, borderRadius: radius, transform }]}>
        <View style={[styles.face, { width, height, borderRadius: radius }]}>
          {/* Explicit size: without it Android draws the bitmap at its own pixel size and crops it. */}
          <Image source={side === 'front' ? FRONT : BACK} style={[styles.art, { width, height }]} resizeMode="stretch" />
          {paths && side === 'front' ? (
            <Animated.View style={[styles.art, { width, height, opacity: faceOpacity }]}>
              <Svg width={width} height={height} viewBox={`0 0 ${CARD_VIEWBOX.width} ${CARD_VIEWBOX.height}`}>
                <Path d={paths.leftEye} stroke={FACE_INK} strokeWidth={EYE_STROKE} strokeLinecap="round" fill="none" />
                <Path d={paths.rightEye} stroke={FACE_INK} strokeWidth={EYE_STROKE} strokeLinecap="round" fill="none" />
                <Path d={paths.mouth} stroke={FACE_INK} strokeWidth={MOUTH_STROKE} strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The white PVC core shows as a thin edge under the printed face.
  card: { backgroundColor: '#E9E9E4', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  face: { overflow: 'hidden' },
  art: { position: 'absolute', top: 0, left: 0 },
  bubble: { position: 'absolute', bottom: '100%', alignSelf: 'center', marginBottom: 14, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, zIndex: 2, elevation: 12 },
  bubbleText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  tail: { position: 'absolute', bottom: -5, alignSelf: 'center', width: 10, height: 10, transform: [{ rotate: '45deg' }], borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
