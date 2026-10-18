import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Session } from '../db/types';
import { getRoutine } from '../features/rituals';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, PillButton, Sheet } from '../ui/kit';

type Outcome = NonNullable<Session['outcome']>;

interface Props {
  session: Session | null;
  onSave: (outcome: Outcome, nextStep: string) => void;
  onSkip: () => void;
}

const OPTIONS: { id: Outcome; label: string }[] = [
  { id: 'done', label: 'Done' },
  { id: 'partial', label: 'Partial' },
  { id: 'not_done', label: 'Not done' },
];

/** "How did it go?" after a study or work session, in the design's sheet language. */
export function OutcomeSheet({ session, onSave, onSkip }: Props) {
  const pal = usePalette();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setOutcome(null);
    setNextStep('');
  }, [session?.id]);

  const routine = session ? getRoutine(session.routineType) : null;

  return (
    <Sheet visible={!!session} onClose={onSkip}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Eyebrow color={pal.cFF5A5F} style={{ marginTop: 16 }}>OUTCOME LEDGER · {routine?.shortLabel.toUpperCase()}</Eyebrow>
        <Text style={{ marginTop: 8, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.98, color: pal.cF5F5F2 }}>How did it go?</Text>
        {session?.intention ? (
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>“{session.intention}”</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          {OPTIONS.map(option => {
            const on = outcome === option.id;
            return (
              <Pressable key={option.id} onPress={() => setOutcome(option.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={{ flex: 1, height: 52, borderRadius: 999, borderWidth: 1, borderColor: on ? RED : pal.c232327, backgroundColor: on ? RED : pal.c141417, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: on ? '#FFFFFF' : pal.cB4B4BA }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Eyebrow style={{ marginTop: 22, marginBottom: 6, marginHorizontal: 4 }}>ONE NEXT STEP</Eyebrow>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c85858C, marginHorizontal: 4, marginBottom: 10 }}>
          Writing it down means you can stop holding it in your head. It pre-fills your next intention.
        </Text>
        <TextInput
          value={nextStep}
          onChangeText={setNextStep}
          placeholder="What should happen next?"
          placeholderTextColor={pal.c6E6E75}
          maxLength={120}
          returnKeyType="done"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="One next step"
          style={{ height: 54, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, borderColor: focused ? RED : pal.c2A2A2F, backgroundColor: pal.c0F0F11, color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 16 }}
        />
        <PillButton label="Save outcome" disabled={!outcome} onPress={() => { if (outcome) onSave(outcome, nextStep); }} style={{ marginTop: 18 }} />
        <PillButton label="Not now" kind="ghost" height={44} onPress={onSkip} style={{ marginTop: 6 }} textStyle={{ fontSize: 15 }} />
      </ScrollView>
    </Sheet>
  );
}
