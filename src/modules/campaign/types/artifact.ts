export type ArtifactAcquisition = 'story' | 'perk' | 'flaw';
export type ArtifactQuality = 'ordinary' | 'good' | 'amazing';
export type ArtifactDrawbackSeverity = 'slight' | 'moderate' | 'extreme';
export type ArtifactPowerSource = 'primary' | 'secondary';

export type ArtifactFormCategory =
  | 'appliance-machine'
  | 'carried-device'
  | 'clothing-worn'
  | 'graft-implant'
  | 'procedure-treatment'
  | 'site-installation'
  | 'vehicle';

export type ArtifactPurpose =
  | 'communication'
  | 'control'
  | 'defense'
  | 'environment'
  | 'information'
  | 'medical'
  | 'mental-enhancement'
  | 'offense'
  | 'physical-enhancement'
  | 'transmutation'
  | 'transportation';

export interface ArtifactFormDefinition {
  id: ArtifactFormCategory;
  name: string;
  description: string;
  primaryRolls: number[];
  subtypes: ArtifactSubtypeDefinition[];
}

export interface ArtifactSubtypeDefinition {
  id: string;
  name: string;
  rolls: number[];
}

export interface ArtifactPurposeDefinition {
  id: ArtifactPurpose;
  name: string;
  description: string;
  primaryRolls: number[];
  secondaryRolls: number[];
}

export interface ArtifactPowerDefinition {
  id: string;
  name: string;
  purpose: ArtifactPurpose;
  summary: string;
  roll: number;
  effects: Record<ArtifactQuality, string>;
}

export interface ArtifactDrawbackDefinition {
  id: string;
  name: string;
  summary: string;
  roll: number;
  effects: Record<ArtifactDrawbackSeverity, string>;
}

export interface ArtifactPowerSelection {
  id: string;
  powerId: string;
  quality: ArtifactQuality;
  source: ArtifactPowerSource;
  notes: string;
}

export interface ArtifactDrawbackSelection {
  id: string;
  drawbackId: string;
  severity: ArtifactDrawbackSeverity;
  notes: string;
}

export interface ArtifactSectionLocks {
  form: boolean;
  purpose: boolean;
  powers: boolean;
  drawbacks: boolean;
}

export interface ArtifactDesign {
  name: string;
  acquisition: ArtifactAcquisition;
  balanceRoll: number | null;
  formCategory: ArtifactFormCategory;
  formSubtype: string;
  primaryPurpose: ArtifactPurpose;
  secondaryPurpose: ArtifactPurpose | null;
  powers: ArtifactPowerSelection[];
  drawbacks: ArtifactDrawbackSelection[];
  creator: string;
  origin: string;
  appearance: string;
  activation: string;
  history: string;
  currentOwner: string;
  interestedFactions: string;
  secrets: string;
  campaignHooks: string;
  notes: string;
  locks: ArtifactSectionLocks;
}

export interface ArtifactBalanceRequirement {
  quality: ArtifactQuality;
  count: number;
}

export interface ArtifactDrawbackRequirement {
  severity: ArtifactDrawbackSeverity;
  count: number;
}

export interface ArtifactBalancePackage {
  acquisition: Exclude<ArtifactAcquisition, 'story'>;
  roll: number;
  primaryPowers: ArtifactBalanceRequirement[];
  secondaryPowers: ArtifactBalanceRequirement[];
  drawbacks: ArtifactDrawbackRequirement[];
}

export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  expectedPackage: ArtifactBalancePackage | null;
}
