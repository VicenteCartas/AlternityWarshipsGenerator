import { Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import ExtensionIcon from '@mui/icons-material/Extension';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from '@shared/components';

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
    <ModuleWelcomeShell
      title="Battle Resolution"
      description={<span>Abstract combat from <em>The Externals</em></span>}
      icon={<GpsFixedIcon sx={{ fontSize: 36 }} />}
      onReturnToHub={onReturnToHub}
    >
      <ModuleWelcomeSection label="Start">
        <ModuleWelcomeAction
          label="New Battle"
          icon={<AddIcon />}
          onClick={onNewBattle}
          primary
        />
        {onOpenBattle && (
          <ModuleWelcomeAction
            label="Open Battle"
            icon={<FolderOpenIcon color="primary" />}
            onClick={onOpenBattle}
          />
        )}
      </ModuleWelcomeSection>

      <ModuleWelcomeSection label="Manage">
        {onOpenLibrary && (
          <ModuleWelcomeAction
            label="Battle Library"
            icon={<CollectionsBookmarkIcon color="primary" />}
            onClick={onOpenLibrary}
          />
        )}
        {onManageMods && (
          <ModuleWelcomeAction
            label="Manage Mods"
            icon={<ExtensionIcon color="primary" />}
            onClick={onManageMods}
          />
        )}
      </ModuleWelcomeSection>

      <Typography variant="body2" color="text.secondary">
        Resolve space engagements, ground battles, orbital bombardment, and mixed engagements
        using the External unit catalogue, system defenses, or units of your own.
      </Typography>
    </ModuleWelcomeShell>
  );
}
