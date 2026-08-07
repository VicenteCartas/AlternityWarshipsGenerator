import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HistoryIcon from '@mui/icons-material/History';
import type { WorkshopDocumentKind } from '@shared/constants/documentCapabilities';
import { WORKSHOP_DOCUMENTS, isDocumentFile } from '@shared/constants/documentCapabilities';
import { ModuleWelcomeAction, ModuleWelcomeSection } from './ModuleWelcome';

interface DocumentWelcomeActionsProps {
  kind: WorkshopDocumentKind;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent: (filePath: string) => void;
}

function baseName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function parentPath(filePath: string): string {
  const separatorIndex = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
  return separatorIndex > 0 ? filePath.slice(0, separatorIndex) : '';
}

export function DocumentWelcomeActions({
  kind,
  onNew,
  onOpen,
  onOpenRecent,
}: DocumentWelcomeActionsProps) {
  const capabilities = WORKSHOP_DOCUMENTS[kind];
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    window.electronAPI?.getRecentFiles()
      .then((files) => {
        if (active) setRecentFiles(files.filter((filePath) => isDocumentFile(kind, filePath)).slice(0, 5));
      })
      .catch(() => {
        if (active) setRecentFiles([]);
      });
    return () => { active = false; };
  }, [kind]);

  return (
    <>
      <ModuleWelcomeSection label="Start">
        <ModuleWelcomeAction
          label={capabilities.newLabel}
          icon={<AddIcon />}
          onClick={onNew}
          primary
        />
        <ModuleWelcomeAction
          label={capabilities.openLabel}
          icon={<FolderOpenIcon color="primary" />}
          onClick={onOpen}
        />
      </ModuleWelcomeSection>

      {recentFiles.length > 0 && (
        <ModuleWelcomeSection label="Recent">
          {recentFiles.map((filePath) => (
            <ModuleWelcomeAction
              key={filePath}
              label={baseName(filePath)}
              description={parentPath(filePath)}
              icon={<HistoryIcon color="primary" />}
              onClick={() => onOpenRecent(filePath)}
            />
          ))}
        </ModuleWelcomeSection>
      )}
    </>
  );
}
