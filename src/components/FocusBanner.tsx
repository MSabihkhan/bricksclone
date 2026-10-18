import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusStore } from '../state/useFocusStore';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Glyph, LiveDot } from '../ui/kit';
import { focusClock } from '../screens/focusLockModel';

/** On Home while a session runs in the background: a live cue and the way back to the focus screen. */
export function FocusBanner({ keyName, onOpen }: { keyName?: string; onOpen: () => void }) {
  const pal = usePalette();
  const { activeSession, timerTick } = useFocusStore();
  if (!activeSession) return null;
  const now = Math.floor(Date.now() / 1000) + timerTick * 0;
  const left = activeSession.plannedEndTime ? Math.max(0, activeSession.plannedEndTime - now) : null;
  const clock = focusClock(left ?? now - activeSession.startTime);

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Focus is running, ${clock} ${left === null ? 'elapsed' : 'left'}. Open focus.`}
      style={({ pressed }) => ({ marginTop: 12, height: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: pal.c2A2A2F, backgroundColor: pressed ? pal.c1C1C20 : pal.c17171A })}>
      <LiveDot size={10} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>Locked in · <Text style={{ fontFamily: fonts.mono }}>{clock}</Text></Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }} numberOfLines={1}>Tap {keyName ?? 'your key'} to finish · open focus</Text>
      </View>
      <Glyph name="chevron" size={16} color={pal.c9A9AA0} />
    </Pressable>
  );
}
