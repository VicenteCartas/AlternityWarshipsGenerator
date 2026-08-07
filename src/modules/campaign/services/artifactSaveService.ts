import { APP_VERSION } from '@shared/constants/version';
import {
  ARTIFACT_DRAWBACKS,
  ARTIFACT_FORMS,
  ARTIFACT_POWERS,
  ARTIFACT_PURPOSES,
} from '../data/artifactCatalogue';
import type {
  ArtifactAcquisition,
  ArtifactDesign,
  ArtifactDrawbackSelection,
  ArtifactDrawbackSeverity,
  ArtifactPowerSelection,
  ArtifactPowerSource,
  ArtifactQuality,
} from '../types/artifact';
import {
  ARTIFACT_FILE_EXTENSION,
  ARTIFACT_SAVE_FILE_VERSION,
  type ArtifactSaveFile,
} from '../types/campaignSaveFile';
import { DEFAULT_ARTIFACT_DESIGN } from './artifactDesignService';
import type { CampaignLoadResult } from './campaignSaveService';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function enumValue<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

function readPower(raw: unknown, index: number): ArtifactPowerSelection | null {
  if (!isObject(raw)) return null;
  const definition = ARTIFACT_POWERS.find((entry) => entry.id === raw.powerId);
  if (!definition) return null;
  return {
    id: text(raw.id, `power-${index + 1}`),
    powerId: definition.id,
    quality: enumValue(raw.quality, ['ordinary', 'good', 'amazing'] as ArtifactQuality[], 'ordinary'),
    source: enumValue(raw.source, ['primary', 'secondary'] as ArtifactPowerSource[], 'primary'),
    notes: text(raw.notes),
  };
}

function readDrawback(raw: unknown, index: number): ArtifactDrawbackSelection | null {
  if (!isObject(raw)) return null;
  const definition = ARTIFACT_DRAWBACKS.find((entry) => entry.id === raw.drawbackId);
  if (!definition) return null;
  return {
    id: text(raw.id, `drawback-${index + 1}`),
    drawbackId: definition.id,
    severity: enumValue(
      raw.severity,
      ['slight', 'moderate', 'extreme'] as ArtifactDrawbackSeverity[],
      'slight',
    ),
    notes: text(raw.notes),
  };
}

export function serializeArtifact(artifact: ArtifactDesign, createdAt?: string): ArtifactSaveFile {
  const now = new Date().toISOString();
  return {
    version: ARTIFACT_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    artifact,
  };
}

export function jsonToArtifactSaveFile(json: string): ArtifactSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isObject(parsed) && isObject(parsed.artifact) ? parsed as unknown as ArtifactSaveFile : null;
  } catch {
    return null;
  }
}

export function deserializeArtifact(saveFile: ArtifactSaveFile): CampaignLoadResult<ArtifactDesign> {
  if (!isObject(saveFile.artifact)) {
    return { success: false, errors: ['The file does not contain an artifact.'] };
  }
  const raw = saveFile.artifact as unknown as Record<string, unknown>;
  const acquisition = enumValue(
    raw.acquisition,
    ['story', 'perk', 'flaw'] as ArtifactAcquisition[],
    DEFAULT_ARTIFACT_DESIGN.acquisition,
  );
  const formCategory = ARTIFACT_FORMS.some((entry) => entry.id === raw.formCategory)
    ? raw.formCategory as ArtifactDesign['formCategory']
    : DEFAULT_ARTIFACT_DESIGN.formCategory;
  const form = ARTIFACT_FORMS.find((entry) => entry.id === formCategory)!;
  const formSubtype = form.subtypes.some((entry) => entry.id === raw.formSubtype)
    ? String(raw.formSubtype)
    : form.subtypes[0]?.id ?? '';
  const primaryPurpose = ARTIFACT_PURPOSES.some((entry) => entry.id === raw.primaryPurpose)
    ? raw.primaryPurpose as ArtifactDesign['primaryPurpose']
    : DEFAULT_ARTIFACT_DESIGN.primaryPurpose;
  const secondaryPurpose = ARTIFACT_PURPOSES.some((entry) => entry.id === raw.secondaryPurpose)
    ? raw.secondaryPurpose as ArtifactDesign['secondaryPurpose']
    : null;
  const powers = (Array.isArray(raw.powers) ? raw.powers : [])
    .map(readPower)
    .filter((entry): entry is ArtifactPowerSelection => entry !== null);
  const drawbacks = (Array.isArray(raw.drawbacks) ? raw.drawbacks : [])
    .map(readDrawback)
    .filter((entry): entry is ArtifactDrawbackSelection => entry !== null);
  const locks = isObject(raw.locks) ? raw.locks : {};
  const balanceRoll = acquisition === 'story'
    ? null
    : typeof raw.balanceRoll === 'number' && raw.balanceRoll >= 1 && raw.balanceRoll <= 8
      ? Math.trunc(raw.balanceRoll)
      : 1;
  const warnings: string[] = [];
  if (saveFile.version && saveFile.version.split('.')[0] !== ARTIFACT_SAVE_FILE_VERSION.split('.')[0]) {
    return {
      success: false,
      errors: [`Artifact format ${saveFile.version} is not supported by ${ARTIFACT_SAVE_FILE_VERSION}.`],
    };
  }
  if (powers.length !== (Array.isArray(raw.powers) ? raw.powers.length : 0)) {
    warnings.push('Unknown powers were removed while loading.');
  }
  if (drawbacks.length !== (Array.isArray(raw.drawbacks) ? raw.drawbacks.length : 0)) {
    warnings.push('Unknown drawbacks were removed while loading.');
  }

  return {
    success: true,
    createdAt: typeof saveFile.createdAt === 'string' ? saveFile.createdAt : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    value: {
      name: text(raw.name, DEFAULT_ARTIFACT_DESIGN.name),
      acquisition,
      balanceRoll,
      formCategory,
      formSubtype,
      primaryPurpose,
      secondaryPurpose,
      powers,
      drawbacks,
      creator: text(raw.creator),
      origin: text(raw.origin),
      appearance: text(raw.appearance),
      activation: text(raw.activation),
      history: text(raw.history),
      currentOwner: text(raw.currentOwner),
      interestedFactions: text(raw.interestedFactions),
      secrets: text(raw.secrets),
      campaignHooks: text(raw.campaignHooks),
      notes: text(raw.notes),
      locks: {
        form: locks.form === true,
        purpose: locks.purpose === true,
        powers: locks.powers === true,
        drawbacks: locks.drawbacks === true,
      },
    },
  };
}

export function getDefaultArtifactFileName(name: string): string {
  const base = (name || 'Unnamed Artifact')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'Unnamed Artifact';
  return `${base}${ARTIFACT_FILE_EXTENSION}`;
}
