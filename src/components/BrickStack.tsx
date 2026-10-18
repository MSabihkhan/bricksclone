import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { BrickCard } from './BrickCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CARD_ASPECT, CARD_EDGE, PersonaFace } from '../features/persona';

const PEEK = 17;          // how far each card behind shows above the one in front
const VISIBLE_BEHIND = 2;
const THROW = 70;         // drag distance that sends the top card to the back

interface Item { id: string; name: string }

interface Props {
  items: Item[];          // already ordered; items[0] is on top
  width: number;
  /** Face for the top card; null when the persona is off. */
  topFace: PersonaFace | null;
  say?: boolean;
  onCycle: () => void;
  onBringToFront: (id: string) => void;
  onLongPress: () => void;
  /** Tap on the top card (the design: tap the card to start). */
  onPressTop?: () => void;
}

/** The person's keys as a stack of cards. Swipe the top card away, or tap one behind. */
export function BrickStack({ items, width, topFace, say, onCycle, onBringToFront, onLongPress, onPressTop }: Props) {
  const height = Math.round(width * CARD_ASPECT) + Math.max(1, Math.round(width * CARD_EDGE));
  const behind = Math.min(items.length - 1, VISIBLE_BEHIND);
  return (
    <View style={[styles.stack, { height: height + behind * PEEK }]}>
      {items.map((item, index) => (
        <StackCard
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          width={width}
          face={index === 0 ? topFace : topFace === null ? null : 'asleep'}
          say={index === 0 && say}
          offsetTop={behind * PEEK}
          onCycle={onCycle}
          onBringToFront={onBringToFront}
          onLongPress={onLongPress}
          onPressTop={onPressTop}
        />
      ))}
    </View>
  );
}

interface CardProps extends Omit<Props, 'items' | 'topFace'> {
  item: Item;
  index: number;
  count: number;
  face: PersonaFace | null;
  offsetTop: number;
}

function StackCard({ item, index, count, width, face, say, offsetTop, onCycle, onBringToFront, onLongPress, onPressTop }: CardProps) {
  const reduceMotion = useReducedMotion();
  const slot = useRef(new Animated.Value(index)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const isTop = index === 0;

  // Slide to the new place in the stack; a card that was thrown away also slides back in.
  useEffect(() => {
    if (reduceMotion) { slot.setValue(index); dragX.setValue(0); return; }
    Animated.parallel([
      Animated.spring(slot, { toValue: index, useNativeDriver: true, speed: 16, bounciness: 4 }),
      Animated.timing(dragX, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [dragX, index, reduceMotion, slot]);

  const latest = useRef({ isTop, count, onCycle, reduceMotion });
  latest.current = { isTop, count, onCycle, reduceMotion };

  const pan = useMemo(() => PanResponder.create({
    // Horizontal drags only, so the Home screen still scrolls vertically over the stack.
    onMoveShouldSetPanResponder: (_, g) => latest.current.isTop && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => dragX.setValue(g.dx),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => {
      const { count: n, onCycle: cycle, reduceMotion: still } = latest.current;
      if (Math.abs(g.dx) < THROW || n < 2) {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
        return;
      }
      if (still) { cycle(); return; }
      Animated.timing(dragX, { toValue: Math.sign(g.dx) * 420, duration: 180, useNativeDriver: true }).start(() => cycle());
    },
    onPanResponderTerminate: () => Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start(),
  }), [dragX]);

  const range = [0, 1, 2, 3];
  const translateY = slot.interpolate({ inputRange: range, outputRange: [0, -PEEK, -PEEK * 2, -PEEK * 2], extrapolate: 'clamp' });
  const scale = slot.interpolate({ inputRange: range, outputRange: [1, 0.93, 0.86, 0.86], extrapolate: 'clamp' });
  const opacity = slot.interpolate({ inputRange: [0, 2, 3], outputRange: [1, 1, 0], extrapolate: 'clamp' });
  const dim = slot.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3], extrapolate: 'clamp' });
  const rotate = dragX.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-11deg', '0deg', '11deg'] });

  return (
    <Animated.View
      {...(isTop ? pan.panHandlers : {})}
      // Android draws by elevation before zIndex, so both must agree on the order.
      style={[styles.card, { top: offsetTop, zIndex: 10 - index, elevation: 10 - index, opacity, transform: [{ translateX: dragX }, { translateY }, { scale }, { rotate }] }]}
    >
      <Pressable
        onPress={isTop ? onPressTop : () => onBringToFront(item.id)}
        onLongPress={isTop ? onLongPress : undefined}
        accessibilityRole="button"
        accessibilityLabel={isTop ? `${item.name} key, selected. ${count > 1 ? 'Swipe to switch key.' : ''}` : `Switch to ${item.name}`}
        accessibilityHint={isTop ? 'Long press to edit this key' : undefined}
        accessibilityActions={isTop && count > 1 ? [{ name: 'activate', label: 'Next key' }] : undefined}
        onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate') onCycle(); }}
      >
        <BrickCard width={width} face={face} say={say} />
        <Animated.View pointerEvents="none" style={[styles.dim, { opacity: dim }]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { marginTop: 8 },
  card: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', borderRadius: 10 },
});
