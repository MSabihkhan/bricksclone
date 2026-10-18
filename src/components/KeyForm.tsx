import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Tag } from '../db/types';
import { durationLabel, LOCATIONS, modeLabel } from '../utils/onboarding';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Glyph } from '../ui/kit';
import type { IconKey } from '../ui/icons';
import { BrickCard } from './BrickCard';

/** The design's QUICK PICK places, keyed like the stored `location`. */
export const PLACE_ICONS: Record<string, IconKey> = {
  desk: 'monitor', bedroom: 'bed', office: 'office', kitchen: 'coffee', studio: 'music', car: 'car',
};

export const placeIcon = (location: string | null | undefined): IconKey => PLACE_ICONS[location ?? ''] ?? 'monitor';

/** "Active · Deep Work · 50 min · Strict" */
export function keyMeta(tag: Pick<Tag, 'mode' | 'duration' | 'strict'>, active: boolean): string {
  return `${active ? 'Active · ' : ''}${modeLabel(tag.mode)} · ${durationLabel(tag.duration)}${tag.strict ? ' · Strict' : ''}`;
}

/** Name field shared by Register · Name and Edit key. */
export function KeyNameInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const pal = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={pal.c6E6E75}
      autoFocus={autoFocus}
      maxLength={24}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityLabel="Key name"
      style={{ marginTop: 18, height: 58, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: focused ? RED : pal.c2A2A2F, backgroundColor: pal.c141417, color: pal.cF5F5F2, fontFamily: fonts.bodyMedium, fontSize: 18 }}
    />
  );
}

/**
 * QUICK PICK grid. Picking a place also names the key, unless the user typed their own name.
 */
export function PlaceGrid({ location, name, onPick, tileHeight = 76 }: {
  location: string; name: string; onPick: (location: string, name: string) => void; tileHeight?: number;
}) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {LOCATIONS.map(place => {
        const on = place.key === location;
        const fg = on ? '#FFFFFF' : pal.cB4B4BA;
        const keepName = name.trim() && !LOCATIONS.some(l => l.label === name.trim());
        return (
          <Pressable
            key={place.key}
            onPress={() => onPick(place.key, keepName ? name : place.label)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={place.label}
            style={{ width: '31.9%', height: tileHeight, borderRadius: 20, borderWidth: 1, borderColor: on ? RED : pal.c232327, backgroundColor: on ? RED : pal.c17171A, alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Glyph name={PLACE_ICONS[place.key]} size={20} color={fg} />
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: fg }}>{place.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The printed key, small and tilted, as in the My keys list. */
export function MiniKey({ width = 76 }: { width?: number }) {
  return (
    <View style={{ transform: [{ rotate: '-4deg' }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <BrickCard width={width} face={null} />
    </View>
  );
}

/** Two-segment step bar under the Register header. */
export function StepBar({ step }: { step: 1 | 2 }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: RED }} />
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step === 2 ? RED : pal.c26262B }} />
    </View>
  );
}
