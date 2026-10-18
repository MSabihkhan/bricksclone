/**
 * Building blocks of Fasla Redesign v2. Every value here is taken from the design file; screens
 * compose these instead of restyling the same pill, sheet or toggle each time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Palette, RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { IC, IconKey } from './icons';

// ---------------------------------------------------------------------------------------------
// Icon

export function Glyph({ name, size = 20, color, width = 2, style }: { name: IconKey; size?: number; color: string; width?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
        <Path d={IC[name]} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Radial gradient background: CSS `radial-gradient(rx ry at cx cy, ...)`, all as fractions.

export interface RadialSpec { cx: number; cy: number; rx: number; ry: number; stops: Array<[string, number]> }

export function RadialBg({ spec, radius = 0, style }: { spec: RadialSpec; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const id = useMemo(() => `g${Math.random().toString(36).slice(2, 9)}`, []);
  const last = spec.stops[spec.stops.length - 1][0];
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', backgroundColor: last }, style]} pointerEvents="none"
      onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 ? (
        <Svg width={box.w} height={box.h}>
          <Defs>
            <RadialGradient id={id} cx={spec.cx * box.w} cy={spec.cy * box.h} r={1} gradientUnits="userSpaceOnUse"
              gradientTransform={`translate(${spec.cx * box.w} ${spec.cy * box.h}) scale(${spec.rx * box.w} ${spec.ry * box.h}) translate(${-spec.cx * box.w} ${-spec.cy * box.h})`}>
              {spec.stops.map(([color, offset]) => <Stop key={`${color}${offset}`} offset={offset} stopColor={color} />)}
            </RadialGradient>
          </Defs>
          <Rect width={box.w} height={box.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Screen frame: safe area + the design's 20px gutter.

export function Frame({ children, gutter = 20, bg, style, tabBar = false }: { children: React.ReactNode; gutter?: number; bg?: React.ReactNode; style?: StyleProp<ViewStyle>; tabBar?: boolean }) {
  const pal = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: pal.c0B0B0D }}>
      {bg}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[{ flex: 1, paddingHorizontal: gutter, paddingTop: 18, paddingBottom: tabBar ? 0 : 0 }, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

/** Space reserved under scrolling content for the floating tab bar. */
export const TAB_CLEARANCE = 110;

// ---------------------------------------------------------------------------------------------
// Round icon button (back, close, settings…)

type RoundKind = 'outline' | 'solid' | 'muted';
export function RoundButton({ icon, onPress, label, size = 44, kind = 'outline', iconSize, color, style }: {
  icon: IconKey; onPress: () => void; label: string; size?: number; kind?: RoundKind; iconSize?: number; color?: string; style?: StyleProp<ViewStyle>;
}) {
  const pal = usePalette();
  const bg = kind === 'outline' ? pal.c141417 : kind === 'muted' ? pal.c26262B : pal.c17171A;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.c1C1C20 : bg, borderWidth: kind === 'outline' ? 1 : 0, borderColor: pal.c232327 }, style]}>
      <Glyph name={icon} size={iconSize ?? (icon === 'close' ? 14 : 18)} color={color ?? pal.cF5F5F2} width={icon === 'close' ? 2.4 : 2} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Pill buttons

export type PillKind = 'primary' | 'light' | 'outline' | 'danger' | 'muted' | 'ghost';
export function PillButton({ label, onPress, kind = 'primary', disabled, height = 58, icon, style, textStyle, accessibilityHint }: {
  label: string; onPress: () => void; kind?: PillKind; disabled?: boolean; height?: number; icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; accessibilityHint?: string;
}) {
  const pal = usePalette();
  const look = (() => {
    if (disabled && kind === 'primary') return { bg: pal.c3A1416, fg: pal.c9A6A6C, border: 'transparent' };
    switch (kind) {
      case 'primary': return { bg: RED, fg: '#FFFFFF', border: 'transparent' };
      case 'light': return { bg: pal.cF5F5F2, fg: pal.c0B0B0D, border: 'transparent' };
      case 'outline': return { bg: 'transparent', fg: pal.cF5F5F2, border: pal.c2A2A2F };
      case 'danger': return { bg: 'transparent', fg: pal.cFF5A5F, border: pal.c5A1C1F };
      case 'muted': return { bg: disabled ? pal.c26262B : pal.c26262B, fg: disabled ? pal.c6E6E75 : pal.cF5F5F2, border: 'transparent' };
      default: return { bg: 'transparent', fg: pal.c9A9AA0, border: 'transparent' };
    }
  })();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (v: number) => Animated.timing(scale, { toValue: v, duration: 100, useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => press(0.98)} onPressOut={() => press(1)}
      accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} accessibilityHint={accessibilityHint} style={style}>
      <Animated.View style={{ height, borderRadius: 999, backgroundColor: look.bg, borderWidth: kind === 'outline' || kind === 'danger' ? 1 : 0, borderColor: look.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, transform: [{ scale }] }}>
        {icon}
        <Text style={[{ color: look.fg, fontSize: 16, fontFamily: kind === 'outline' || kind === 'ghost' ? fonts.body : fonts.bodySemiBold }, textStyle]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Segmented pill control. `active` is the design's two looks: light chip, or red chip.

export function Segmented<T extends string>({ options, value, onChange, active = 'light', height = 40, track, style }: {
  options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; active?: 'light' | 'red'; height?: number; track?: string; style?: StyleProp<ViewStyle>;
}) {
  const pal = usePalette();
  return (
    <View style={[{ flexDirection: 'row', gap: 6, padding: 4, borderRadius: 999, backgroundColor: track ?? pal.c141417 }, style]} accessibilityRole="tablist">
      {options.map(o => {
        const on = o.value === value;
        const bg = on ? (active === 'red' ? RED : pal.cF5F5F2) : 'transparent';
        const fg = on ? (active === 'red' ? '#FFFFFF' : pal.c0B0B0D) : pal.c9A9AA0;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, height, borderRadius: 999, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: fg, fontFamily: fonts.bodyMedium, fontSize: 14 }} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Toggle (52 × 32, red when on)

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const pal = usePalette();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: true }).start(); }, [value, x]);
  return (
    <Pressable onPress={() => onChange(!value)} disabled={disabled} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }}
      style={{ width: 52, height: 32, borderRadius: 999, backgroundColor: value ? RED : pal.c3A3A40, opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={{ position: 'absolute', top: 3, left: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Text styles

export function Eyebrow({ children, color, size = 11, spacing = 0.14, style }: { children: React.ReactNode; color?: string; size?: number; spacing?: number; style?: StyleProp<TextStyle> }) {
  const pal = usePalette();
  return <Text style={[{ fontFamily: fonts.mono, fontSize: size, letterSpacing: spacing * size, color: color ?? pal.c85858C }, style]}>{children}</Text>;
}

export function Title({ children, size = 34, spacing = -0.04, style, lines }: { children: React.ReactNode; size?: number; spacing?: number; style?: StyleProp<TextStyle>; lines?: number }) {
  const pal = usePalette();
  return <Text numberOfLines={lines} style={[{ fontFamily: fonts.display, fontSize: size, letterSpacing: spacing * size, lineHeight: Math.round(size * 1.05), color: pal.cF5F5F2 }, style]} accessibilityRole="header">{children}</Text>;
}

/** Section label above a group card ("YOUR SETUP"). */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Eyebrow style={[{ marginTop: 24, marginBottom: 10, marginHorizontal: 4 }, style]}>{children}</Eyebrow>;
}

// ---------------------------------------------------------------------------------------------
// Group card + rows

export function GroupCard({ children, style, bordered }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; bordered?: boolean }) {
  const pal = usePalette();
  return <View style={[{ borderRadius: 24, backgroundColor: pal.c17171A, overflow: 'hidden', borderWidth: bordered ? 1 : 0, borderColor: pal.c232327 }, style]}>{children}</View>;
}

export function IconTile({ icon, size = 38, color }: { icon: IconKey; size?: number; color?: string }) {
  const pal = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: pal.c222226, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph name={icon} size={18} width={1.8} color={color ?? pal.cF5F5F2} />
    </View>
  );
}

/** Settings-style row: icon tile, label, mono value, chevron. */
export function Row({ icon, label, sub, value, valueColor, onPress, last, right, minHeight = 62 }: {
  icon?: IconKey; label: string; sub?: string; value?: string; valueColor?: string; onPress?: () => void; last?: boolean; right?: React.ReactNode; minHeight?: number;
}) {
  const pal = usePalette();
  const body = (
    <>
      {icon ? <IconTile icon={icon} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: pal.cF5F5F2, fontFamily: fonts.body, fontSize: 15 }} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={{ color: pal.c9A9AA0, fontFamily: fonts.body, fontSize: 12 }} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {value ? <Text style={{ color: valueColor ?? pal.c85858C, fontFamily: fonts.mono, fontSize: 12, maxWidth: 140 }} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Glyph name="chevron" size={14} color={pal.c6E6E75} /> : null}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: pal.c222226 };
  if (!onPress) return <View style={style}>{body}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [style, pressed && { backgroundColor: pal.c1C1C20 }]}>{body}</Pressable>;
}

// ---------------------------------------------------------------------------------------------
// Check ring (permissions, app picker)

export function CheckRing({ on, size = 26 }: { on: boolean; size?: number }) {
  const pal = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: on ? RED : pal.c3A3A40, backgroundColor: on ? RED : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <Glyph name="check" size={size * 0.52} color="#FFFFFF" width={3.2} /> : null}
    </View>
  );
}

/** Letter avatar used for apps (the design draws apps as initials, not icons). */
export function AppLetter({ name, size = 40, radius = 12 }: { name: string; size?: number; radius?: number }) {
  const pal = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: pal.c1F1F23, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: pal.cD8D8DC, fontFamily: fonts.bodySemiBold, fontSize: size > 36 ? 15 : 13 }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Live dot (pulsing red)

export function LiveDot({ size = 8 }: { size?: number }) {
  const reduce = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, t]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: RED, opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 0, 0] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: RED }} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Floating bottom sheet (left/right/bottom 8, radius 40)

export function Sheet({ visible, onClose, children, dismissable = true }: { visible: boolean; onClose: () => void; children: React.ReactNode; dismissable?: boolean }) {
  const pal = usePalette();
  const reduce = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    y.setValue(reduce ? 0 : 1);
    Animated.timing(y, { toValue: 0, duration: 350, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [reduce, visible, y]);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: pal.scrim }]} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
        <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end' }} edges={['bottom']} pointerEvents="box-none">
          <Animated.View style={{ margin: 8, borderRadius: 40, backgroundColor: pal.c17171A, borderWidth: 1, borderColor: pal.c232327, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 22, maxHeight: '92%', transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }] }}
            accessibilityViewIsModal>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: pal.c3A3A40 }} />
            {children}
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Toast (white pill at the top)

let pushToast: ((text: string) => void) | null = null;
export function showToast(text: string) { pushToast?.(text); }

export function ToastHost() {
  const pal = usePalette();
  const [text, setText] = useState<string | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    pushToast = t => {
      clearTimeout(timer.current);
      setText(t);
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      timer.current = setTimeout(() => setText(null), 2400);
    };
    return () => { pushToast = null; clearTimeout(timer.current); };
  }, [a]);
  if (!text) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.toastWrap} pointerEvents="none">
      <Animated.View style={[styles.toast, { backgroundColor: pal.cF5F5F2, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]} accessibilityLiveRegion="polite">
        <Text style={{ color: pal.c0B0B0D, fontFamily: fonts.bodyMedium, fontSize: 14 }}>{text}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 70, elevation: 70 },
  toast: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
});

export type { Palette };
