import { Box, Typography, Button, Paper, Stack, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import ExtensionIcon from '@mui/icons-material/Extension';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { APP_VERSION } from '@shared/constants/version';

interface BattlesWelcomeProps {
  onNewBattle: () => void;
  onOpenBattle?: () => void;
  onOpenLibrary?: () => void;
  onManageMods?: () => void;
  onReturnToHub?: () => void;
}

export function BattlesWelcome({
  onNewBattle, onOpenBattle, onOpenLibrary, onManageMods, onReturnToHub,
}: BattlesWelcomeProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 4,
        position: 'relative',
      }}
    >
      {onReturnToHub && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onReturnToHub}
          sx={{ position: 'absolute', top: 16, left: 16 }}
        >
          Back to Hub
        </Button>
      )}
      <Paper elevation={3} sx={{ p: 4, maxWidth: 700, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <GpsFixedIcon color="primary" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Battle Resolution
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Abstract combat from <em>The Externals</em> — v{APP_VERSION}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={onNewBattle}
            fullWidth
          >
            New Battle
          </Button>
          {onOpenBattle && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<FolderOpenIcon />}
              onClick={onOpenBattle}
              fullWidth
            >
              Open Battle
            </Button>
          )}
          {onOpenLibrary && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<CollectionsBookmarkIcon />}
              onClick={onOpenLibrary}
              fullWidth
            >
              Battle Library
            </Button>
          )}
          {onManageMods && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<ExtensionIcon />}
              onClick={onManageMods}
              fullWidth
            >
              Manage Mods
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Space engagements, ground battles, orbital bombardment and mixed engagements, using
            the External unit catalogue, system defenses, or units of your own.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
