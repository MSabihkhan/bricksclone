import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Theme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { RITUAL_STEPS, ROUTINES } from '../features/rituals';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Explains what a ritual is, how a session flows, and what each ritual is good for. */
export function RitualGuide({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close ritual guide" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>What’s a ritual?</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Icon name="x" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.lead}>
              Your key decides how a session runs — how long and how strict. A ritual is why you’re starting it. Picking one changes the question fasla asks you, the tip it gives, and what it tracks.
            </Text>

            <View style={styles.steps}>
              {RITUAL_STEPS.map((step, index) => (
                <View key={step.title} style={styles.step}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {ROUTINES.map(routine => (
              <View key={routine.id} style={styles.ritual}>
                <View style={styles.ritualTop}>
                  <Text style={styles.ritualName}>{routine.label}</Text>
                  <Text style={styles.ritualSetup}>{routine.suggestedSetup.toUpperCase()}</Text>
                </View>
                <Text style={styles.ritualTagline}>{routine.tagline}</Text>
                <Text style={styles.ritualBenefit}>{routine.benefit}</Text>
                <Text style={styles.ritualTracks}>{routine.asksOutcome ? 'Asks how it went afterwards' : 'No grading afterwards — just the time'}</Text>
              </View>
            ))}

            <Text style={styles.footnote}>Tips are based on published behavioural research; they describe tendencies, not guaranteed results.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 12, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.faint, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: theme.colors.text, fontFamily: 'BricolageGrotesque', fontSize: 28, letterSpacing: -1.3 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card2, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 32 },
  lead: { color: theme.colors.muted, fontSize: 14, lineHeight: 21 },
  steps: { marginTop: 18, marginBottom: 8, gap: 12 },
  step: { flexDirection: 'row', gap: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.text, color: theme.colors.bg, textAlign: 'center', lineHeight: 24, fontFamily: 'IBMPlexMono-Medium', fontSize: 12 },
  stepCopy: { flex: 1 },
  stepTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  stepBody: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  ritual: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingVertical: 14, marginTop: 6 },
  ritualTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ritualName: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  ritualSetup: { color: theme.colors.faint, fontFamily: 'IBMPlexMono-Medium', fontSize: 9, letterSpacing: 0.4, flexShrink: 1, textAlign: 'right' },
  ritualTagline: { color: theme.colors.text, fontSize: 13, marginTop: 4 },
  ritualBenefit: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  ritualTracks: { color: theme.colors.accent, fontFamily: 'IBMPlexMono-Regular', fontSize: 10, marginTop: 8 },
  footnote: { color: theme.colors.faint, fontSize: 11, lineHeight: 16, marginTop: 10 },
});
