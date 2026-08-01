export type CharacterRuleSection =
  | 'core'
  | 'mutations'
  | 'psionics'
  | 'fx'
  | 'cybertech'
  | 'grid'
  | 'robots';

export type SourcePackStatus = 'implemented' | 'planned';

export interface CharacterSourcePackDefinition {
  id: string;
  name: string;
  version: string;
  required: boolean;
  status: SourcePackStatus;
  dependsOn: string[];
  replaces: string[];
  sections: CharacterRuleSection[];
}

export interface SavedCharacterSourcePackReference {
  id: string;
  version: string;
}

export interface CharacterSourcePackResolution {
  valid: boolean;
  errors: string[];
  selectedSourcePackIds: string[];
  activeSourcePackIdsBySection: Partial<Record<CharacterRuleSection, string[]>>;
}