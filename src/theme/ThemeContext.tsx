import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Theme, defaultTheme, themes, ColorMode } from './index';
import { db } from '../db';

export const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeControls {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
}

export const ThemeControlsContext = createContext<ThemeControls>({
  mode: 'dark',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('dark');

  useEffect(() => {
    let isMounted = true;
    async function loadAppearance() {
      try {
        const appearance = await db.settings.get('appearance');
        if (isMounted && appearance === 'light') {
          setModeState('light');
        }
      } catch (err) {
        console.error('Failed to load appearance setting', err);
      }
    }
    loadAppearance();
    return () => { isMounted = false; };
  }, []);

  // Persist alongside the state change so the choice applies immediately instead of
  // waiting for the next app launch.
  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    db.settings.set('appearance', next).catch(() => {});
  }, []);

  const controls = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeControlsContext.Provider value={controls}>
      <ThemeContext.Provider value={themes[mode]}>
        {children}
      </ThemeContext.Provider>
    </ThemeControlsContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useThemeControls(): ThemeControls {
  return useContext(ThemeControlsContext);
}
