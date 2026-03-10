import { StrictMode, useState, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { getTheme, type ThemeMode } from './theme'
import './index.css'
import App from './App.tsx'

const THEME_STORAGE_KEY = 'alternity-theme-mode';

function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Use localStorage as immediate default (sync); Electron settings override in useEffect
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidThemeMode(stored)) return stored;
    return 'dark';
  });

  // Hydrate from Electron app settings on mount
  useEffect(() => {
    window.electronAPI?.readAppSettings().then((result) => {
      if (result.success && isValidThemeMode(result.settings?.themeMode)) {
        setThemeMode(result.settings.themeMode);
      }
    });
  }, []);

  // Listen for OS color scheme changes when in 'system' mode
  const [, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Persist preference to both localStorage (dev/web fallback) and Electron settings
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    window.electronAPI?.updateAppSettings(JSON.stringify({ themeMode }));
  }, [themeMode]);

  // Auto-select content of number inputs on focus for quick editing
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        target.select();
      }
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, []);

  const muiTheme = useMemo(() => getTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <App themeMode={themeMode} onThemeModeChange={setThemeMode} />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
