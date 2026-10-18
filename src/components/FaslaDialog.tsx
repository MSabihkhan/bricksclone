import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme/fonts';
import { RED, usePalette } from '../theme/palette';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Glyph } from '../ui/kit';
import type { IconKey } from '../ui/icons';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogRequest { title: string; message?: string; buttons: DialogButton[]; icon?: IconKey }

let show: ((request: DialogRequest) => void) | null = null;

/**
 * Drop-in replacement for Alert.alert that draws fasla's own dialog instead of Android's.
 * Falls back to the system alert only if the host isn't mounted yet (e.g. a crash at start-up).
 * `options.icon` adds the design's tinted icon tile above the title (e.g. 'trash' for delete).
 */
export function faslaAlert(title: string, message?: string, buttons?: DialogButton[], options?: { icon?: IconKey }) {
  const request = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], icon: options?.icon };
  if (show) show(request);
  else Alert.alert(title, message, request.buttons);
}

/** Order on screen: cancel first (left / bottom), then the action, as in the design. */
export function orderButtons(buttons: DialogButton[]): DialogButton[] {
  return [...buttons.filter(b => b.style === 'cancel'), ...buttons.filter(b => b.style !== 'cancel')];
}

/** Mount once, inside the theme provider. Shows one dialog at a time; later ones queue. */
export function FaslaDialogHost() {
  const pal = usePalette();
  const reduceMotion = useReducedMotion();
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0];
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    show = request => setQueue(q => [...q, request]);
    return () => { show = null; };
  }, []);

  useEffect(() => {
    if (!current) return;
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: reduceMotion ? 0 : 250, useNativeDriver: true }).start();
  }, [appear, current, reduceMotion]);

  const close = useCallback((button?: DialogButton) => {
    setQueue(q => q.slice(1));
    // Let the dialog leave before the action runs, so a follow-up screen or dialog isn't hidden.
    if (button?.onPress) setTimeout(button.onPress, 0);
  }, []);

  if (!current) return null;
  const buttons = orderButtons(current.buttons);
  const cancel = current.buttons.find(b => b.style === 'cancel');
  const stacked = buttons.length > 2;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close(cancel)}>
      <Animated.View style={[styles.scrim, { backgroundColor: pal.scrim, opacity: appear }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel ? () => close(cancel) : undefined} accessibilityLabel="Close dialog" />
        <Animated.View
          style={[styles.card, { backgroundColor: pal.c1C1C20, borderColor: pal.c2A2A2F, opacity: appear, transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.94, 1] }) }] }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          {current.icon ? (
            <View style={[styles.iconTile, { backgroundColor: pal.c2A1012 }]}>
              <Glyph name={current.icon} size={22} color={pal.cFF5A5F} />
            </View>
          ) : null}
          <Text style={[styles.title, { color: pal.cF5F5F2 }, current.icon ? styles.titleAfterIcon : null]}>{current.title}</Text>
          {current.message ? <Text style={[styles.message, { color: pal.c9A9AA0 }]}>{current.message}</Text> : null}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {buttons.map(button => {
              const isCancel = button.style === 'cancel';
              return (
                <Pressable
                  key={button.text}
                  onPress={() => close(button)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    !stacked && styles.buttonFlex,
                    isCancel ? { borderWidth: 1, borderColor: pal.c3A3A40 } : { backgroundColor: RED },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.buttonText, { color: isCancel ? pal.cF5F5F2 : '#FFFFFF', fontFamily: isCancel ? fonts.body : fonts.bodySemiBold }]}>{button.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 32, borderWidth: 1, padding: 24, gap: 8 },
  iconTile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.78, lineHeight: 30 },
  titleAfterIcon: { marginTop: 8 },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionsStacked: { flexDirection: 'column-reverse' },
  button: { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonFlex: { flex: 1 },
  pressed: { opacity: 0.85 },
  buttonText: { fontSize: 16 },
});
