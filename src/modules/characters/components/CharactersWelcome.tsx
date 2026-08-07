import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  DocumentWelcomeActions,
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from '@shared/components';

interface CharactersWelcomeProps {
  onNewCharacter: () => void;
  onOpenCharacter: () => void;
  onOpenRecent: (filePath: string) => void;
  onReturnToHub: () => void;
}

export function CharactersWelcome({
  onNewCharacter,
  onOpenCharacter,
  onOpenRecent,
  onReturnToHub,
}: CharactersWelcomeProps) {
  return (
    <ModuleWelcomeShell
      title="Character Creator"
      description="Player's Handbook character creation and advancement"
      icon={<PersonAddAlt1Icon fontSize="large" />}
      onReturnToHub={onReturnToHub}
    >
      <DocumentWelcomeActions
        kind="character"
        onNew={onNewCharacter}
        onOpen={onOpenCharacter}
        onOpenRecent={onOpenRecent}
      />

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