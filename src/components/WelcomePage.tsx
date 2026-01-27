import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface WelcomePageProps {
  onNewWarship: () => void;
  onLoadWarship: () => void;
}

export function WelcomePage({ onNewWarship, onLoadWarship }: WelcomePageProps) {
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
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 500,
          width: '100%',
        }}
      >
        <RocketLaunchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h3" component="h1" gutterBottom>
          Alternity Warship Generator
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Design and build starships for the Alternity RPG system
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={onNewWarship}
            fullWidth
            sx={{ py: 1.5 }}
          >
            New Warship
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<FolderOpenIcon />}
            onClick={onLoadWarship}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Load Warship
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
