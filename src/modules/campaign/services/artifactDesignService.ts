import {
  ARTIFACT_BALANCE_PACKAGES,
  ARTIFACT_DRAWBACKS,
  ARTIFACT_FORMS,
  ARTIFACT_POWERS,
  ARTIFACT_PURPOSES,
} from '../data/artifactCatalogue';
import type {
  ArtifactAcquisition,
  ArtifactBalancePackage,
  ArtifactDesign,
  ArtifactDrawbackSelection,
  ArtifactDrawbackSeverity,
  ArtifactFormCategory,
  ArtifactPowerSelection,
  ArtifactPowerSource,
  ArtifactPurpose,
  ArtifactQuality,
  ArtifactValidationResult,
} from '../types/artifact';

let selectionCounter = 0;

function selectionId(prefix: string): string {
  selectionCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${selectionCounter}`;
}

function roll(sides: number, rng: () => number): number {
  return Math.floor(Math.max(0, Math.min(0.999999999, rng())) * sides) + 1;
}

function randomEntry<T>(entries: T[], rng: () => number): T {
  return entries[Math.floor(Math.max(0, Math.min(0.999999999, rng())) * entries.length)];
}

export const DEFAULT_ARTIFACT_DESIGN: ArtifactDesign = {
  name: 'Unnamed Artifact',
  acquisition: 'perk',
  balanceRoll: 1,
  formCategory: 'carried-device',
  formSubtype: 'sphere',
  primaryPurpose: 'information',
  secondaryPurpose: null,
  powers: [{
    id: 'power-default',
    powerId: 'analysis',
    quality: 'ordinary',
    source: 'primary',
    notes: '',
  }],
  drawbacks: [],
  creator: '',
  origin: '',
  appearance: '',
  activation: '',
  history: '',
  currentOwner: '',
  interestedFactions: '',
  secrets: '',
  campaignHooks: '',
  notes: '',
  locks: { form: false, purpose: false, powers: false, drawbacks: false },
};

export function getArtifactBalancePackage(
  acquisition: ArtifactAcquisition,
  balanceRoll: number | null,
): ArtifactBalancePackage | null {
  if (acquisition === 'story' || balanceRoll === null) return null;
  return ARTIFACT_BALANCE_PACKAGES.find((entry) => (
    entry.acquisition === acquisition && entry.roll === balanceRoll
  )) ?? null;
}

export function rollArtifactBalancePackage(
  acquisition: ArtifactAcquisition,
  rng: () => number = Math.random,
): number | null {
  return acquisition === 'story' ? null : roll(8, rng);
}

export function rollArtifactForm(rng: () => number = Math.random): {
  formCategory: ArtifactFormCategory;
  formSubtype: string;
} {
  const result = roll(20, rng);
  const form = ARTIFACT_FORMS.find((entry) => entry.primaryRolls.includes(result)) ?? ARTIFACT_FORMS[0];
  if (form.subtypes.length === 0) return { formCategory: form.id, formSubtype: '' };
  const subtypeRoll = roll(20, rng);
  const subtype = form.subtypes.find((entry) => entry.rolls.includes(subtypeRoll)) ?? form.subtypes[0];
  return { formCategory: form.id, formSubtype: subtype.id };
}

export function rollArtifactPurpose(
  source: ArtifactPowerSource,
  rng: () => number = Math.random,
): ArtifactPurpose | null {
  const result = roll(20, rng);
  if (source === 'secondary' && result >= 13) return null;
  const purpose = ARTIFACT_PURPOSES.find((entry) => (
    (source === 'primary' ? entry.primaryRolls : entry.secondaryRolls).includes(result)
  ));
  return purpose?.id ?? null;
}

function powerSelection(
  purpose: ArtifactPurpose,
  quality: ArtifactQuality,
  source: ArtifactPowerSource,
  usedIds: Set<string>,
  rng: () => number,
): ArtifactPowerSelection {
  const available = ARTIFACT_POWERS.filter((entry) => (
    entry.purpose === purpose && !usedIds.has(entry.id)
  ));
  const definition = randomEntry(available.length > 0 ? available : ARTIFACT_POWERS.filter((entry) => entry.purpose === purpose), rng);
  usedIds.add(definition.id);
  return {
    id: selectionId('power'),
    powerId: definition.id,
    quality,
    source,
    notes: '',
  };
}

function generatePackagePowers(
  artifact: ArtifactDesign,
  artifactPackage: ArtifactBalancePackage,
  rng: () => number,
): ArtifactPowerSelection[] {
  const usedIds = new Set<string>();
  const result: ArtifactPowerSelection[] = [];
  for (const requirement of artifactPackage.primaryPowers) {
    for (let count = 0; count < requirement.count; count += 1) {
      result.push(powerSelection(artifact.primaryPurpose, requirement.quality, 'primary', usedIds, rng));
    }
  }
  const secondaryPurpose = artifact.secondaryPurpose;
  if (secondaryPurpose) {
    for (const requirement of artifactPackage.secondaryPowers) {
      for (let count = 0; count < requirement.count; count += 1) {
        result.push(powerSelection(secondaryPurpose, requirement.quality, 'secondary', usedIds, rng));
      }
    }
  }
  return result;
}

function generateStoryPowers(artifact: ArtifactDesign, rng: () => number): ArtifactPowerSelection[] {
  const usedIds = new Set<string>();
  const primaryCount = roll(3, rng);
  const result = Array.from({ length: primaryCount }, () => powerSelection(
    artifact.primaryPurpose,
    randomEntry<ArtifactQuality>(['ordinary', 'good', 'amazing'], rng),
    'primary',
    usedIds,
    rng,
  ));
  if (artifact.secondaryPurpose) {
    result.push(powerSelection(
      artifact.secondaryPurpose,
      randomEntry<ArtifactQuality>(['ordinary', 'good'], rng),
      'secondary',
      usedIds,
      rng,
    ));
  }
  return result;
}

function drawbackSelection(
  severity: ArtifactDrawbackSeverity,
  usedIds: Set<string>,
  rng: () => number,
): ArtifactDrawbackSelection {
  const available = ARTIFACT_DRAWBACKS.filter((entry) => !usedIds.has(entry.id));
  const definition = randomEntry(available.length > 0 ? available : ARTIFACT_DRAWBACKS, rng);
  usedIds.add(definition.id);
  return { id: selectionId('drawback'), drawbackId: definition.id, severity, notes: '' };
}

function generatePackageDrawbacks(
  artifactPackage: ArtifactBalancePackage,
  rng: () => number,
): ArtifactDrawbackSelection[] {
  const usedIds = new Set<string>();
  const result: ArtifactDrawbackSelection[] = [];
  for (const requirement of artifactPackage.drawbacks) {
    for (let count = 0; count < requirement.count; count += 1) {
      result.push(drawbackSelection(requirement.severity, usedIds, rng));
    }
  }
  return result;
}

function generateStoryDrawbacks(rng: () => number): ArtifactDrawbackSelection[] {
  const usedIds = new Set<string>();
  const count = roll(3, rng) - 1;
  return Array.from({ length: count }, () => drawbackSelection(
    randomEntry<ArtifactDrawbackSeverity>(['slight', 'moderate', 'extreme'], rng),
    usedIds,
    rng,
  ));
}

export function generateArtifact(
  current: ArtifactDesign = DEFAULT_ARTIFACT_DESIGN,
  rng: () => number = Math.random,
): ArtifactDesign {
  const balanceRoll = current.acquisition === 'story'
    ? null
    : (current.locks.powers || current.locks.drawbacks) && current.balanceRoll
      ? current.balanceRoll
      : roll(8, rng);
  const form = current.locks.form ? {
    formCategory: current.formCategory,
    formSubtype: current.formSubtype,
  } : rollArtifactForm(rng);
  let primaryPurpose = current.primaryPurpose;
  let secondaryPurpose = current.secondaryPurpose;
  if (!current.locks.purpose) {
    primaryPurpose = rollArtifactPurpose('primary', rng) ?? 'information';
    secondaryPurpose = rollArtifactPurpose('secondary', rng);
  }
  let next = { ...current, ...form, primaryPurpose, secondaryPurpose, balanceRoll };
  const artifactPackage = getArtifactBalancePackage(next.acquisition, next.balanceRoll);
  if (artifactPackage?.secondaryPowers.some((requirement) => requirement.count > 0) && !next.secondaryPurpose) {
    for (let attempt = 0; attempt < 20 && !secondaryPurpose; attempt += 1) {
      secondaryPurpose = rollArtifactPurpose('secondary', rng);
    }
    secondaryPurpose ??= 'communication';
    next = { ...next, secondaryPurpose };
  }
  const powers = current.locks.powers
    ? current.powers
    : artifactPackage
      ? generatePackagePowers(next, artifactPackage, rng)
      : generateStoryPowers(next, rng);
  const drawbacks = current.locks.drawbacks
    ? current.drawbacks
    : artifactPackage
      ? generatePackageDrawbacks(artifactPackage, rng)
      : generateStoryDrawbacks(rng);
  return { ...next, powers, drawbacks };
}

export function regenerateArtifactSection(
  artifact: ArtifactDesign,
  section: keyof ArtifactDesign['locks'],
  rng: () => number = Math.random,
): ArtifactDesign {
  if (section === 'form') return { ...artifact, ...rollArtifactForm(rng) };
  if (section === 'purpose') {
    return {
      ...artifact,
      primaryPurpose: rollArtifactPurpose('primary', rng) ?? 'information',
      secondaryPurpose: rollArtifactPurpose('secondary', rng),
    };
  }
  const artifactPackage = getArtifactBalancePackage(artifact.acquisition, artifact.balanceRoll);
  if (section === 'powers') {
    let next = artifact;
    if (artifactPackage?.secondaryPowers.some((entry) => entry.count > 0) && !next.secondaryPurpose) {
      let secondaryPurpose: ArtifactPurpose | null = null;
      for (let attempt = 0; attempt < 20 && !secondaryPurpose; attempt += 1) {
        secondaryPurpose = rollArtifactPurpose('secondary', rng);
      }
      next = { ...next, secondaryPurpose: secondaryPurpose ?? 'communication' };
    }
    return {
      ...next,
      powers: artifactPackage
        ? generatePackagePowers(next, artifactPackage, rng)
        : generateStoryPowers(next, rng),
    };
  }
  return {
    ...artifact,
    drawbacks: artifactPackage
      ? generatePackageDrawbacks(artifactPackage, rng)
      : generateStoryDrawbacks(rng),
  };
}

function countPower(
  artifact: ArtifactDesign,
  source: ArtifactPowerSource,
  quality: ArtifactQuality,
): number {
  return artifact.powers.filter((entry) => entry.source === source && entry.quality === quality).length;
}

function countDrawback(artifact: ArtifactDesign, severity: ArtifactDrawbackSeverity): number {
  return artifact.drawbacks.filter((entry) => entry.severity === severity).length;
}

export function validateArtifact(artifact: ArtifactDesign): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const form = ARTIFACT_FORMS.find((entry) => entry.id === artifact.formCategory);
  if (!artifact.name.trim()) errors.push('The artifact needs a name.');
  if (!form) errors.push('Select an artifact form.');
  else if (form.subtypes.length > 0 && !form.subtypes.some((entry) => entry.id === artifact.formSubtype)) {
    errors.push(`Select a valid subtype for ${form.name}.`);
  }
  if (artifact.powers.length === 0) warnings.push('The artifact has no powers.');

  for (const selection of artifact.powers) {
    const definition = ARTIFACT_POWERS.find((entry) => entry.id === selection.powerId);
    if (!definition) {
      errors.push('A selected power is no longer available.');
      continue;
    }
    const expectedPurpose = selection.source === 'primary'
      ? artifact.primaryPurpose
      : artifact.secondaryPurpose;
    if (!expectedPurpose) errors.push(`${definition.name} is secondary, but no secondary purpose is selected.`);
    else if (definition.purpose !== expectedPurpose) {
      errors.push(`${definition.name} does not match the artifact’s ${selection.source} purpose.`);
    }
  }

  const artifactPackage = getArtifactBalancePackage(artifact.acquisition, artifact.balanceRoll);
  if (artifact.acquisition !== 'story' && !artifactPackage) {
    errors.push('Select a valid d8 balance package for the artifact’s perk or flaw.');
  }
  if (artifactPackage) {
    for (const source of ['primary', 'secondary'] as const) {
      const requirements = source === 'primary'
        ? artifactPackage.primaryPowers
        : artifactPackage.secondaryPowers;
      for (const quality of ['ordinary', 'good', 'amazing'] as const) {
        const expected = requirements.find((entry) => entry.quality === quality)?.count ?? 0;
        const actual = countPower(artifact, source, quality);
        if (actual !== expected) {
          errors.push(`${source === 'primary' ? 'Primary' : 'Secondary'} ${quality} powers: ${actual} selected, ${expected} required.`);
        }
      }
    }
    for (const severity of ['slight', 'moderate', 'extreme'] as const) {
      const expected = artifactPackage.drawbacks.find((entry) => entry.severity === severity)?.count ?? 0;
      const actual = countDrawback(artifact, severity);
      if (actual !== expected) {
        errors.push(`${severity} drawbacks: ${actual} selected, ${expected} required.`);
      }
    }
  } else if (artifact.acquisition === 'story') {
    warnings.push('Story artifacts are not constrained by the perk/flaw balance tables.');
  }

  return { valid: errors.length === 0, errors, warnings, expectedPackage: artifactPackage };
}

export function getArtifactPower(powerId: string) {
  return ARTIFACT_POWERS.find((entry) => entry.id === powerId);
}

export function getArtifactDrawback(drawbackId: string) {
  return ARTIFACT_DRAWBACKS.find((entry) => entry.id === drawbackId);
}
