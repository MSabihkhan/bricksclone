import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';

interface OnboardingHeaderProps {
  onSkip?: () => void;
}

/** Onboarding header (Fasla Redesign v2): f tile, "fasla." wordmark, Skip. */
export function OnboardingHeader({ onSkip }: OnboardingHeaderProps) {
  const pal = usePalette();
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="header" accessibilityLabel="fasla">
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: pal.c17171A, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: RED }}>f</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.88, color: pal.cF5F5F2 }}>fasla<Text style={{ color: RED }}>.</Text></Text>
      </View>
      {onSkip ? (
        <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={{ height: 40, paddingHorizontal: 14, justifyContent: 'center' }}>
          {({ pressed }) => <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pressed ? pal.cF5F5F2 : pal.c9A9AA0 }}>Skip</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}
