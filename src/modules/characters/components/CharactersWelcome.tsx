import AddIcon from '@mui/icons-material/Add';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from '@shared/components';

interface CharactersWelcomeProps {
  onNewCharacter: () => void;
  onOpenCharacter: () => void;
  onReturnToHub: () => void;
}

export function CharactersWelcome({
  onNewCharacter,
  onOpenCharacter,
  onReturnToHub,
}: CharactersWelcomeProps) {
  return (
    <ModuleWelcomeShell
      title="Character Creator"
      description="Player's Handbook character creation and advancement"
      icon={<PersonAddAlt1Icon fontSize="large" />}
      onReturnToHub={onReturnToHub}
    >
      <ModuleWelcomeSection label="Start">
        <ModuleWelcomeAction
          label="New Character"
          icon={<AddIcon />}
          onClick={onNewCharacter}
          primary
        />
        <ModuleWelcomeAction
          label="Open Character"
          icon={<FolderOpenIcon color="primary" />}
          onClick={onOpenCharacter}
        />
      </ModuleWelcomeSection>

      <ModuleWelcomeSection label="Planned">
        <ModuleWelcomeAction
          label="Character Library"
          icon={<CollectionsBookmarkOutlinedIcon />}
          disabled
        />
        <ModuleWelcomeAction
          label="Sources & Mods"
          icon={<ExtensionOutlinedIcon />}
          disabled
        />
      </ModuleWelcomeSection>
    </ModuleWelcomeShell>
  );
}