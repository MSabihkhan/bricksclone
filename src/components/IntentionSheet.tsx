import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { PillButton, RoundButton, Sheet, Eyebrow } from '../ui/kit';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { homeRitual } from '../features/intentionIdeas';

interface Props {
  visible: boolean;
  routineType: string;
  keyName?: string;
  /** Last session's "next step", offered first so you can pick up where you left off. */
  nextStep?: string | null;
  onClose: () => void;
  /** Called with the intention; the caller then asks for the key tap. */
  onContinue: (intention: string) => void;
}

/** "What will you finish?" — the intention sheet of the redesign. */
export function IntentionSheet({ visible, routineType, keyName, nextStep, onClose, onContinue }: Props) {
  const pal = usePalette();
  const ritual = homeRitual(routineType);
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(''); }, [visible, routineType]);
  const ideas = nextStep?.trim() ? [nextStep.trim(), ...ritual.suggestions.filter(s => s !== nextStep.trim())].slice(0, 3) : ritual.suggestions;
  const ready = !!text.trim();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Eyebrow color={pal.cFF5A5F} spacing={0.16}>{`${ritual.label.toUpperCase()} RITUAL · ${(keyName ?? 'YOUR KEY').toUpperCase()}`}</Eyebrow>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.84, color: pal.cF5F5F2 }}>What will you finish?</Text>
        </View>
        <RoundButton icon="close" label="Close" onPress={onClose} size={40} kind="muted" />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={ritual.placeholder}
        placeholderTextColor={pal.c6E6E75}
        multiline
        maxLength={160}
        style={{ marginTop: 18, minHeight: 92, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: text ? RED : pal.c2A2A2F, backgroundColor: pal.c0F0F11, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 17, lineHeight: 24, textAlignVertical: 'top' }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {ideas.map(idea => (
          <Pressable key={idea} onPress={() => setText(idea)} accessibilityRole="button"
            style={({ pressed }) => ({ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: pal.c2A2A2F, justifyContent: 'center', backgroundColor: pressed ? pal.c202024 : 'transparent' })}>
            <Text style={{ color: pal.cD8D8DC, fontFamily: fonts.body, fontSize: 13 }}>{idea}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ marginTop: 16, fontFamily: fonts.body, fontSize: 13, color: pal.c6E6E75 }}>Make it concrete — pages, questions, or one chapter.</Text>
      <PillButton label="Continue to tap" onPress={() => onContinue(text.trim())} disabled={!ready} kind={ready ? 'primary' : 'muted'} style={{ marginTop: 16 }} />
    </Sheet>
  );
}
