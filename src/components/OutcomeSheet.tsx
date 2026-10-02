import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import type { Session } from '../db/types';
import { getRoutine } from '../features/rituals';

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

export function OutcomeSheet({ session, onSave, onSkip }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nextStep, setNextStep] = useState('');

  useEffect(() => {
    setOutcome(null);
    setNextStep('');
  }, [session?.id]);

  if (!session) return null;
  const routine = getRoutine(session.routineType);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onSkip}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>OUTCOME LEDGER · {routine.shortLabel.toUpperCase()}</Text>
          <Text style={styles.title}>How did it go?</Text>
          <Text style={styles.intention}>“{session.intention}”</Text>
          <View style={styles.options}>
            {OPTIONS.map(option => {
              const selected = outcome === option.id;
              return (
                <Pressable key={option.id} onPress={() => setOutcome(option.id)} style={[styles.option, selected && styles.optionSelected]} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>ONE NEXT STEP</Text>
          <TextInput value={nextStep} onChangeText={setNextStep} placeholder="What should happen next?" placeholderTextColor={theme.colors.faint} style={styles.input} maxLength={120} />
          <Button label="Save outcome" onPress={() => outcome && onSave(outcome, nextStep)} disabled={!outcome} />
          <Pressable onPress={onSkip} style={styles.skip}><Text style={styles.skipText}>Not now</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.faint, alignSelf: 'center', marginBottom: 20 },
  kicker: { color: theme.colors.accent, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.5 },
  title: { color: theme.colors.text, fontFamily: 'BricolageGrotesque', fontSize: 30, letterSpacing: -1.5, marginTop: 9 },
  intention: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  options: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  option: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.card2, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  optionSelected: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  optionText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  optionTextSelected: { color: theme.colors.bg },
  label: { color: theme.colors.faint, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.5, marginBottom: 8 },
  input: { height: 54, borderRadius: 13, backgroundColor: theme.colors.card2, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 14, paddingHorizontal: 15, marginBottom: 16 },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: theme.colors.muted, fontSize: 13 },
});
