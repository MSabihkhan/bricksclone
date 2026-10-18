import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GLYPHS, GLYPH_BOTTOM, GLYPH_TOP, UNITS_PER_EM } from '../brand/glyphs';
import { EASE_GAP, EASE_LETTER, EASE_OUT, LAUNCH, segment } from '../brand/launchTimeline';
import { wordmarkLayout } from './FaslaWordmark';
import { BRAND_RED, BRAND_TILE } from './FaslaMark';
import { useReducedMotion } from '../hooks/useReducedMotion';

const FONT_SIZE = 64;
const S = FONT_SIZE / UNITS_PER_EM;
const INK = '#F4F4F2';
const MEASURE = '#8A8A86';
const ASLA = ['a', 's', 'l', 'a'] as const;

interface Props {
  /** false: draw the finished frame with no motion (used while the app is still deciding where to go). */
  animated?: boolean;
  onDone?: () => void;
}

/** The 2c launch animation ("the gap"). Fixed brand colours, independent of the app theme. */
export function LaunchSplash({ animated = true, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const still = !animated || reduceMotion;
  const t = useRef(new Animated.Value(still ? LAUNCH.done : 0)).current;

  useEffect(() => {
    if (still) {
      t.setValue(LAUNCH.done);
      if (!onDone) return;
      const id = setTimeout(onDone, LAUNCH.stillHold);
      return () => clearTimeout(id);
    }
    const run = Animated.timing(t, { toValue: LAUNCH.done, duration: LAUNCH.done, easing: Easing.linear, useNativeDriver: true });
    run.start(({ finished }) => { if (finished) onDone?.(); });
    return () => run.stop();
  }, [onDone, still, t]);

  const layout = useMemo(() => {
    const { xs, width } = wordmarkLayout();
    const gap = (xs[5] - xs[1]) * S;            // width of "asla" once the gap is open
    return { xs: xs.map(x => x * S), width: width * S, gap, height: (GLYPH_TOP + GLYPH_BOTTOM) * S };
  }, []);

  const track = (tr: { inputRange: number[]; outputRange: number[] }) => t.interpolate({ ...tr, extrapolate: 'clamp' });
  const half = layout.gap / 2;
  const rowOpacity = track(segment(...LAUNCH.rowIn, 0, 1, EASE_OUT));
  const rowScale = track(segment(...LAUNCH.rowIn, 0.96, 1, EASE_OUT));
  const fShift = track(segment(...LAUNCH.gap, half, 0, EASE_GAP));      // f starts touching the dot...
  const dotShift = track(segment(...LAUNCH.gap, -half, 0, EASE_GAP));   // ...and both move apart
  const lineSpan = track(segment(...LAUNCH.gap, 0, 1, EASE_GAP));
  const lineOpacity = t.interpolate({ inputRange: [LAUNCH.lineIn[0], LAUNCH.lineIn[1], LAUNCH.lineOut[0], LAUNCH.lineOut[1]], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const urduOpacity = track(segment(...LAUNCH.urdu, 0, 1, EASE_OUT));
  const urduRise = track(segment(...LAUNCH.urdu, 6, 0, EASE_OUT));

  const glyph = (ch: keyof typeof GLYPHS, color: string) => {
    const g = GLYPHS[ch];
    return (
      <Svg width={g.advance * S} height={layout.height} viewBox={`0 ${-GLYPH_TOP} ${g.advance} ${GLYPH_TOP + GLYPH_BOTTOM}`}>
        <Path d={g.d} fill={color} />
      </Svg>
    );
  };

  // The measuring line sits 60% down the letters, inset 5px from each side of the gap.
  const lineTop = layout.height * 0.6;
  const gapLeft = layout.xs[1] + 5;
  const gapRight = layout.xs[5] - 5;

  return (
    <View style={styles.fill} accessible accessibilityLabel="fasla">
      <Animated.View style={[{ width: layout.width, height: layout.height, opacity: rowOpacity, transform: [{ scale: rowScale }] }]}>
        <Animated.View style={[styles.abs, { left: gapLeft, top: lineTop - 6, opacity: lineOpacity, transform: [{ translateX: fShift }] }, styles.tick]} />
        <Animated.View style={[styles.abs, { left: gapRight - 1.5, top: lineTop - 6, opacity: lineOpacity, transform: [{ translateX: dotShift }] }, styles.tick]} />
        <Animated.View style={[styles.abs, styles.bar, { left: gapLeft, width: gapRight - gapLeft, top: lineTop - 0.75, opacity: lineOpacity, transform: [{ scaleX: lineSpan }] }]} />

        {ASLA.map((ch, i) => {
          const start = LAUNCH.letterStart(i);
          const end = start + LAUNCH.letterDuration;
          return (
            <Animated.View
              key={`${ch}${i}`}
              style={[styles.abs, {
                left: layout.xs[i + 1],
                opacity: track(segment(start, end, 0, 1, EASE_LETTER)),
                transform: [{ translateY: track(segment(start, end, 14, 0, EASE_LETTER)) }],
              }]}
            >
              {glyph(ch, INK)}
            </Animated.View>
          );
        })}

        <Animated.View style={[styles.abs, { left: layout.xs[0], transform: [{ translateX: fShift }] }]}>{glyph('f', BRAND_RED)}</Animated.View>
        <Animated.View style={[styles.abs, { left: layout.xs[5], transform: [{ translateX: dotShift }] }]}>{glyph('.', BRAND_RED)}</Animated.View>
      </Animated.View>

      <Animated.View style={{ opacity: urduOpacity, transform: [{ translateY: urduRise }] }}>
        {/* Android's system Naskh font draws the Urdu; bold matches the design's weight 700. */}
        <Text style={styles.urdu}>فاصلہ</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: BRAND_TILE, alignItems: 'center', justifyContent: 'center', gap: 10 },
  abs: { position: 'absolute', top: 0 },
  tick: { width: 1.5, height: 12, backgroundColor: MEASURE },
  bar: { height: 1.5, backgroundColor: MEASURE },
  urdu: { color: MEASURE, fontSize: 20, fontWeight: '700', writingDirection: 'rtl' },
});
