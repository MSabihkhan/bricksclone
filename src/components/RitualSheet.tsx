import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Theme, displayFont } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { getRoutine, RoutineType } from '../features/rituals';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

interface Props {
  visible: boolean;
  routineType: RoutineType;
  brickName?: string;
  nextStep?: string | null;
  onClose: () => void;
  onStart: (intention: string) => void;
  busy?: boolean;
}

export function RitualSheet({ visible, routineType, brickName, nextStep, onClose, onStart, busy }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const routine = getRoutine(routineType);
  const [intention, setIntention] = useState('');
  const { inset, onContainerLayout } = useKeyboardInset();

  useEffect(() => {
    if (visible) setIntention(nextStep?.trim() || '');
  }, [nextStep, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim} onLayout={onContainerLayout}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close ritual setup" />
        <View style={[styles.sheet, { paddingBottom: 28 + inset }]}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>{routine.label.toUpperCase()}{brickName ? `  ·  ${brickName.toUpperCase()}` : ''}</Text>
                <Text style={styles.title}>{routine.prompt}</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <Icon name="x" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder={routine.placeholder}
              placeholderTextColor={theme.colors.faint}
              style={styles.input}
              maxLength={120}
              multiline
              autoFocus
            />
            <View style={styles.coach}>
              <Text style={styles.coachLabel}>TIP</Text>
              <Text style={styles.coachText}>{routine.coach}</Text>
            </View>
            <Button label={busy ? 'Starting…' : 'Start ritual'} onPress={() => onStart(intention.trim())} disabled={busy || !intention.trim()} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 12, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.faint, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  headerCopy: { flex: 1 },
  kicker: { color: theme.colors.accent, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.55, marginBottom: 8 },
  title: { color: theme.colors.text, fontFamily: displayFont, fontSize: 29, lineHeight: 33, letterSpacing: -1.4 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card2, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 92, maxHeight: 140, borderRadius: 17, backgroundColor: theme.colors.card2, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 17, lineHeight: 24, padding: 16, textAlignVertical: 'top' },
  coach: { borderLeftWidth: 2, borderLeftColor: theme.colors.accent, paddingLeft: 12, marginVertical: 18 },
  coachLabel: { color: theme.colors.faint, fontFamily: 'IBMPlexMono-Medium', fontSize: 10, letterSpacing: 0.45, marginBottom: 5 },
  coachText: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
});
