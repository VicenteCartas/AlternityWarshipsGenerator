import { APP_VERSION } from '@shared/constants/version';
import type { Mod, SavedModReference } from '@shared/types/mod';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { getAllCharacterSourcePacks } from './characterDataService';
import type {
  AbilityId,
  AbilityScores,
  FundsDegree,
  PsionicAccessPath,
  ResistanceAbilityId,
} from '../types/character';
import type { CharacterState } from '../types/characterState';
import type { CharacterSaveFile } from '../types/characterSaveFile';
import {
  CHARACTER_FILE_EXTENSION,
  CHARACTER_SAVE_FILE_VERSION,
} from '../types/characterSaveFile';

export interface CharacterLoadResult {
  success: boolean;
  character?: CharacterState;
  errors?: string[];
  warnings?: string[];
}

const ABILITY_IDS: AbilityId[] = ['str', 'dex', 'con', 'int', 'wil', 'per'];
const RESISTANCE_ABILITY_IDS: ResistanceAbilityId[] = ['str', 'dex', 'con', 'int', 'wil'];
const PSIONIC_ACCESS_PATHS: PsionicAccessPath[] = ['none', 'mindwalker', 'talent', 'diplomat-mindwalker'];
const FUNDS_DEGREES: FundsDegree[] = ['marginal', 'ordinary', 'good', 'amazing'];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [...fallback];
}

function objectArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === 'object').map((entry) => ({ ...entry } as T))
    : [];
}

function readAbilities(value: unknown, fallback: AbilityScores): AbilityScores {
  const raw = record(value);
  return Object.fromEntries(
    ABILITY_IDS.map((ability) => [ability, numberValue(raw[ability], fallback[ability])]),
  ) as AbilityScores;
}

export function serializeCharacter(
  character: CharacterState,
  activeMods: Mod[] = [],
  createdAt?: string,
): CharacterSaveFile {
  const now = new Date().toISOString();
  const sourcePackById = new Map(getAllCharacterSourcePacks().map((sourcePack) => [sourcePack.id, sourcePack]));
  const sourcePacks = character.selectedSourcePackIds.map((id) => ({
    id,
    version: sourcePackById.get(id)?.version || 'unknown',
  }));
  const mods: SavedModReference[] = activeMods.map((mod) => ({
    name: mod.manifest.name,
    version: mod.manifest.version,
  }));

  return {
    version: CHARACTER_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    sourcePacks,
    ...(mods.length > 0 ? { activeMods: mods } : {}),
    character,
  };
}

export function characterSaveFileToJson(saveFile: CharacterSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

export function jsonToCharacterSaveFile(json: string): CharacterSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<CharacterSaveFile>;
    if (!candidate.character || typeof candidate.character !== 'object') return null;
    return candidate as CharacterSaveFile;
  } catch {
    return null;
  }
}

export function deserializeCharacter(saveFile: CharacterSaveFile): CharacterLoadResult {
  const warnings: string[] = [];
  const raw = record(saveFile.character);
  if (Object.keys(raw).length === 0) {
    return { success: false, errors: ['The file does not contain a character.'] };
  }

  if (saveFile.version !== CHARACTER_SAVE_FILE_VERSION) {
    warnings.push(
      `This character was saved in format ${saveFile.version || 'unknown'}; it has been migrated to ${CHARACTER_SAVE_FILE_VERSION}.`,
    );
  }

  const defaults = createEmptyCharacter();
  const identity = record(raw.identity);
  const skillPlan = record(raw.skillPlan);
  const psionicPlan = record(raw.psionicPlan);
  const mutationPlan = record(raw.mutationPlan);
  const professionBenefits = record(raw.professionBenefits);
  const resistanceBonusAbility = RESISTANCE_ABILITY_IDS.includes(raw.resistanceBonusAbility as ResistanceAbilityId)
    ? raw.resistanceBonusAbility as ResistanceAbilityId
    : undefined;
  const wealthDegree = FUNDS_DEGREES.includes(raw.wealthDegree as FundsDegree)
    ? raw.wealthDegree as FundsDegree
    : undefined;
  const accessPath = PSIONIC_ACCESS_PATHS.includes(psionicPlan.accessPath as PsionicAccessPath)
    ? psionicPlan.accessPath as PsionicAccessPath
    : 'none';

  const character: CharacterState = {
    level: 1,
    progressLevel: numberValue(raw.progressLevel, defaults.progressLevel),
    selectedSourcePackIds: stringArray(raw.selectedSourcePackIds, defaults.selectedSourcePackIds),
    identity: {
      heroName: stringValue(identity.heroName, ''),
      playerName: stringValue(identity.playerName, ''),
      campaign: stringValue(identity.campaign, ''),
      gamemaster: stringValue(identity.gamemaster, ''),
      career: stringValue(identity.career, ''),
      gender: stringValue(identity.gender, ''),
      age: stringValue(identity.age, ''),
      height: stringValue(identity.height, ''),
      weight: stringValue(identity.weight, ''),
      hair: stringValue(identity.hair, ''),
      eyes: stringValue(identity.eyes, ''),
      appearance: stringValue(identity.appearance, ''),
      background: stringValue(identity.background, ''),
      allegiance: stringValue(identity.allegiance, ''),
      socialStatus: stringValue(identity.socialStatus, ''),
      contacts: stringValue(identity.contacts, ''),
      enemies: stringValue(identity.enemies, ''),
      notes: stringValue(identity.notes, ''),
      motivation: stringValue(identity.motivation, ''),
      moralAttitude: stringValue(identity.moralAttitude, ''),
      characterTraits: stringArray(identity.characterTraits),
    },
    speciesId: stringValue(raw.speciesId, defaults.speciesId),
    professionId: typeof raw.professionId === 'string' ? raw.professionId : null,
    professionBenefits: {
      ...(typeof professionBenefits.combatSpecSpecialtySkillId === 'string'
        ? { combatSpecSpecialtySkillId: professionBenefits.combatSpecSpecialtySkillId }
        : {}),
      ...(professionBenefits.diplomatBenefit === 'contacts' || professionBenefits.diplomatBenefit === 'resources'
        ? { diplomatBenefit: professionBenefits.diplomatBenefit }
        : {}),
    },
    speciesOptionIds: stringArray(raw.speciesOptionIds),
    abilityScores: readAbilities(raw.abilityScores, defaults.abilityScores),
    ...(resistanceBonusAbility ? { resistanceBonusAbility } : {}),
    skillPlan: {
      nativeLanguage: stringValue(skillPlan.nativeLanguage, ''),
      cashedInFreeBroadSkillIds: stringArray(skillPlan.cashedInFreeBroadSkillIds),
      purchasedBroadSkillIds: stringArray(skillPlan.purchasedBroadSkillIds),
      specialtySkills: objectArray(skillPlan.specialtySkills),
      additionalDiscountProfessionIds: stringArray(skillPlan.additionalDiscountProfessionIds),
      ...(typeof skillPlan.skillPointAdjustment === 'number'
        ? { skillPointAdjustment: skillPlan.skillPointAdjustment }
        : {}),
    },
    optionSelections: objectArray(raw.optionSelections),
    psionicPlan: {
      accessPath,
      purchasedBroadSkillIds: stringArray(psionicPlan.purchasedBroadSkillIds),
      specialtySkills: objectArray(psionicPlan.specialtySkills),
      ...(typeof psionicPlan.favoredBroadSkillId === 'string'
        ? { favoredBroadSkillId: psionicPlan.favoredBroadSkillId }
        : {}),
    },
    mutationPlan: {
      origin: ['engineered', 'natural', 'directed'].includes(mutationPlan.origin as string)
        ? mutationPlan.origin as CharacterState['mutationPlan']['origin']
        : defaults.mutationPlan.origin,
      scope: mutationPlan.scope === 'community' ? 'community' : 'individual',
      advantagePointBudget: numberValue(mutationPlan.advantagePointBudget, 0),
      drawbackPointBudget: numberValue(mutationPlan.drawbackPointBudget, 0),
      selections: objectArray(mutationPlan.selections),
    },
    cybergearSelections: objectArray(raw.cybergearSelections),
    startingFundsDieRolls: Array.isArray(raw.startingFundsDieRolls)
      ? raw.startingFundsDieRolls.filter((roll): roll is number => typeof roll === 'number' && Number.isFinite(roll))
      : [],
    ...(wealthDegree ? { wealthDegree } : {}),
    equipmentSelections: objectArray(raw.equipmentSelections),
    weaponSelections: objectArray(raw.weaponSelections),
    armorSelections: objectArray(raw.armorSelections),
  };

  if (!Array.isArray(raw.selectedSourcePackIds)) {
    warnings.push('The file had no source-pack selection, so the PHB was enabled.');
  }

  return {
    success: true,
    character,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getDefaultCharacterFileName(heroName: string): string {
  const base = (heroName || 'New Character')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'New Character';
  return `${base}${CHARACTER_FILE_EXTENSION}`;
}