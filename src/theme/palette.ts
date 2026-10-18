import { useTheme } from './ThemeContext';

/**
 * The redesign's colour system (Fasla Redesign v2). Keys are the design's dark hex values, so a
 * style from the design file ports over literally: `var(--c17171A)` becomes `pal.c17171A`.
 * The light theme swaps each one for the design's own light counterpart.
 */
const DARK = {
  c0B0B0D: '#0B0B0D', c0F0F11: '#0F0F11', c111113: '#111113', c141417: '#141417', c17171A: '#17171A',
  c1C1C20: '#1C1C20', c1F1F23: '#1F1F23', c202024: '#202024', c222226: '#222226', c232327: '#232327',
  c26262B: '#26262B', c2A2A2F: '#2A2A2F', c3A3A40: '#3A3A40',
  cF5F5F2: '#F5F5F2', cD8D8DC: '#D8D8DC', cB4B4BA: '#B4B4BA', c9A9AA0: '#9A9AA0', c85858C: '#85858C', c6E6E75: '#6E6E75',
  cFF5A5F: '#FF5A5F', cFF8A8D: '#FF8A8D', c3DDC84: '#3DDC84',
  c1A0D0E: '#1A0D0E', c1C0E10: '#1C0E10', c1E0E10: '#1E0E10', c241012: '#241012', c24100F: '#24100F', c2A1012: '#2A1012',
  c2A1416: '#2A1416', c150C0D: '#150C0D', c160B0C: '#160B0C', c2A0E10: '#2A0E10', c3A1214: '#3A1214', c4A1215: '#4A1215',
  c1A0B0C: '#1A0B0C', c3A1A1C: '#3A1A1C', c4A1A1D: '#4A1A1D', c5A1C1F: '#5A1C1F', c3A1416: '#3A1416', c9A6A6C: '#9A6A6C',
  c3A2224: '#3A2224', c7A3236: '#7A3236', cC9A3A5: '#C9A3A5', c2A1A1B: '#2A1A1B',
  tab: 'rgba(23,23,26,0.92)', g60: 'rgba(11,11,13,0.6)', w06: 'rgba(255,255,255,0.06)', scrim: 'rgba(0,0,0,0.65)',
};

export type Palette = typeof DARK;

const LIGHT: Palette = {
  c0B0B0D: '#F4F2EE', c0F0F11: '#FFFFFF', c111113: '#F7F5F1', c141417: '#ECE9E4', c17171A: '#FFFFFF',
  c1C1C20: '#F1EEE9', c1F1F23: '#EFECE6', c202024: '#EAE7E1', c222226: '#EFECE6', c232327: '#E7E3DC',
  c26262B: '#E7E3DC', c2A2A2F: '#DCD8D0', c3A3A40: '#CBC6BD',
  cF5F5F2: '#141416', cD8D8DC: '#2A2A2E', cB4B4BA: '#45454B', c9A9AA0: '#66666C', c85858C: '#76767C', c6E6E75: '#8A8A90',
  cFF5A5F: '#D3161D', cFF8A8D: '#C0141B', c3DDC84: '#1E9E57',
  c1A0D0E: '#FCEBEC', c1C0E10: '#FCE9EA', c1E0E10: '#FBE6E7', c241012: '#FADFE1', c24100F: '#F9DEDF', c2A1012: '#F8DADC',
  c2A1416: '#FBE3E4', c150C0D: '#FBEEEE', c160B0C: '#FBEDED', c2A0E10: '#F7D3D5', c3A1214: '#F6CDD0', c4A1215: '#F2BEC1',
  c1A0B0C: '#FBEAEB', c3A1A1C: '#F2C3C6', c4A1A1D: '#EFB9BC', c5A1C1F: '#E9A9AD', c3A1416: '#F3D0D2', c9A6A6C: '#B07A7D',
  c3A2224: '#EFD0D2', c7A3236: '#E79A9E', cC9A3A5: '#9A5D61', c2A1A1B: '#F0D6D8',
  tab: 'rgba(255,255,255,0.9)', g60: 'rgba(255,255,255,0.75)', w06: 'rgba(0,0,0,0.05)', scrim: 'rgba(0,0,0,0.45)',
};

/** Colours that are the same in both themes. */
export const RED = '#E5242B';
export const RED_HOVER = '#F0353C';
export const INK = '#0B0B0C';
export const WHITE = '#FFFFFF';

export const PALETTES = { dark: DARK, light: LIGHT };

export function usePalette(): Palette {
  return useTheme().mode === 'light' ? LIGHT : DARK;
}
