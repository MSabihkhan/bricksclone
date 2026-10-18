import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Theme } from '../theme';
import { fonts } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { markSeen, nextVisibleStep, parseSeen, Rect, shouldShow, tooltipSide, Tour, visibleStepCount } from './engine';
import { TOURS } from './tours';
import { BrickCard } from '../components/BrickCard';
import { parsePersonaEnabled, PERSONA_SETTING_KEY } from '../features/persona';

const SEEN_KEY = 'walkthrough_seen';

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

interface Ctx {
  register: (key: string, node: Measurable | null) => void;
  start: (tourId: string) => void;
  startIfUnseen: (tourId: string) => Promise<void>;
  resetSeen: () => Promise<void>;
}

const WalkthroughContext = createContext<Ctx | null>(null);

/** Tag any element as a walkthrough target: `<View ref={useWalkthroughTarget('home.brickRail')}>`. */
export function useWalkthroughTarget(key: string) {
  const ctx = useContext(WalkthroughContext);
  return useCallback((node: Measurable | null) => ctx?.register(key, node), [ctx, key]);
}

export function useWalkthrough(): Ctx {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error('useWalkthrough must be used inside WalkthroughProvider');
  return ctx;
}

/** Shows a tour the first time a screen is focused (per tour version). */
export function useAutoTour(tourId: string, enabled = true) {
  const { startIfUnseen } = useWalkthrough();
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    // Give the screen a moment to lay out before measuring its targets.
    const id = setTimeout(() => { startIfUnseen(tourId).catch(() => {}); }, 700);
    return () => clearTimeout(id);
  }, [enabled, startIfUnseen, tourId]));
}

function measure(node: Measurable): Promise<Rect> {
  return new Promise(resolve => node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })));
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const viewport = useWindowDimensions();
  const targets = useRef(new Map<string, Measurable>());
  const root = useRef<View>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [index, setIndex] = useState(-1);
  const [rects, setRects] = useState<Record<string, Rect | undefined>>({});
  // Guide slot: the card character sits beside each tip unless switched off in Settings.
  const [guide, setGuide] = useState(true);

  const register = useCallback((key: string, node: Measurable | null) => {
    if (node) targets.current.set(key, node);
    else targets.current.delete(key);
  }, []);

  // Measure every target relative to this overlay, so status-bar offsets cancel out.
  const measureTargets = useCallback(async (t: Tour) => {
    const origin = root.current ? await measure(root.current as unknown as Measurable) : { x: 0, y: 0, width: 0, height: 0 };
    const next: Record<string, Rect | undefined> = {};
    for (const step of t.steps) {
      const node = targets.current.get(step.target);
      if (!node) continue;
      const r = await measure(node);
      next[step.target] = { ...r, x: r.x - origin.x, y: r.y - origin.y };
    }
    return next;
  }, []);

  const finish = useCallback(async (t: Tour) => {
    setTour(null);
    setIndex(-1);
    try {
      const seen = parseSeen(await db.settings.get(SEEN_KEY));
      await db.settings.set(SEEN_KEY, JSON.stringify(markSeen(t, seen)));
    } catch {
      // Not fatal: worst case the tour shows again.
    }
  }, []);

  const start = useCallback((tourId: string) => {
    const t = TOURS[tourId];
    if (!t) return;
    db.settings.get(PERSONA_SETTING_KEY).then(raw => setGuide(parsePersonaEnabled(raw))).catch(() => {});
    measureTargets(t).then(measured => {
      const first = nextVisibleStep(t, 0, measured, viewport);
      if (first < 0) return; // nothing on screen to point at; try again next visit
      setRects(measured);
      setTour(t);
      setIndex(first);
    }).catch(() => {});
  }, [measureTargets, viewport]);

  const startIfUnseen = useCallback(async (tourId: string) => {
    const t = TOURS[tourId];
    if (!t || tour) return;
    const seen = parseSeen(await db.settings.get(SEEN_KEY));
    if (shouldShow(t, seen)) start(tourId);
  }, [start, tour]);

  const resetSeen = useCallback(async () => { await db.settings.set(SEEN_KEY, '{}'); }, []);

  const advance = useCallback(() => {
    if (!tour) return;
    measureTargets(tour).then(measured => {
      const next = nextVisibleStep(tour, index + 1, measured, viewport);
      if (next < 0) return finish(tour);
      setRects(measured);
      setIndex(next);
    }).catch(() => finish(tour));
  }, [finish, index, measureTargets, tour, viewport]);

  useEffect(() => {
    if (!tour) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { finish(tour); return true; });
    return () => sub.remove();
  }, [finish, tour]);

  const ctx = useMemo(() => ({ register, start, startIfUnseen, resetSeen }), [register, start, startIfUnseen, resetSeen]);
  const step = tour && index >= 0 ? tour.steps[index] : null;
  const rect = step ? rects[step.target] : undefined;
  const pad = 6;
  const hole = rect ? { x: rect.x - pad, y: rect.y - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const shown = tour ? visibleStepCount(tour, rects, viewport) : 0;
  const position = tour && step ? tour.steps.slice(0, index + 1).filter(s => rects[s.target]).length : 0;

  return (
    <WalkthroughContext.Provider value={ctx}>
      <View ref={root} style={styles.fill} collapsable={false}>
        {children}
        {tour && step && hole ? (
          <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
            {/* Four panels around the cut-out dim everything except the target. */}
            <Pressable style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} onPress={advance} />
            <Pressable style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} onPress={advance} />
            <Pressable style={[styles.dim, { top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.h }]} onPress={advance} />
            <Pressable style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} onPress={advance} />
            <View pointerEvents="none" style={[styles.ring, { top: hole.y, left: hole.x, width: hole.w, height: hole.h }]} />

            <View
              style={[
                styles.card,
                tooltipSide(rect!, viewport.height, step.placement) === 'below'
                  ? { top: hole.y + hole.h + 12 }
                  : { bottom: viewport.height - hole.y + 12 },
              ]}
            >
              <View style={styles.tipRow}>
                {guide ? <BrickCard width={56} face="idle" style={styles.guide} /> : null}
                <View style={styles.tipCopy}>
                  <Text style={styles.counter}>{position} OF {shown}</Text>
                  <Text style={styles.title}>{step.title}</Text>
                  <Text style={styles.body}>{step.body}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => finish(tour)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.skip}>Skip tips</Text>
                </Pressable>
                <Pressable onPress={advance} style={styles.next} accessibilityRole="button">
                  <Text style={styles.nextText}>{position >= shown ? 'Got it' : 'Next'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </WalkthroughContext.Provider>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  ring: { position: 'absolute', borderRadius: 20, borderWidth: 2, borderColor: theme.colors.accent },
  card: { position: 'absolute', left: 16, right: 16, backgroundColor: theme.mode === 'dark' ? '#1C1C20' : theme.colors.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: theme.mode === 'dark' ? '#2A2A2F' : theme.colors.border },
  tipRow: { flexDirection: 'row', gap: 12 },
  tipCopy: { flex: 1 },
  guide: { marginTop: 2 },
  counter: { color: theme.colors.faint, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.54 },
  title: { color: theme.colors.text, fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.6, marginTop: 8 },
  body: { color: theme.colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  skip: { color: theme.colors.muted, fontFamily: fonts.body, fontSize: 14 },
  next: { minHeight: 44, paddingHorizontal: 20, borderRadius: 999, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
