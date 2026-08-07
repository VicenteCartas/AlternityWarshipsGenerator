import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  AppBar, Box, Container, IconButton, Toolbar, Tooltip, Typography,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import { WorkshopHomeBar } from '@shared/components';
import type { ThemeMode } from '@app/theme';

interface CampaignToolShellProps {
  title: string;
  mode: 'sector-editor' | 'star-system-editor' | 'civilization-editor' | 'artifact-editor';
  icon: ReactNode;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
  children: ReactNode;
}

export function CampaignToolShell({
  title,
  mode,
  icon,
  themeMode,
  onThemeModeChange,
  onReturnToHub,
  children,
}: CampaignToolShellProps) {
  useEffect(() => {
    window.electronAPI?.setBuilderMode(mode);
  }, [mode]);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    onThemeModeChange(modes[(modes.indexOf(themeMode) + 1) % modes.length]);
  };
  const themeIcon = themeMode === 'dark' ? <DarkModeIcon />
    : themeMode === 'light' ? <LightModeIcon />
      : <SettingsBrightnessIcon />;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WorkshopHomeBar onReturnToHub={onReturnToHub} />
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Box sx={{ mr: 1.5, display: 'grid', placeItems: 'center' }}>{icon}</Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{APP_NAME} - {title}</Typography>
          <Tooltip title={`Theme: ${themeMode}`}>
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Toggle theme">{themeIcon}</IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>{children}</Container>
      <Box component="footer" sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">{APP_NAME} v{APP_VERSION}</Typography>
      </Box>
    </Box>
  );
}