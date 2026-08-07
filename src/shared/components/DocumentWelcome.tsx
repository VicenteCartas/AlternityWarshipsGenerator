import type { ReactNode } from 'react';
import type { WorkshopDocumentKind } from '@shared/constants/documentCapabilities';
import { DocumentWelcomeActions } from './DocumentWelcomeActions';
import { ModuleWelcomeShell } from './ModuleWelcome';

interface DocumentWelcomeProps {
  kind: WorkshopDocumentKind;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent: (filePath: string) => void;
  onReturnToHub: () => void;
  children?: ReactNode;
  iconBackground?: string;
}

export function DocumentWelcome({
  kind,
  title,
  description,
  icon,
  onNew,
  onOpen,
  onOpenRecent,
  onReturnToHub,
  children,
  iconBackground,
}: DocumentWelcomeProps) {
  return (
    <ModuleWelcomeShell
      title={title}
      description={description}
      icon={icon}
      iconBackground={iconBackground}
      onReturnToHub={onReturnToHub}
    >
      <DocumentWelcomeActions
        kind={kind}
        onNew={onNew}
        onOpen={onOpen}
        onOpenRecent={onOpenRecent}
      />
      {children}
    </ModuleWelcomeShell>
  );
}
