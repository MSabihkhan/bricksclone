export type ColorMode = 'dark' | 'light';

export interface ColorTokens {
  bg: string;
  card: string;
  card2: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  green: string;
  blue: string;
  track: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  danger: string;
}

export const darkColors: ColorTokens = {
  bg: '#0B0B0D',
  card: '#17171A',
  card2: '#141417',
  border: '#232327',
  text: '#F5F5F2',
  muted: '#9A9AA0',
  faint: '#85858C',
  green: '#3DDC84',
  blue: '#F5F5F2',
  track: '#26262B',
  accent: '#E5242B',
  accentSoft: '#2A1416',
  accentGlow: '#E5242B',
  danger: '#FF5A5F',
};

export const lightColors: ColorTokens = {
  bg: '#F4F2EE',
  card: '#FFFFFF',
  card2: '#ECE9E4',
  border: '#E7E3DC',
  text: '#141416',
  muted: '#66666C',
  faint: '#76767C',
  green: '#1E9E57',
  blue: '#141416',
  track: '#E7E3DC',
  accent: '#E5242B',
  accentSoft: '#FBE3E4',
  accentGlow: '#E5242B',
  danger: '#D3161D',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 22,
  xxxl: 32,
  screenX: 22,
  screenTop: 12,
  screenBottom: 24,
};

export const radius = {
  sm: 10,
  md: 13,
  lg: 17,
  xl: 20,
  xxl: 20,
  hero: 24,
  pill: 99,
  input: 16,
};

export const typography = {
  display: { fontFamily: 'BricolageGrotesque', fontSize: 40, fontWeight: '400', letterSpacing: -2.0, lineHeight: 43 } as const,
  statLarge: { fontFamily: 'IBMPlexMono-Medium', fontSize: 42, fontWeight: '500', letterSpacing: -1.2 } as const,
  onboardingTitle: { fontFamily: 'BricolageGrotesque', fontSize: 34, fontWeight: '400', letterSpacing: -1.8, lineHeight: 38 } as const,
  screenTitle: { fontFamily: 'BricolageGrotesque', fontSize: 30, fontWeight: '400', letterSpacing: -1.8, lineHeight: 34 } as const,
  heroTime: { fontFamily: 'IBMPlexMono-Medium', fontSize: 40, fontWeight: '500', letterSpacing: -1.2, lineHeight: 44 } as const,
  timer: { fontFamily: 'IBMPlexMono-Regular', fontSize: 46, fontWeight: '400', letterSpacing: -1.8, lineHeight: 52 } as const,
  cardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 } as const,
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 } as const,
  title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 } as const,
  body: { fontSize: 14, fontWeight: '500', lineHeight: 20 } as const,
  bodyMuted: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as const,
  label: { fontFamily: 'IBMPlexMono-Regular', fontSize: 12, fontWeight: '400', letterSpacing: -0.15 } as const,
  caption: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, fontWeight: '400', letterSpacing: -0.1 } as const,
  eyebrow: { fontFamily: 'IBMPlexMono-Medium', fontSize: 11, fontWeight: '500', letterSpacing: 0.25 } as const,
  tabLabel: { fontSize: 11, fontWeight: '500' } as const,
  button: { fontSize: 15, fontWeight: '700' } as const,
  metricValue: { fontFamily: 'IBMPlexMono-Medium', fontSize: 20, fontWeight: '500', letterSpacing: -0.4 } as const,
  metricLabel: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, fontWeight: '400' } as const,
} as const;

export const layout = {
  cardRadius: radius.xxl as number,
  cardPadding: 20 as number,
  buttonHeight: 56 as number,
  inputHeight: 58 as number,
  tabBarHeight: 76 as number,
  cardBorderRadius: 24 as number,
};

export const iconSizes = {
  tab: 23,
  cardIcon: 22,
  cardIconBox: 40,
  metricIcon: 18,
  metricIconBox: 34,
  rowIcon: 18,
  rowIconBox: 36,
  switchTrack: { width: 46, height: 28, borderRadius: 99 },
  switchKnob: { width: 20, height: 20 },
};

export const timing = {
  press: 120,
  fast: 150,
  card: 180,
  normal: 260,
  sheetIn: 280,
  sheetOut: 210,
  slow: 400,
};

export function alpha(hex: string, a: number): string {
  const h = String(hex).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export interface Theme {
  mode: ColorMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  layout: typeof layout;
  iconSizes: typeof iconSizes;
  timing: typeof timing;
  alpha: (hex: string, a: number) => string;
}

export const themes: Record<ColorMode, Theme> = {
  dark: {
    mode: 'dark',
    colors: darkColors,
    spacing,
    radius,
    typography,
    layout,
    iconSizes,
    timing,
    alpha,
  },
  light: {
    mode: 'light',
    colors: lightColors,
    spacing,
    radius,
    typography,
    layout,
    iconSizes,
    timing,
    alpha,
  },
};

export const defaultTheme: Theme = themes.dark;
