export type WorkshopDocumentKind =
  | 'warship'
  | 'character'
  | 'battle'
  | 'sector'
  | 'star-system'
  | 'civilization'
  | 'artifact'
  | 'travel';

export type OptionalDocumentCapability = 'available' | 'planned' | 'unsupported';

export interface WorkshopDocumentCapabilities {
  kind: WorkshopDocumentKind;
  singularLabel: string;
  pluralLabel: string;
  fileExtension: string;
  newLabel: string;
  openLabel: string;
  supportsSave: true;
  supportsSaveAs: true;
  supportsRecent: true;
  library: OptionalDocumentCapability;
  mods: OptionalDocumentCapability;
  pdfExport: OptionalDocumentCapability;
}

export const WORKSHOP_DOCUMENTS: Record<WorkshopDocumentKind, WorkshopDocumentCapabilities> = {
  warship: {
    kind: 'warship',
    singularLabel: 'Design',
    pluralLabel: 'Designs',
    fileExtension: '.warship.json',
    newLabel: 'New Design',
    openLabel: 'Open Design',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'available',
    mods: 'available',
    pdfExport: 'available',
  },
  character: {
    kind: 'character',
    singularLabel: 'Character',
    pluralLabel: 'Characters',
    fileExtension: '.character.json',
    newLabel: 'New Character',
    openLabel: 'Open Character',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'planned',
    mods: 'planned',
    pdfExport: 'available',
  },
  battle: {
    kind: 'battle',
    singularLabel: 'Battle',
    pluralLabel: 'Battles',
    fileExtension: '.battle.json',
    newLabel: 'New Battle',
    openLabel: 'Open Battle',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'available',
    mods: 'available',
    pdfExport: 'available',
  },
  sector: {
    kind: 'sector',
    singularLabel: 'Star Sector',
    pluralLabel: 'Star Sectors',
    fileExtension: '.sector.json',
    newLabel: 'New Star Sector',
    openLabel: 'Open Star Sector',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'planned',
    mods: 'unsupported',
    pdfExport: 'available',
  },
  'star-system': {
    kind: 'star-system',
    singularLabel: 'Star System',
    pluralLabel: 'Star Systems',
    fileExtension: '.system.json',
    newLabel: 'New Star System',
    openLabel: 'Open Star System',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'planned',
    mods: 'unsupported',
    pdfExport: 'available',
  },
  civilization: {
    kind: 'civilization',
    singularLabel: 'Civilization',
    pluralLabel: 'Civilizations',
    fileExtension: '.civilization.json',
    newLabel: 'New Civilization',
    openLabel: 'Open Civilization',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'planned',
    mods: 'unsupported',
    pdfExport: 'available',
  },
  artifact: {
    kind: 'artifact',
    singularLabel: 'Artifact',
    pluralLabel: 'Artifacts',
    fileExtension: '.artifact.json',
    newLabel: 'New Artifact',
    openLabel: 'Open Artifact',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'planned',
    mods: 'unsupported',
    pdfExport: 'available',
  },
  travel: {
    kind: 'travel',
    singularLabel: 'Trip',
    pluralLabel: 'Trips',
    fileExtension: '.travel.json',
    newLabel: 'New Trip',
    openLabel: 'Open Trip',
    supportsSave: true,
    supportsSaveAs: true,
    supportsRecent: true,
    library: 'unsupported',
    mods: 'unsupported',
    pdfExport: 'unsupported',
  },
};

export function isDocumentFile(kind: WorkshopDocumentKind, filePath: string): boolean {
  return filePath.toLocaleLowerCase().endsWith(WORKSHOP_DOCUMENTS[kind].fileExtension);
}
