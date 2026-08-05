import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

import type { DimensionValue } from 'react-native';

export interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  width?: DimensionValue;
}

export function SegmentedControl({ options, value, onChange, width = '100%' }: SegmentedControlProps) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  const activeIndex = options.findIndex((o) => o.value === value);
  const segmentWidth = containerWidth / options.length;

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(anim, {
        toValue: activeIndex * segmentWidth,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, segmentWidth, anim]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.container, { width, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { width: segmentWidth, transform: [{ translateX: anim }], backgroundColor: theme.colors.accent },
          ]}
        />
      )}
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={styles.segment}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : [styles.labelInactive, { color: theme.colors.muted }]]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 15,
    borderWidth: 1,
    padding: 3,
    height: 38,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 13,
  },
  labelActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  labelInactive: {
    fontWeight: '600',
  },
});
