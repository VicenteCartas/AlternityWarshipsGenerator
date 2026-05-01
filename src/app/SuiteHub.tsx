import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Container,
  Card,
  CardActionArea,
  CardContent,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import InfoIcon from '@mui/icons-material/Info';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { ThemeMode } from './theme';

interface SuiteHubProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onOpenWarships: () => void;
  onShowAbout: () => void;
}

export function SuiteHub({
  themeMode,
  onThemeModeChange,
  onOpenWarships,
  onShowAbout,
}: SuiteHubProps) {
  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const idx = modes.indexOf(themeMode);
    onThemeModeChange(modes[(idx + 1) % modes.length]);
  };

  const themeIcon =
    themeMode === 'dark' ? <DarkModeIcon /> : themeMode === 'light' ? <LightModeIcon /> : <SettingsBrightnessIcon />;
  const themeLabel = themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'System';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {APP_NAME}
          </Typography>
          <Tooltip title="About">
            <IconButton color="inherit" onClick={onShowAbout} aria-label="About">
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Theme: ${themeLabel} (click to cycle)`}>
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Toggle theme">
              {themeIcon}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 8 } }}>
        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1">
            {APP_NAME}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            A suite of tools for the Alternity sci-fi tabletop RPG
          </Typography>
          <Chip label={`v${APP_VERSION}`} size="small" variant="outlined" />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
            },
          }}
        >
          {/* Warships Generator */}
          <Card elevation={3}>
            <CardActionArea onClick={onOpenWarships} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <RocketLaunchIcon color="primary" fontSize="large" />
                  <Typography variant="h5" component="h2">
                    Warships Generator
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Design warships and stations using the construction rules from the Warships sourcebook.
                  Step-by-step wizard for hulls, armor, weapons, defenses, and more.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>

          {/* Battle Resolution (coming soon) */}
          <Card elevation={1} sx={{ opacity: 0.6 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <GpsFixedIcon color="disabled" fontSize="large" />
                <Typography variant="h5" component="h2" color="text.disabled">
                  Battle Resolution
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                Run abstract space combat encounters using the rules from The Externals.
                Combine your designed warships with the Externals fleet.
              </Typography>
              <Chip label="Coming in v2.0" size="small" />
            </CardContent>
          </Card>
        </Box>

        <Stack direction="row" justifyContent="center" sx={{ mt: 6 }}>
          <Button variant="text" color="inherit" onClick={onShowAbout} startIcon={<InfoIcon />}>
            About {APP_NAME}
          </Button>
        </Stack>
      </Container>

      <Box component="footer" sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">
          {APP_NAME} v{APP_VERSION}
        </Typography>
      </Box>
    </Box>
  );
}

export default SuiteHub;
