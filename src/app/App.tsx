import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import WarshipsModule from '@warships/WarshipsModule';
import BattlesModule from '@battles/BattlesModule';
import TravelModule from '@travel/TravelModule';
import CharactersModule from '@characters/CharactersModule';
import StarSystemGeneratorModule from '@campaign/StarSystemGeneratorModule';
import CivilizationBuilderModule from '@campaign/CivilizationBuilderModule';
import { SuiteHub } from './SuiteHub';
import { AboutDialog } from './AboutDialog';
import { KeyboardShortcutsDialog, type ShortcutContext } from './KeyboardShortcutsDialog';
import { loadAllGameData } from '@shared/services/dataLoader';
import { APP_NAME } from '@shared/constants/version';
import '@shared/types/electron.d.ts';
import type { ThemeMode } from './theme';

type SuiteMode =
  | 'loading'
  | 'hub'
  | 'warships'
  | 'battles'
  | 'travel'
  | 'characters'
  | 'star-systems'
  | 'civilizations';

interface AppProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

function App({ themeMode, onThemeModeChange }: AppProps) {
  const [suiteMode, setSuiteMode] = useState<SuiteMode>('loading');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  // Document-owning modules handle this event themselves so they can protect
  // unsaved work. Stateless tools can return directly through the shell.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onReturnToHub
      || suiteMode === 'warships'
      || suiteMode === 'battles'
      || suiteMode === 'characters'
      || suiteMode === 'star-systems'
      || suiteMode === 'civilizations') return;
    const handler = () => setSuiteMode('hub');
    api.onReturnToHub(handler);
    return () => {
      api.removeAllListeners('menu-return-to-hub');
    };
  }, [suiteMode]);

  useEffect(() => {
    const api = window.electronAPI;
    // Warships still owns these dialogs while its module is mounted.
    if (!api || suiteMode === 'warships') return;
    api.onShowAbout(() => setAboutOpen(true));
    api.onShowShortcuts(() => setShortcutsOpen(true));
    return () => {
      api.removeAllListeners('menu-show-about');
      api.removeAllListeners('menu-show-shortcuts');
    };
  }, [suiteMode]);

  const handleReturnToHub = useCallback(() => {
    setSuiteMode('hub');
  }, []);

  const handleOpenWarships = useCallback(() => {
    setSuiteMode('warships');
  }, []);

  const handleOpenBattles = useCallback(() => {
    setSuiteMode('battles');
  }, []);

  const handleOpenTravel = useCallback(() => {
    setSuiteMode('travel');
  }, []);

  const handleOpenCharacters = useCallback(() => {
    setSuiteMode('characters');
  }, []);

  const handleOpenStarSystems = useCallback(() => {
    setSuiteMode('star-systems');
  }, []);

  const handleOpenCivilizations = useCallback(() => {
    setSuiteMode('civilizations');
  }, []);

  const shortcutContext: ShortcutContext = suiteMode === 'characters' ? 'characters'
    : suiteMode === 'battles' ? 'battles'
      : suiteMode === 'travel' ? 'travel'
        : 'hub';

  const globalDialogs = suiteMode === 'warships' ? null : (
    <>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        context={shortcutContext}
      />
    </>
  );

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

  if (suiteMode === 'battles') {
    return (
      <>
        <BattlesModule
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          onReturnToHub={handleReturnToHub}
        />
        {globalDialogs}
      </>
    );
  }

  if (suiteMode === 'travel') {
    return (
      <>
        <TravelModule
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          onReturnToHub={handleReturnToHub}
        />
        {globalDialogs}
      </>
    );
  }

  if (suiteMode === 'characters') {
    return (
      <>
        <CharactersModule
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          onReturnToHub={handleReturnToHub}
        />
        {globalDialogs}
      </>
    );
  }

  if (suiteMode === 'star-systems') {
    return (
      <>
        <StarSystemGeneratorModule
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          onReturnToHub={handleReturnToHub}
        />
        {globalDialogs}
      </>
    );
  }

  if (suiteMode === 'civilizations') {
    return (
      <>
        <CivilizationBuilderModule
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          onReturnToHub={handleReturnToHub}
        />
        {globalDialogs}
      </>
    );
  }

  // suiteMode === 'hub'
  return (
    <>
      <SuiteHub
        themeMode={themeMode}
        onThemeModeChange={onThemeModeChange}
        onOpenWarships={handleOpenWarships}
        onOpenBattles={handleOpenBattles}
        onOpenTravel={handleOpenTravel}
        onOpenCharacters={handleOpenCharacters}
        onOpenStarSystems={handleOpenStarSystems}
        onOpenCivilizations={handleOpenCivilizations}
        onShowAbout={() => setAboutOpen(true)}
      />
      {globalDialogs}
    </>
  );
}

export default App;
