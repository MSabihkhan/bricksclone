import React from 'react';
import { ViewStyle } from 'react-native';
import { FaslaMark } from './FaslaMark';

/** Mark shown beside a key (lists, pairing screens, focus screen): the fasla 1a tile. */
export function BrickMark({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <FaslaMark size={size} style={style} />;
}
