import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, defaultTheme, themes, ColorMode } from './index';
import { db } from '../db';

export const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('dark');

  useEffect(() => {
    let isMounted = true;
    async function loadAppearance() {
      try {
        const appearance = await db.settings.get('appearance');
        if (isMounted && appearance === 'light') {
          setMode('light');
        }
      } catch (err) {
        console.error('Failed to load appearance setting', err);
      }
    }
    loadAppearance();
    return () => { isMounted = false; };
  }, []);

  return (
    <ThemeContext.Provider value={themes[mode]}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
