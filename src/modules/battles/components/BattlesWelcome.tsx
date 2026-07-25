import { Box, Typography, Button, Paper, Stack, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { APP_VERSION } from '@shared/constants/version';

interface BattlesWelcomeProps {
  onNewBattle: () => void;
  onReturnToHub?: () => void;
}

export function BattlesWelcome({ onNewBattle, onReturnToHub }: BattlesWelcomeProps) {
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
            Abstract space combat from <em>The Externals</em> — v{APP_VERSION}
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
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            v1: ship-vs-ship space engagements only. Custom units and the External ship catalogue
            are available; bombardment, ground forces, and warship import will follow.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
