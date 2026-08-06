import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
import {
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from '@shared/components';
import { checkForAutoSave, clearAutoSave } from '../hooks/useAutoSave';

interface WelcomePageProps {
  onNewWarship: () => void;
  onLoadWarship: () => void;
  onManageMods: () => void;
  onOpenLibrary?: () => void;
  onRecoverAutoSave?: (content: string) => Promise<boolean>;
  /** Optional callback to return to the suite hub. Renders a "Workshop Home" button when provided. */
  onReturnToHub?: () => void;
}

export function WarshipsWelcome({ onNewWarship, onLoadWarship, onManageMods, onOpenLibrary, onRecoverAutoSave, onReturnToHub }: WelcomePageProps) {
  const [autoSaveContent, setAutoSaveContent] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  useEffect(() => {
    // Check for auto-save recovery
    checkForAutoSave().then((content) => {
      if (content) setAutoSaveContent(content);
    });
  }, []);

  return (
    <ModuleWelcomeShell
      title="Warships Generator"
      description="Design warships, stations, bases, and carried craft"
      icon={(
        <Box
          component="img"
          src="./logo.png"
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      iconBackground="transparent"
      onReturnToHub={onReturnToHub}
    >
      {autoSaveContent && (
        <Alert
          severity="warning"
          icon={<RestoreIcon />}
          action={(
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="warning"
                size="small"
                variant="contained"
                disabled={recovering}
                onClick={async () => {
                  setRecovering(true);
                  const success = await onRecoverAutoSave?.(autoSaveContent) ?? false;
                  if (success) setAutoSaveContent(null);
                  else setRecovering(false);
                }}
              >
                {recovering ? 'Recovering…' : 'Recover'}
              </Button>
              <Button
                color="inherit"
                size="small"
                disabled={recovering}
                onClick={() => {
                  setAutoSaveContent(null);
                  clearAutoSave();
                }}
              >
                Dismiss
              </Button>
            </Box>
          )}
        >
          An unsaved design was found from a previous session. Would you like to recover it?
        </Alert>
      )}

      <ModuleWelcomeSection label="Start">
        <ModuleWelcomeAction
          label="New Design"
          icon={<AddIcon />}
          onClick={onNewWarship}
          primary
        />
        <ModuleWelcomeAction
          label="Open Design"
          icon={<FolderOpenIcon color="primary" />}
          onClick={onLoadWarship}
        />
      </ModuleWelcomeSection>

      <ModuleWelcomeSection label="Manage">
        {onOpenLibrary && (
          <ModuleWelcomeAction
            label="Browse Library"
            icon={<CollectionsIcon color="primary" />}
            onClick={onOpenLibrary}
          />
        )}
        <ModuleWelcomeAction
          label="Manage Mods"
          icon={<ExtensionIcon color="primary" />}
          onClick={onManageMods}
        />
      </ModuleWelcomeSection>

      <Box>
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
          <Paper variant="outlined" sx={{ p: 2 }}>
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
              Use <strong>Browse Library</strong> to browse saved designs, or <strong>Manage Mods</strong> to add custom game data.
            </Typography>
          </Paper>
        </Collapse>
      </Box>
    </ModuleWelcomeShell>
  );
}
