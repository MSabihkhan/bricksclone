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
  bg: '#0F1115',
  card: '#181B20',
  card2: '#1F232B',
  border: '#2A2E37',
  text: '#FFFFFF',
  muted: '#8A9099',
  faint: '#5A6069',
  green: '#3DD68C',
  blue: '#4DA3FF',
  track: '#23272F',
  accent: '#E82127',
  accentSoft: '#2A1517',
  accentGlow: '#E82127',
  danger: '#E82127',
};

export const lightColors: ColorTokens = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  card2: '#F0F2F5',
  border: '#E4E7EC',
  text: '#0F1115',
  muted: '#6B7280',
  faint: '#9AA1AD',
  green: '#12A971',
  blue: '#2F7DE0',
  track: '#EAEDF2',
  accent: '#E82127',
  accentSoft: '#FBE5E2',
  accentGlow: '#E82127',
  danger: '#E82127',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  screenX: 20,
  screenTop: 8,
  screenBottom: 28,
};

export const radius = {
  sm: 10,
  md: 13,
  lg: 16,
  xl: 18,
  xxl: 20,
  hero: 24,
  pill: 99,
  input: 16,
};

export const typography = {
  display: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6 } as const,
  statLarge: { fontSize: 42, fontWeight: '800', letterSpacing: -1.7 } as const,
  onboardingTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 36 } as const,
  screenTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.75 } as const,
  heroTime: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, lineHeight: 38 } as const,
  timer: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 52 } as const,
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 } as const,
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 } as const,
  title: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 } as const,
  body: { fontSize: 14, fontWeight: '600' } as const,
  bodyMuted: { fontSize: 14, fontWeight: '500' } as const,
  label: { fontSize: 12, fontWeight: '600' } as const,
  caption: { fontSize: 11, fontWeight: '600' } as const,
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 } as const,
  tabLabel: { fontSize: 11, fontWeight: '700' } as const,
  button: { fontSize: 15, fontWeight: '800' } as const,
  metricValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 } as const,
  metricLabel: { fontSize: 11, fontWeight: '600' } as const,
} as const;

export const layout = {
  cardRadius: radius.xxl as number,
  cardPadding: 20 as number,
  buttonHeight: 54 as number,
  inputHeight: 58 as number,
  tabBarHeight: 80 as number,
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
  fast: 150,
  normal: 300,
  slow: 700,
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
