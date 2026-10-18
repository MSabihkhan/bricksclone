import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GLYPHS, GLYPH_BOTTOM, GLYPH_TOP, UNITS_PER_EM } from '../brand/glyphs';
import { BRAND_RED } from './FaslaMark';

/** Tracking used everywhere the wordmark appears (-0.04em, as on the website and launch screen). */
export const WORDMARK_TRACKING = -0.04 * UNITS_PER_EM;
const LETTERS = ['f', 'a', 's', 'l', 'a', '.'] as const;

/** Advance of each letter in font units, tracking included, and the total width. */
export function wordmarkLayout() {
  let x = 0;
  const xs = LETTERS.map(ch => { const at = x; x += GLYPHS[ch].advance + WORDMARK_TRACKING; return at; });
  return { xs, width: x - WORDMARK_TRACKING };
}

/** "fasla." drawn from the logo's own outlines: letters in `color`, full stop in red. */
export function FaslaWordmark({ fontSize = 20, color, style }: { fontSize?: number; color: string; style?: ViewStyle }) {
  const { xs, width } = wordmarkLayout();
  const height = GLYPH_TOP + GLYPH_BOTTOM;
  const scale = fontSize / UNITS_PER_EM;
  return (
    <View style={style} accessible accessibilityRole="text" accessibilityLabel="fasla">
      <Svg width={width * scale} height={height * scale} viewBox={`0 ${-GLYPH_TOP} ${width} ${height}`}>
        {LETTERS.map((ch, i) => (
          <Path key={`${ch}${i}`} d={GLYPHS[ch].d} fill={ch === '.' ? BRAND_RED : color} transform={`translate(${xs[i]} 0)`} />
        ))}
      </Svg>
    </View>
  );
}
