import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Animated, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (val: number) => void;
  accentColor: string;
}

export function Slider({ value, min, max, step = 1, onValueChange, accentColor }: SliderProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  // Compute initial percentage
  const range = max - min;
  const initialPct = range > 0 ? (value - min) / range : 0;
  
  const position = useRef(new Animated.Value(initialPct)).current;
  const lastPct = useRef(initialPct);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // optionally show something on press
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidth > 0) {
          let newPct = lastPct.current + gestureState.dx / trackWidth;
          newPct = Math.max(0, Math.min(1, newPct));
          
          const rawValue = min + newPct * range;
          const snappedValue = Math.round((rawValue - min) / step) * step + min;
          const snappedPct = range > 0 ? (snappedValue - min) / range : 0;
          
          position.setValue(snappedPct);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (trackWidth > 0) {
          let newPct = lastPct.current + gestureState.dx / trackWidth;
          newPct = Math.max(0, Math.min(1, newPct));
          
          const rawValue = min + newPct * range;
          const snappedValue = Math.round((rawValue - min) / step) * step + min;
          const finalValue = Math.max(min, Math.min(max, snappedValue));
          const finalPct = range > 0 ? (finalValue - min) / range : 0;
          
          lastPct.current = finalPct;
          position.setValue(finalPct);
          onValueChange(finalValue);
        }
      },
    })
  ).current;

  // React to external value changes
  React.useEffect(() => {
    const pct = range > 0 ? (value - min) / range : 0;
    lastPct.current = pct;
    position.setValue(pct);
  }, [value, min, max, range, position]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const fillWidth = position.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth > 0 ? trackWidth : 0]
  });

  return (
    <View style={styles.container}>
      <View
        style={[styles.track, { backgroundColor: theme.colors.track }]}
        onLayout={onTrackLayout}
      >
        <Animated.View style={[styles.fill, { backgroundColor: accentColor, width: fillWidth }]} />
      </View>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 12, // Half of thumb to allow overflow
  },
  track: {
    height: 6,
    borderRadius: 99,
    width: '100%',
    flexDirection: 'row',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  thumb: {
    position: 'absolute',
    left: -12, // center the thumb over 0%
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
