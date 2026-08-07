import { Typography } from '@mui/material';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import ExtensionIcon from '@mui/icons-material/Extension';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {
  DocumentWelcomeActions,
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from '@shared/components';

interface BattlesWelcomeProps {
  onNewBattle: () => void;
  onOpenBattle?: () => void;
  onOpenRecent: (filePath: string) => void;
  onOpenLibrary?: () => void;
  onManageMods?: () => void;
  onReturnToHub?: () => void;
}

export function BattlesWelcome({
  onNewBattle, onOpenBattle, onOpenRecent, onOpenLibrary, onManageMods, onReturnToHub,
}: BattlesWelcomeProps) {
  return (
    <ModuleWelcomeShell
      title="Battle Resolution"
      description={<span>Abstract combat from <em>The Externals</em></span>}
      icon={<GpsFixedIcon sx={{ fontSize: 36 }} />}
      onReturnToHub={onReturnToHub}
    >
      <DocumentWelcomeActions
        kind="battle"
        onNew={onNewBattle}
        onOpen={onOpenBattle ?? (() => undefined)}
        onOpenRecent={onOpenRecent}
      />

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
