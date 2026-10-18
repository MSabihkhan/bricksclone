import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutChangeEvent, Platform } from 'react-native';

/**
 * How much bottom padding a bottom sheet needs so its inputs stay above the keyboard.
 *
 * Android may or may not resize the window when the keyboard opens: `adjustResize` is
 * ignored under the edge-to-edge behaviour enforced for apps targeting API 35+, and Modal
 * windows differ again. Rather than guess, compare the container's height now against its
 * height with the keyboard closed: whatever the OS already took away doesn't need padding.
 */
export function computeKeyboardInset(keyboardHeight: number, baselineHeight: number, currentHeight: number): number {
  if (keyboardHeight <= 0) return 0;
  const alreadyResized = Math.max(0, baselineHeight - currentHeight);
  return Math.max(0, Math.round(keyboardHeight - alreadyResized));
}

export function useKeyboardInset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const baseline = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    // Only learn the "keyboard closed" height while the keyboard is closed.
    if (keyboardHeight === 0 || baseline.current === 0) baseline.current = Math.max(baseline.current, height);
    setCurrentHeight(height);
  };

  const inset = computeKeyboardInset(keyboardHeight, baseline.current || currentHeight, currentHeight || baseline.current);
  return { inset, keyboardOpen: keyboardHeight > 0, onContainerLayout };
}
