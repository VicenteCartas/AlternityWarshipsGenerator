import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Divider,
  Alert,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExtensionIcon from '@mui/icons-material/Extension';
import CollectionsIcon from '@mui/icons-material/Collections';
import RestoreIcon from '@mui/icons-material/Restore';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { APP_VERSION } from '../constants/version';
import { checkForAutoSave, clearAutoSave } from '../hooks/useAutoSave';

interface WelcomePageProps {
  onNewWarship: () => void;
  onLoadWarship: () => void;
  onManageMods: () => void;
  onOpenLibrary?: () => void;
  onRecoverAutoSave?: (content: string) => void;
}

export function WelcomePage({ onNewWarship, onLoadWarship, onManageMods, onOpenLibrary, onRecoverAutoSave }: WelcomePageProps) {
  const [autoSaveContent, setAutoSaveContent] = useState<string | null>(null);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  useEffect(() => {
    // Check for auto-save recovery
    checkForAutoSave().then((content) => {
      if (content) setAutoSaveContent(content);
    });
  }, []);

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
          p: 4,
          maxWidth: 700,
          width: '100%',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="./logo.png"
            alt="Alternity Warship Generator"
            sx={{ width: 64, height: 64, mb: 1.5 }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Alternity Warship Generator
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Design and build starships for the Alternity RPG system — v{APP_VERSION}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Auto-save Recovery */}
        {autoSaveContent && (
          <Alert
            severity="warning"
            icon={<RestoreIcon />}
            sx={{ mb: 3 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  color="warning"
                  size="small"
                  variant="contained"
                  onClick={() => {
                    onRecoverAutoSave?.(autoSaveContent);
                    setAutoSaveContent(null);
                    clearAutoSave();
                  }}
                >
                  Recover
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setAutoSaveContent(null);
                    clearAutoSave();
                  }}
                >
                  Dismiss
                </Button>
              </Box>
            }
          >
            An unsaved design was found from a previous session. Would you like to recover it?
          </Alert>
        )}

        {/* Getting Started */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            size="small"
            startIcon={<RocketLaunchIcon />}
            endIcon={showGettingStarted ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowGettingStarted((prev) => !prev)}
            sx={{ mb: 0.5, textTransform: 'none' }}
          >
            Getting Started
          </Button>
          <Collapse in={showGettingStarted}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Build warships and stations step-by-step using the Alternity Warships sourcebook rules:
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Click <strong>New Design</strong> and choose <em>Warship</em> or <em>Station</em>.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Select a hull — this determines available hull points, toughness, and ship class.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Work through each step (armor, power, engines, weapons…) to fill your hull point budget.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Use the <strong>App Bar</strong> chips at the top to monitor HP, power, and cost at a glance.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Assign systems to <strong>Damage Zones</strong>, then review your design in the <strong>Summary</strong>.
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Tip: Set the <strong>Progress Level</strong> and <strong>Tech Tracks</strong> in the app bar to filter available components.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Use <strong>Browse Library</strong> to browse all your saved designs, or <strong>Manage Mods</strong> to add custom game data.
              </Typography>
            </Paper>
          </Collapse>
        </Box>

        {/* Actions */}
        <Stack spacing={1.5} sx={{ maxWidth: 320, mx: 'auto' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={onNewWarship}
              fullWidth
              disableRipple
              sx={{ py: 1.25 }}
            >
              New Design
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<FolderOpenIcon />}
              onClick={onLoadWarship}
              fullWidth
              sx={{ py: 1.25 }}
            >
              Load Design
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<CollectionsIcon />}
              onClick={onOpenLibrary}
              fullWidth
              sx={{ py: 1.25 }}
            >
              Browse Library
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<ExtensionIcon />}
              onClick={onManageMods}
              fullWidth
              sx={{ py: 1.25 }}
            >
              Manage Mods
            </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
