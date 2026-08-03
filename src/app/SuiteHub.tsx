import type { ReactNode } from 'react';
import {
  AppBar, Box, ButtonBase, Chip, Container, IconButton, Paper, Stack, Toolbar,
  Tooltip, Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import RouteIcon from '@mui/icons-material/Route';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { ThemeMode } from './theme';

interface SuiteHubProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onOpenWarships: () => void;
  onOpenBattles: () => void;
  onOpenTravel: () => void;
  onOpenCharacters: () => void;
  onShowAbout: () => void;
}

interface ToolRowProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

function ToolRow({ title, description, icon, onClick }: ToolRowProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '48px minmax(0, 1fr) auto',
        gap: 2,
        alignItems: 'center',
        textAlign: 'left',
        px: 2.5,
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.selected',
          color: 'primary.main',
          borderRadius: 1,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </Box>
      <ArrowForwardIcon color="action" />
    </ButtonBase>
  );
}

export function SuiteHub({
  themeMode,
  onThemeModeChange,
  onOpenWarships,
  onOpenBattles,
  onOpenTravel,
  onOpenCharacters,
  onShowAbout,
}: SuiteHubProps) {
  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    onThemeModeChange(modes[(modes.indexOf(themeMode) + 1) % modes.length]);
  };

  const themeIcon = themeMode === 'dark' ? <DarkModeIcon />
    : themeMode === 'light' ? <LightModeIcon />
      : <SettingsBrightnessIcon />;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Box component="img" src="./logo.png" alt="" sx={{ width: 32, height: 32, mr: 1.5, borderRadius: 0.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{APP_NAME}</Typography>
          <Tooltip title="About Alternity Workshop">
            <IconButton onClick={onShowAbout} aria-label="About"><InfoOutlinedIcon /></IconButton>
          </Tooltip>
          <Tooltip title={`Theme: ${themeMode}`}>
            <IconButton onClick={cycleTheme} aria-label="Toggle theme">{themeIcon}</IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ flexGrow: 1, py: { xs: 4, md: 7 } }}>
        <Stack spacing={4}>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
              <Typography variant="h4" component="h1">Choose a tool</Typography>
              <Chip label={`v${APP_VERSION}`} size="small" variant="outlined" />
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Character creation, spacecraft design, travel, and campaign-scale combat.
            </Typography>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">Create</Typography>
            <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
              <ToolRow
                title="Character Creator"
                description="Build and advance heroes with Player's Handbook rules."
                icon={<PersonAddAlt1Icon />}
                onClick={onOpenCharacters}
              />
              <ToolRow
                title="Warships Generator"
                description="Design warships, stations, bases, and carried craft."
                icon={<RocketLaunchIcon />}
                onClick={onOpenWarships}
              />
            </Paper>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">Run a campaign</Typography>
            <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
              <ToolRow
                title="Travel Calculator"
                description="Plan sublight trips and assess imported ship performance."
                icon={<RouteIcon />}
                onClick={onOpenTravel}
              />
              <ToolRow
                title="Battle Resolution"
                description="Resolve space, ground, orbital, and mixed engagements."
                icon={<GpsFixedIcon />}
                onClick={onOpenBattles}
              />
            </Paper>
          </Box>
        </Stack>
      </Container>

      <Box component="footer" sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">{APP_NAME} v{APP_VERSION}</Typography>
      </Box>
    </Box>
  );
}

export default SuiteHub;