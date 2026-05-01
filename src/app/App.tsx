import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import WarshipsModule from '@warships/WarshipsModule';
import { SuiteHub } from './SuiteHub';
import { AboutDialog } from './AboutDialog';
import { loadAllGameData } from '@shared/services/dataLoader';
import { APP_NAME } from '@shared/constants/version';
import '@shared/types/electron.d.ts';
import type { ThemeMode } from './theme';

type SuiteMode = 'loading' | 'hub' | 'warships';

interface AppProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

function App({ themeMode, onThemeModeChange }: AppProps) {
  const [suiteMode, setSuiteMode] = useState<SuiteMode>('loading');
  const [aboutOpen, setAboutOpen] = useState(false);

  // Load all game data on mount, then transition to the hub.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAllGameData();
      } catch (err) {
        // Errors are surfaced inside the modules themselves; still transition to hub
        // so the user can see something rather than a stuck loading screen.
        console.error('Failed to load game data:', err);
      }
      if (!cancelled) {
        setSuiteMode('hub');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Notify Electron of the current top-level mode so the menu knows what to enable.
  // The warships module reports its own internal mode while it's mounted; when it
  // unmounts (return to hub) we bounce the mode back to 'hub' here.
  useEffect(() => {
    if (suiteMode === 'hub') {
      window.electronAPI?.setBuilderMode('hub');
    }
  }, [suiteMode]);

  // Listen for "Return to Hub" menu IPC event.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onReturnToHub) return;
    const handler = () => setSuiteMode('hub');
    api.onReturnToHub(handler);
    return () => {
      api.removeAllListeners('menu-return-to-hub');
    };
  }, []);

  const handleReturnToHub = useCallback(() => {
    setSuiteMode('hub');
  }, []);

  const handleOpenWarships = useCallback(() => {
    setSuiteMode('warships');
  }, []);

  if (suiteMode === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading {APP_NAME}...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (suiteMode === 'warships') {
    return (
      <WarshipsModule
        themeMode={themeMode}
        onThemeModeChange={onThemeModeChange}
        onReturnToHub={handleReturnToHub}
      />
    );
  }

  // suiteMode === 'hub'
  return (
    <>
      <SuiteHub
        themeMode={themeMode}
        onThemeModeChange={onThemeModeChange}
        onOpenWarships={handleOpenWarships}
        onShowAbout={() => setAboutOpen(true)}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}

export default App;
