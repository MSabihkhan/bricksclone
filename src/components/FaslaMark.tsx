import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { GLYPHS } from '../brand/glyphs';

export const BRAND_TILE = '#1C1C1E';
export const BRAND_RED = '#E31E24';

// Geometry measured from the 1a icon (440-unit tile): corner radius 22%, the f is 239 units tall,
// its left edge at x = 168 and its top at y = 80.
const TILE = 440;
const F_HEIGHT = 239;
const F_LEFT = 168;
const F_TOP = 80;
const F_SCALE = F_HEIGHT / GLYPHS.f.yMax;

/**
 * The fasla app icon (1a): a red f on a near-black rounded tile. Same art as the launcher icon.
 * `inverted` swaps the colours (a near-black f on red), the small mark the v2 focus screen uses.
 */
export function FaslaMark({ size = 40, style, inverted = false }: { size?: number; style?: ViewStyle; inverted?: boolean }) {
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${TILE} ${TILE}`}>
        <Rect width={TILE} height={TILE} rx={TILE * 0.22} fill={inverted ? BRAND_RED : BRAND_TILE} />
        <Path
          d={GLYPHS.f.d}
          fill={inverted ? '#0B0B0D' : BRAND_RED}
          transform={`translate(${F_LEFT - GLYPHS.f.xMin * F_SCALE} ${F_TOP + GLYPHS.f.yMax * F_SCALE}) scale(${F_SCALE})`}
        />
      </Svg>
    </View>
  );
}
