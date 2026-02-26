import { createTheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'system';

const sharedTypography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 500,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 500,
  },
};

const sharedComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        margin: 0,
        padding: 0,
      },
    },
  },
};

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#ce93d8',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: sharedTypography,
  components: sharedComponents,
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: sharedTypography,
  components: sharedComponents,
});

/**
 * Resolve a ThemeMode to a concrete 'light' | 'dark' palette mode.
 * When mode is 'system', uses the OS preference via matchMedia.
 */
export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/** Get the MUI theme object for a given mode */
export function getTheme(mode: ThemeMode) {
  return resolveThemeMode(mode) === 'dark' ? darkTheme : lightTheme;
}

/** Legacy export for backward compatibility */
export const theme = darkTheme;
