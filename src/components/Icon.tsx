import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

export type IconName =
  | 'grid'
  | 'barChart'
  | 'settings'
  | 'social'
  | 'gamepad'
  | 'film'
  | 'newspaper'
  | 'shopping'
  | 'message'
  | 'ban'
  | 'target'
  | 'check'
  | 'clock'
  | 'shield'
  | 'flame'
  | 'zap'
  | 'lock'
  | 'bell'
  | 'coffee'
  | 'moon'
  | 'chevron'
  | 'calendar'
  | 'smartphone'
  | 'info'
  | 'play'
  | 'stop'
  | 'radio'
  | 'plus'
  | 'x'
  | 'back'
  | 'monitor'
  | 'bed'
  | 'building'
  | 'music'
  | 'car'
  | 'timer';

export interface IconProps {
  name: IconName;
  size: number;
  color: string;
  fill?: string;
}

export function Icon({ name, size, color, fill = 'none' }: IconProps) {
  const S: Record<IconName, React.ReactElement[]> = {
    grid: [
      <Rect key="1" x="3" y="3" width="7" height="7" rx="1" />,
      <Rect key="2" x="14" y="3" width="7" height="7" rx="1" />,
      <Rect key="3" x="14" y="14" width="7" height="7" rx="1" />,
      <Rect key="4" x="3" y="14" width="7" height="7" rx="1" />,
    ],
    barChart: [
      <Path key="1" d="M3 3v18h18" />,
      <Path key="2" d="M18 17V9" />,
      <Path key="3" d="M13 17V5" />,
      <Path key="4" d="M8 17v-3" />,
    ],
    settings: [
      <Path
        key="1"
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      />,
      <Circle key="2" cx="12" cy="12" r="3" />,
    ],
    social: [
      <Path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
      <Circle key="2" cx="9" cy="7" r="4" />,
      <Path key="3" d="M22 21v-2a4 4 0 0 0-3-3.87" />,
      <Path key="4" d="M16 3.13a4 4 0 0 1 0 7.75" />,
    ],
    gamepad: [
      <Line key="1" x1="6" y1="11" x2="10" y2="11" />,
      <Line key="2" x1="8" y1="9" x2="8" y2="13" />,
      <Line key="3" x1="15" y1="12" x2="15.01" y2="12" />,
      <Line key="4" x1="18" y1="10" x2="18.01" y2="10" />,
      <Path
        key="5"
        d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59c-.01.05-.01.1-.02.15C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.69-7.26 0-.05-.01-.1-.02-.15A4 4 0 0 0 17.32 5z"
      />,
    ],
    film: [
      <Rect key="1" x="2" y="2" width="20" height="20" rx="2.18" />,
      <Line key="2" x1="7" y1="2" x2="7" y2="22" />,
      <Line key="3" x1="17" y1="2" x2="17" y2="22" />,
      <Line key="4" x1="2" y1="12" x2="22" y2="12" />,
      <Line key="5" x1="2" y1="7" x2="7" y2="7" />,
      <Line key="6" x1="2" y1="17" x2="7" y2="17" />,
      <Line key="7" x1="17" y1="17" x2="22" y2="17" />,
      <Line key="8" x1="17" y1="7" x2="22" y2="7" />,
    ],
    newspaper: [
      <Path key="1" d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />,
      <Path key="2" d="M18 14h-8" />,
      <Path key="3" d="M15 18h-5" />,
      <Path key="4" d="M10 6h8v4h-8V6Z" />,
    ],
    shopping: [
      <Path key="1" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />,
      <Path key="2" d="M3 6h18" />,
      <Path key="3" d="M16 10a4 4 0 0 1-8 0" />,
    ],
    message: [<Path key="1" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />],
    ban: [
      <Circle key="1" cx="12" cy="12" r="10" />,
      <Line key="2" x1="4.93" y1="4.93" x2="19.07" y2="19.07" />,
    ],
    target: [
      <Circle key="1" cx="12" cy="12" r="10" />,
      <Circle key="2" cx="12" cy="12" r="6" />,
      <Circle key="3" cx="12" cy="12" r="2" />,
    ],
    check: [<Polyline key="1" points="20 6 9 17 4 12" />],
    clock: [
      <Circle key="1" cx="12" cy="12" r="10" />,
      <Polyline key="2" points="12 6 12 12 16 14" />,
    ],
    shield: [<Path key="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />],
    flame: [
      <Path key="1" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    ],
    zap: [<Polygon key="1" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />],
    lock: [
      <Rect key="1" x="3" y="11" width="18" height="11" rx="2" />,
      <Path key="2" d="M7 11V7a5 5 0 0 1 10 0v4" />,
    ],
    bell: [
      <Path key="1" d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />,
      <Path key="2" d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
    ],
    coffee: [
      <Path key="1" d="M17 8h1a4 4 0 1 1 0 8h-1" />,
      <Path key="2" d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />,
      <Line key="3" x1="6" y1="2" x2="6" y2="4" />,
      <Line key="4" x1="10" y1="2" x2="10" y2="4" />,
      <Line key="5" x1="14" y1="2" x2="14" y2="4" />,
    ],
    moon: [<Path key="1" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />],
    chevron: [<Polyline key="1" points="9 18 15 12 9 6" />],
    calendar: [
      <Rect key="1" x="3" y="4" width="18" height="18" rx="2" />,
      <Line key="2" x1="16" y1="2" x2="16" y2="6" />,
      <Line key="3" x1="8" y1="2" x2="8" y2="6" />,
      <Line key="4" x1="3" y1="10" x2="21" y2="10" />,
    ],
    smartphone: [
      <Rect key="1" x="5" y="2" width="14" height="20" rx="2" />,
      <Path key="2" d="M12 18h.01" />,
    ],
    info: [
      <Circle key="1" cx="12" cy="12" r="10" />,
      <Path key="2" d="M12 16v-4" />,
      <Path key="3" d="M12 8h.01" />,
    ],
    play: [<Polygon key="1" points="6 3 20 12 6 21 6 3" />],
    stop: [<Rect key="1" x="6" y="6" width="12" height="12" rx="2" />],
    radio: [
      <Path key="1" d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />,
      <Path key="2" d="M7.8 16.3a5.7 5.7 0 0 1 0-8.6" />,
      <Path key="3" d="M16.2 7.7a5.7 5.7 0 0 1 0 8.6" />,
      <Path key="4" d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />,
      <Circle key="5" cx="12" cy="12" r="2" />,
    ],
    plus: [
      <Line key="1" x1="12" y1="5" x2="12" y2="19" />,
      <Line key="2" x1="5" y1="12" x2="19" y2="12" />,
    ],
    x: [
      <Line key="1" x1="18" y1="6" x2="6" y2="18" />,
      <Line key="2" x1="6" y1="6" x2="18" y2="18" />,
    ],
    back: [<Polyline key="1" points="15 18 9 12 15 6" />],
    monitor: [
      <Rect key="1" x="2" y="3" width="20" height="14" rx="2" />,
      <Line key="2" x1="8" y1="21" x2="16" y2="21" />,
      <Line key="3" x1="12" y1="17" x2="12" y2="21" />,
    ],
    bed: [
      <Path key="1" d="M2 4v16" />,
      <Path key="2" d="M2 8h18a2 2 0 0 1 2 2v10" />,
      <Path key="3" d="M2 17h20" />,
      <Path key="4" d="M6 8v9" />,
    ],
    building: [
      <Rect key="1" x="4" y="2" width="16" height="20" rx="2" />,
      <Path key="2" d="M9 22v-4h6v4" />,
      <Path key="3" d="M8 6h.01" />,
      <Path key="4" d="M16 6h.01" />,
      <Path key="5" d="M8 10h.01" />,
      <Path key="6" d="M16 10h.01" />,
      <Path key="7" d="M8 14h.01" />,
      <Path key="8" d="M16 14h.01" />,
    ],
    music: [
      <Path key="1" d="M9 18V5l12-2v13" />,
      <Circle key="2" cx="6" cy="18" r="3" />,
      <Circle key="3" cx="18" cy="16" r="3" />,
    ],
    car: [
      <Path key="1" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />,
      <Circle key="2" cx="7" cy="17" r="2" />,
      <Circle key="3" cx="17" cy="17" r="2" />,
    ],
    timer: [
      <Line key="1" x1="10" y1="2" x2="14" y2="2" />,
      <Line key="2" x1="12" y1="14" x2="15" y2="11" />,
      <Circle key="3" cx="12" cy="14" r="8" />,
    ],
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {S[name]}
    </Svg>
  );
}
