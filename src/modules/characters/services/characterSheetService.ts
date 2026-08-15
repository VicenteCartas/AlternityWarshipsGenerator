import { calculateSkillScore } from './characterCalculationService';
import {
  getAllArmor,
  getAllCharacterOptions,
  getAllCybergear,
  getAllEquipment,
  getAllMutations,
  getAllPsionicSkills,
  getAllSkills,
  getAllWeapons,
  getFxRules,
  getProfessionById,
  getSpeciesById,
} from './characterDataService';
import { getFxAttemptEnergyCost } from './fxService';
import type { AbilityId, SkillScore } from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';
import type { FxDiscipline, FxQuality } from '../types/fx';

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wil: 'Will', per: 'Personality',
};

export interface CharacterSheetAbility {
  id: AbilityId;
  label: string;
  score: number;
  untrained: number;
  resistance: number | null;
}

export interface CharacterSheetSkill extends SkillScore {
  ability: AbilityId;
  name: string;
  rank: number | null;
  source: 'Free' | 'Purchased' | 'Native' | 'Species';
}

export interface CharacterSheetAttack {
  name: string;
  skill: string;
  score: SkillScore | null;
  accuracy: string;
  actions: string;
  mode: string;
  range: string;
  damageType: string;
  damage: string;
  quantity: number;
  clips: number;
}

export interface CharacterSheetArmor {
  name: string;
  quantity: number;
  actionCheckPenalty: number;
  lowImpact: string;
  highImpact: string;
  energy: string;
  mass: number;
}

export interface CharacterSheetItem {
  name: string;
  quantity: number;
  details: string;
  mass: number;
}

export interface CharacterSheetNamedDetail {
  name: string;
  details: string;
}

export interface CharacterSheetFxAbility extends SkillScore {
  name: string;
  discipline: FxDiscipline;
  category: string;
  ability: AbilityId;
  quality: FxQuality;
  rank: number;
  purchaseCost: number;
  energyCost: number;
  description: string;
  trappings: string;
}

export interface CharacterSheetAdvancementLevel {
  level: number;
  skillPointsEarned: number;
  skillPointsSpent: number;
  skillPointsRemaining: number;
  creditsAwarded: number;
  acquisitionCost: number;
  creditsRemaining: number;
  purchases: string[];
  notes: string;
}

export interface CharacterSheetModel {
  level: number;
  achievementPoints: number;
  heroName: string;
  playerName: string;
  species: string;
  profession: string;
  career: string;
  attributes: string;
  setting: string;
  gamemaster: string;
  progressLevel: number;
  gender: string;
  age: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  appearance: string;
  background: string;
  motivation: string;
  moralAttitude: string;
  characterTraits: string[];
  allegiance: string;
  socialStatus: string;
  contacts: string;
  enemies: string;
  notes: string;
  abilities: CharacterSheetAbility[];
  skills: CharacterSheetSkill[];
  skillGroups: CharacterSheetSkillGroup[];
  fullSkillCatalog: CharacterSheetSkillGroup[];
  attacks: CharacterSheetAttack[];
  armor: CharacterSheetArmor[];
  equipment: CharacterSheetItem[];
  computers: CharacterSheetItem[];
  cybergear: CharacterSheetItem[];
  perks: CharacterSheetNamedDetail[];
  flaws: CharacterSheetNamedDetail[];
  mutations: CharacterSheetNamedDetail[];
  psionicSkills: CharacterSheetSkill[];
  psionicSkillGroups: CharacterSheetSkillGroup[];
  fxAbilities: CharacterSheetFxAbility[];
  fxBroadSkill: string;
  fxCampaignTone: string;
  currentMaximumFxEnergy: number;
  maximumFxEnergy: number;
  psionicAccessPath: CharacterState['psionicPlan']['accessPath'];
  mutationOrigin: CharacterState['mutationPlan']['origin'];
  mutationScope: CharacterState['mutationPlan']['scope'];
  speciesAbilities: string[];
  professionBenefits: string[];
  skillRuleLabels: string[];
  skillRulesSummary: string;
  advancementLevels: CharacterSheetAdvancementLevel[];
  strengthDamageAdjustment: number;
  actionCheck: CharacterValidationResult['derived']['actionCheck'];
  actionsPerRound: number;
  movement: CharacterValidationResult['derived']['movement'];
  durability: CharacterValidationResult['derived']['durability'];
  lastResorts: CharacterValidationResult['derived']['lastResorts'];
  psionicEnergy: number;
  cyberTolerance: number;
  usedCyberTolerance: number;
  startingFunds: number;
  remainingFunds: number;
  availableSkillPoints: number;
  spentSkillPoints: number;
  remainingSkillPoints: number;
  totalCarriedMass: number;
  valid: boolean;
  errors: string[];
}

function details(...values: Array<string | number | undefined | null>): string {
  return values.filter((value) => value !== undefined && value !== null && value !== '').join(' | ');
}

function normalizedSpecialization(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase();
}

function optionDetails(selection: CharacterState['optionSelections'][number]): string {
  return details(
    selection.value !== undefined ? `${selection.value} points` : '',
    selection.targetAbility?.toUpperCase(),
    selection.choiceIds?.join(', '),
    selection.notes,
  );
}

interface CatalogSkillDefinition {
  id: string;
  name: string;
  ability: AbilityId;
  kind: 'broad' | 'specialty';
  parentSkillId?: string;
  canUseUntrained: boolean;
  requiresSpecialization?: boolean;
}

interface CatalogSpecialtyPurchase {
  skillId: string;
  rank: number;
  specialization?: string;
}

export interface CharacterSheetSkillRow extends SkillScore {
  name: string;
  rank: number | null;
  trained: boolean;
  usable: boolean;
}

export interface CharacterSheetSkillGroup {
  ability: AbilityId;
  broad: CharacterSheetSkillRow;
  specialties: CharacterSheetSkillRow[];
}

function skillRowScore(
  abilityScore: number,
  untrainedScore: number,
  rank: number,
  trained: boolean,
  usable: boolean,
): SkillScore {
  if (!trained && !usable) return { ordinary: 0, good: 0, amazing: 0 };
  return trained ? calculateSkillScore(abilityScore, rank) : calculateSkillScore(untrainedScore, 0);
}

/**
 * Groups a skill catalogue by ability, pairing each broad skill with its specialties in
 * printed-catalogue order. `fullCatalog` includes every definition (PHB Table P19/P52 style);
 * otherwise only trained broads (and their trained specialties) are included.
 */
function buildSkillGroups(
  definitions: CatalogSkillDefinition[],
  abilityScores: Record<AbilityId, number>,
  untrainedScores: Record<AbilityId, number>,
  trainedBroadIds: Set<string>,
  specialtyPurchases: CatalogSpecialtyPurchase[],
  fullCatalog: boolean,
): CharacterSheetSkillGroup[] {
  const groups: CharacterSheetSkillGroup[] = [];
  let currentGroup: CharacterSheetSkillGroup | null = null;
  let currentBroadId: string | null = null;

  for (const definition of definitions) {
    if (definition.kind === 'broad') {
      const trained = trainedBroadIds.has(definition.id);
      currentBroadId = definition.id;
      if (!fullCatalog && !trained) {
        currentGroup = null;
        continue;
      }
      currentGroup = {
        ability: definition.ability,
        broad: {
          name: definition.name,
          rank: null,
          trained,
          usable: trained || definition.canUseUntrained,
          ...skillRowScore(
            abilityScores[definition.ability],
            untrainedScores[definition.ability],
            0,
            trained,
            definition.canUseUntrained,
          ),
        },
        specialties: [],
      };
      groups.push(currentGroup);
      continue;
    }

    if (!currentGroup || definition.parentSkillId !== currentBroadId) continue;

    if (definition.requiresSpecialization) {
      const purchases = specialtyPurchases.filter((entry) => entry.skillId === definition.id);
      if (purchases.length === 0) {
        if (!fullCatalog) continue;
        currentGroup.specialties.push({
          name: definition.name,
          rank: null,
          trained: false,
          usable: definition.canUseUntrained,
          ...skillRowScore(
            abilityScores[definition.ability],
            untrainedScores[definition.ability],
            0,
            false,
            definition.canUseUntrained,
          ),
        });
        continue;
      }
      for (const purchase of purchases) {
        currentGroup.specialties.push({
          name: `${definition.name} (${purchase.specialization})`,
          rank: purchase.rank,
          trained: true,
          usable: true,
          ...calculateSkillScore(abilityScores[definition.ability], purchase.rank),
        });
      }
      continue;
    }

    const purchase = specialtyPurchases.find((entry) => entry.skillId === definition.id);
    const rank = purchase?.rank || 0;
    const trained = rank > 0;
    if (!fullCatalog && !trained) continue;
    currentGroup.specialties.push({
      name: definition.name,
      rank: trained ? rank : null,
      trained,
      usable: trained || definition.canUseUntrained,
      ...skillRowScore(
        abilityScores[definition.ability],
        untrainedScores[definition.ability],
        rank,
        trained,
        definition.canUseUntrained,
      ),
    });
  }

  return fullCatalog ? groups : groups.filter((group) => group.broad.trained || group.specialties.length > 0);
}

function skillScoreForWeapon(
  skillId: string,
  validation: CharacterValidationResult,
): SkillScore | null {
  const skills = getAllSkills();
  const skill = skills.find((entry) => entry.id === skillId);
  if (!skill) return null;
    const purchase = validation.advancement.finalCoreSpecialtySkills.find((entry) => entry.skillId === skillId);
    const trainedBroad = Boolean(skill.parentSkillId && validation.advancement.finalCoreBroadSkillIds.includes(skill.parentSkillId));
  const base = purchase
    ? validation.effectiveAbilityScores[skill.ability] + purchase.rank
    : trainedBroad
      ? validation.effectiveAbilityScores[skill.ability]
      : validation.derived.untrainedScores[skill.ability];
  return calculateSkillScore(base, 0);
}

export function buildCharacterSheetModel(
  state: CharacterState,
  validation: CharacterValidationResult,
): CharacterSheetModel {
  const skills = getAllSkills();
  const psionicSkills = getAllPsionicSkills();
  const equipmentDefinitions = getAllEquipment();
  const weaponDefinitions = getAllWeapons();
  const armorDefinitions = getAllArmor();
  const cybergearDefinitions = getAllCybergear();
  const optionDefinitions = getAllCharacterOptions();
  const mutationDefinitions = getAllMutations();
  const fxRules = getFxRules();
  const species = getSpeciesById(state.speciesId);
  const profession = state.professionId ? getProfessionById(state.professionId) : undefined;
  const optionalSkillRules = [
    state.skillRules.startingSkillAllocation === 'optional-2ab' ? '2A/2B' : '',
    state.skillRules.specialtySkillCosts === 'optional-2c' ? '2C' : '',
  ].filter(Boolean);
  const skillRuleLabels = [
    state.skillRules.startingSkillAllocation === 'optional-2ab'
      ? 'Starting Skills: Official Optional Rules 2A/2B'
      : 'Starting Skills: Standard PHB',
    state.skillRules.specialtySkillCosts === 'optional-2c'
      ? 'Specialty Costs: Official Optional Rule 2C'
      : 'Specialty Costs: Standard PHB',
  ];
  const fxBroadDefinition = fxRules.broadSkills.find((entry) => (
    entry.discipline === validation.advancement.finalFxBroadSkill
  ));
  const fxToneDefinition = fxRules.campaignTones.find((entry) => entry.id === state.fxPlan.campaignTone);

  const abilities = (Object.keys(ABILITY_LABELS) as AbilityId[]).map((id) => ({
    id,
    label: ABILITY_LABELS[id],
    score: validation.effectiveAbilityScores[id],
    untrained: validation.derived.untrainedScores[id],
    resistance: validation.derived.resistanceModifiers[id],
  }));

  const broadSkills: CharacterSheetSkill[] = validation.advancement.finalCoreBroadSkillIds.map((skillId) => {
    const definition = skills.find((entry) => entry.id === skillId);
    const ability = definition?.ability || 'int';
    const score = calculateSkillScore(validation.effectiveAbilityScores[ability], 0);
    return {
      ability,
      name: definition?.name || skillId,
      rank: null,
      source: validation.skills.retainedFreeBroadSkillIds.includes(skillId) ? 'Free' : 'Purchased',
      ...score,
    };
  });
  const specialtySkills: CharacterSheetSkill[] = validation.advancement.finalCoreSpecialtySkills.map((purchase) => {
    const definition = skills.find((entry) => entry.id === purchase.skillId);
    const ability = definition?.ability || 'int';
    const isNative = purchase.skillId === 'language'
      && normalizedSpecialization(purchase.specialization) === normalizedSpecialization(validation.skills.nativeLanguage);
    const isPurchased = state.skillPlan.specialtySkills.some((entry) => (
      entry.skillId === purchase.skillId
      && normalizedSpecialization(entry.specialization) === normalizedSpecialization(purchase.specialization)
    ));
    const isSpecies = !isNative && !isPurchased && validation.speciesBenefits.grantedSpecialtyRanks[purchase.skillId] !== undefined;
    return {
      ability,
      name: `${definition?.name || purchase.skillId}${purchase.specialization ? ` (${purchase.specialization})` : ''}`,
      rank: purchase.rank,
      source: isNative ? 'Native' : isSpecies ? 'Species' : 'Purchased',
      ...calculateSkillScore(validation.effectiveAbilityScores[ability], purchase.rank),
    };
  });

  const fxAbilities: CharacterSheetFxAbility[] = [
    ...validation.advancement.finalFxAbilityPurchases.flatMap((purchase) => {
      const design = state.fxPlan.designs.find((entry) => entry.id === purchase.designId);
      const designResult = validation.fx.designResults.find((entry) => entry.designId === purchase.designId);
      if (!design || !designResult?.quality) return [];
      const trappings = [
        design.trappings.complexRitual ? `Ritual: ${design.trappings.ritual?.trim() || 'Complex ritual'}` : '',
        design.trappings.component ? `Component: ${design.trappings.component}` : '',
        design.trappings.focus ? `Focus: ${design.trappings.focus}` : '',
        design.trappings.limitation ? `Limitation: ${design.trappings.limitation}` : '',
        design.trappings.trigger ? `Trigger: ${design.trappings.trigger}` : '',
      ].filter(Boolean).join(' | ');
      return [{
        name: design.name,
        discipline: design.discipline,
        category: design.category,
        ability: design.ability,
        quality: designResult.quality,
        rank: purchase.rank,
        purchaseCost: designResult.purchaseCost,
        energyCost: getFxAttemptEnergyCost(design.discipline, designResult.quality, designResult.quality, fxRules),
        description: design.description,
        trappings,
        ...calculateSkillScore(validation.effectiveAbilityScores[design.ability], purchase.rank),
      }];
    }),
    ...validation.advancement.finalFxFaithPurchases.flatMap((purchase) => {
      const definition = fxRules.faithSpecialties.find((entry) => entry.quality === purchase.quality);
      if (!definition) return [];
      return [{
        name: definition.name,
        discipline: 'faith' as const,
        category: 'miracle',
        ability: 'wil' as const,
        quality: definition.quality,
        rank: purchase.rank,
        purchaseCost: definition.cost,
        energyCost: getFxAttemptEnergyCost('faith', definition.quality, definition.quality, fxRules),
        description: `${definition.quality} miracle requests`,
        trappings: state.fxPlan.faithFocus?.trim()
          ? `Prayer | Focus: ${state.fxPlan.faithFocus.trim()}`
          : `Prayer | No focus (+${{ ordinary: 1, good: 2, amazing: 3 }[definition.quality]} step penalty)`,
        ...calculateSkillScore(validation.effectiveAbilityScores.wil, purchase.rank),
      }];
    }),
  ];

  const attacks: CharacterSheetAttack[] = [
    {
      name: 'Unarmed', skill: 'Unarmed Attack',
      score: skillScoreForWeapon('brawl', validation),
      accuracy: '-', actions: '1', mode: '-', range: 'Personal',
      damageType: 'LI',
      damage: `d4s/d4+1s/d4+2s (${validation.derived.strengthDamageAdjustment >= 0 ? '+' : ''}${validation.derived.strengthDamageAdjustment} STR)`,
      quantity: 1, clips: 0,
    },
    ...validation.advancement.finalWeaponSelections.map((selection) => {
      const definition = weaponDefinitions.find((entry) => entry.id === selection.weaponId);
      return {
        name: definition?.name || selection.weaponId,
        skill: (definition && skills.find((entry) => entry.id === definition.skillId)?.name) || definition?.skillId || '-',
        score: definition ? skillScoreForWeapon(definition.skillId, validation) : null,
        accuracy: definition ? `${definition.accuracy >= 0 ? '+' : ''}${definition.accuracy}` : '-',
        actions: String(definition?.actions ?? '-'),
        mode: definition?.mode || '-',
        range: definition?.range || '-',
        damageType: definition?.damageType || '-',
        damage: definition?.damage || '-',
        quantity: selection.quantity,
        clips: selection.spareClips,
      };
    }),
    ...(validation.speciesBenefits.naturalWeapon ? [{
      name: 'Natural weapon',
      skill: skills.find((entry) => entry.id === validation.speciesBenefits.naturalWeapon?.skillId)?.name
        || validation.speciesBenefits.naturalWeapon.skillId,
      score: skillScoreForWeapon(validation.speciesBenefits.naturalWeapon.skillId, validation),
      accuracy: '-', actions: '1', mode: '-', range: 'Personal',
      damageType: validation.speciesBenefits.naturalWeapon.damageType,
      damage: validation.speciesBenefits.naturalWeapon.damage,
      quantity: 1, clips: 0,
    }] : []),
  ];

  const armor = [
    ...validation.advancement.finalArmorSelections.map((selection) => {
    const definition = armorDefinitions.find((entry) => entry.id === selection.armorId);
    return {
      name: definition?.name || selection.armorId,
      quantity: selection.quantity,
      actionCheckPenalty: definition?.actionCheckPenalty || 0,
      lowImpact: definition?.lowImpact || '-',
      highImpact: definition?.highImpact || '-',
      energy: definition?.energy || '-',
      mass: (definition?.mass || 0) * selection.quantity,
    };
    }),
    ...(validation.speciesBenefits.naturalArmor ? [{
      name: 'Natural armor', quantity: 1, actionCheckPenalty: 0,
      lowImpact: validation.speciesBenefits.naturalArmor.lowImpact,
      highImpact: validation.speciesBenefits.naturalArmor.highImpact,
      energy: validation.speciesBenefits.naturalArmor.energy,
      mass: 0,
    }] : []),
  ];

  const selectedEquipment = validation.advancement.finalEquipmentSelections.map((selection) => {
    const definition = equipmentDefinitions.find((entry) => entry.id === selection.equipmentId);
    return {
      definition,
      item: {
        name: definition?.name || selection.equipmentId,
        quantity: selection.quantity,
        details: details(selection.quality, selection.granted ? 'Granted' : '', selection.notes),
        mass: (definition?.mass || 0) * selection.quantity,
      },
    };
  });
  const intrinsicCybergear: CharacterSheetItem[] = species?.id === 'mechalus' ? [
    { name: 'Nanocomputer', quantity: 1, details: 'Natural | Good | Granted', mass: 0 },
    { name: 'Neural data slot', quantity: 2, details: 'Natural | Granted', mass: 0 },
    { name: 'Reflex device circuitry', quantity: 1, details: 'Natural | Granted', mass: 0 },
  ] : [];

  const finalOptionSelections = [
    ...state.optionSelections.filter((selection) => !validation.advancement.removedFlawIds.includes(selection.optionId)),
    ...validation.advancement.addedPerks,
  ];
  const options = finalOptionSelections.map((selection) => ({
    definition: optionDefinitions.find((entry) => entry.id === selection.optionId),
    selection,
  }));
  const mutations = state.mutationPlan.selections.map((selection) => {
    const definition = mutationDefinitions.find((entry) => entry.id === selection.mutationId);
    return {
      name: definition?.name || selection.mutationId,
      details: details(definition?.tier, selection.targetAbility?.toUpperCase(), selection.notes),
    };
  });
  const psionicBroadRows: CharacterSheetSkill[] = validation.advancement.finalPsionicBroadSkillIds.map((skillId) => {
    const definition = psionicSkills.find((entry) => entry.id === skillId);
    const ability = definition?.ability || 'int';
    return {
      ability,
      name: definition?.name || skillId,
      rank: null,
      source: state.psionicPlan.purchasedBroadSkillIds.includes(skillId) ? 'Purchased' : 'Free',
      ...calculateSkillScore(validation.effectiveAbilityScores[ability], 0),
    };
  });
  const psionicSpecialtyRows: CharacterSheetSkill[] = validation.advancement.finalPsionicSpecialtySkills.map((purchase) => {
    const definition = psionicSkills.find((entry) => entry.id === purchase.skillId);
    const ability = definition?.ability || 'int';
    return {
      ability,
      name: definition?.name || purchase.skillId,
      rank: purchase.rank,
      source: 'Purchased',
      ...calculateSkillScore(validation.effectiveAbilityScores[ability], purchase.rank),
    };
  });
  const professionBenefits: string[] = [];
  if (profession?.id === 'combat-spec') {
    const favored = skills.find((entry) => entry.id === state.professionBenefits.combatSpecSpecialtySkillId)?.name;
    professionBenefits.push(`Favored combat specialty: ${favored || 'Not selected'} (-1 step)`);
  } else if (profession?.id === 'diplomat') {
    const secondary = getProfessionById(state.skillPlan.additionalDiscountProfessionIds[0] || '')?.name;
    professionBenefits.push(`${state.professionBenefits.diplomatBenefit === 'contacts' ? 'Contacts' : state.professionBenefits.diplomatBenefit === 'resources' ? 'Resources' : 'Benefit not selected'}; secondary profession: ${secondary || 'Not selected'}`);
  } else if (profession?.id === 'free-agent') {
    professionBenefits.push(`+1 ${state.resistanceBonusAbility?.toUpperCase() || 'unselected'} resistance; +1 maximum Last Resort; Last Resort actions cost 2 points`);
  } else if (profession?.id === 'tech-op') {
    professionBenefits.push('Technical specialty skills improve at the profession discount.');
  } else if (profession?.id === 'mindwalker') {
    const favored = psionicSkills.find((entry) => entry.id === state.psionicPlan.favoredBroadSkillId)?.name;
    professionBenefits.push(`Favored psionic discipline: ${favored || 'Not selected'} (-1 step)`);
  }

  const finalCybergear = validation.advancement.finalCybergear || validation.cybergear;
  const cybergearItems: CharacterSheetItem[] = [
    ...intrinsicCybergear,
    ...validation.advancement.finalCybergearSelections.map((selection) => ({
      name: cybergearDefinitions.find((entry) => entry.id === selection.gearId)?.name || selection.gearId,
      quantity: selection.quantity,
      details: details(selection.quality, selection.notes),
      mass: (cybergearDefinitions.find((entry) => entry.id === selection.gearId)?.qualities
        .find((quality) => quality.quality === selection.quality)?.mass || 0) * selection.quantity,
    })),
  ];
  const advancementLevels: CharacterSheetAdvancementLevel[] = validation.advancement.levelResults.map((result) => {
    const plan = state.advancementPlan.levels.find((entry) => entry.level === result.level);
    const acquisitions = validation.advancement.acquisitions.filter((entry) => entry.level === result.level);
    return {
      level: result.level,
      skillPointsEarned: result.skillPointsEarned,
      skillPointsSpent: result.spent,
      skillPointsRemaining: result.remaining,
      creditsAwarded: result.creditsAwarded,
      acquisitionCost: result.acquisitionCost,
      creditsRemaining: result.creditsRemaining,
      purchases: [
        ...result.costs.map((entry) => `${entry.name} (${entry.cost} SP)`),
        ...acquisitions.map((entry) => `${entry.quantity}x ${entry.name} (${entry.method === 'granted' ? 'Granted' : `${entry.cost} credits`})`),
      ],
      notes: plan?.notes || '',
    };
  });
  const equipmentItems = selectedEquipment.filter(({ definition }) => definition?.category !== 'computer').map(({ item }) => item);
  const computerItems = selectedEquipment.filter(({ definition }) => definition?.category === 'computer').map(({ item }) => item);
  const totalCarriedMass = equipmentItems.reduce((sum, item) => sum + item.mass, 0)
    + computerItems.reduce((sum, item) => sum + item.mass, 0)
    + cybergearItems.reduce((sum, item) => sum + item.mass, 0)
    + armor.reduce((sum, item) => sum + item.mass, 0)
    + validation.advancement.finalWeaponSelections.reduce((sum, selection) => {
      const definition = weaponDefinitions.find((entry) => entry.id === selection.weaponId);
      return sum + (definition?.mass || 0) * selection.quantity;
    }, 0);

  const coreTrainedBroadIds = new Set(validation.advancement.finalCoreBroadSkillIds);
  const skillGroups = buildSkillGroups(
    skills,
    validation.effectiveAbilityScores,
    validation.derived.untrainedScores,
    coreTrainedBroadIds,
    validation.advancement.finalCoreSpecialtySkills,
    false,
  );
  const fullSkillCatalog = buildSkillGroups(
    skills,
    validation.effectiveAbilityScores,
    validation.derived.untrainedScores,
    coreTrainedBroadIds,
    validation.advancement.finalCoreSpecialtySkills,
    true,
  );
  const psionicTrainedBroadIds = new Set(validation.advancement.finalPsionicBroadSkillIds);
  const psionicSkillGroups = state.psionicPlan.accessPath !== 'none'
    ? buildSkillGroups(
      psionicSkills,
      validation.effectiveAbilityScores,
      validation.derived.untrainedScores,
      psionicTrainedBroadIds,
      validation.advancement.finalPsionicSpecialtySkills,
      false,
    )
    : [];

  return {
    level: state.level,
    achievementPoints: validation.advancement.achievementPoints,
    heroName: state.identity.heroName || 'Unnamed Hero',
    playerName: state.identity.playerName,
    species: species?.name || state.speciesId,
    profession: profession?.name || 'Unassigned',
    career: state.identity.career,
    attributes: [state.identity.motivation, state.identity.moralAttitude, ...state.identity.characterTraits].filter(Boolean).join(' | '),
    setting: state.identity.campaign,
    gamemaster: state.identity.gamemaster,
    progressLevel: state.progressLevel,
    gender: state.identity.gender,
    age: state.identity.age,
    height: state.identity.height,
    weight: state.identity.weight,
    hair: state.identity.hair,
    eyes: state.identity.eyes,
    appearance: state.identity.appearance,
    background: state.identity.background,
    motivation: state.identity.motivation,
    moralAttitude: state.identity.moralAttitude,
    characterTraits: state.identity.characterTraits,
    allegiance: state.identity.allegiance,
    socialStatus: state.identity.socialStatus,
    contacts: [state.identity.contacts, ...validation.advancement.acquiredContacts].filter(Boolean).join('; '),
    enemies: state.identity.enemies,
    notes: state.identity.notes,
    abilities,
    skills: [...broadSkills, ...specialtySkills],
    skillGroups,
    fullSkillCatalog,
    attacks,
    armor,
    equipment: equipmentItems,
    computers: computerItems,
    cybergear: cybergearItems,
    perks: options.filter(({ definition }) => definition?.kind === 'perk').map(({ definition, selection }) => ({
      name: definition?.name || selection.optionId,
      details: optionDetails(selection),
    })),
    flaws: options.filter(({ definition }) => definition?.kind === 'flaw').map(({ definition, selection }) => ({
      name: definition?.name || selection.optionId,
      details: optionDetails(selection),
    })),
    mutations,
    psionicSkills: [...psionicBroadRows, ...psionicSpecialtyRows],
    psionicSkillGroups,
    fxAbilities,
    fxBroadSkill: fxBroadDefinition?.name || '',
    fxCampaignTone: fxToneDefinition?.name || '',
    currentMaximumFxEnergy: validation.advancement.currentMaximumFxEnergy,
    maximumFxEnergy: validation.advancement.maximumFxEnergy,
    psionicAccessPath: state.psionicPlan.accessPath,
    mutationOrigin: state.mutationPlan.origin,
    mutationScope: state.mutationPlan.scope,
    speciesAbilities: validation.speciesBenefits.summaries,
    professionBenefits,
    skillRuleLabels,
    skillRulesSummary: optionalSkillRules.length > 0
      ? `Official optional skill rules: ${optionalSkillRules.join(' + ')}`
      : 'Skill rules: Standard PHB',
    advancementLevels,
    strengthDamageAdjustment: validation.derived.strengthDamageAdjustment,
    actionCheck: validation.derived.actionCheck,
    actionsPerRound: validation.derived.actionsPerRound,
    movement: validation.derived.movement,
    durability: validation.derived.durability,
    lastResorts: validation.derived.lastResorts,
    psionicEnergy: validation.psionics.maximumEnergyPoints,
    cyberTolerance: finalCybergear.cyberTolerance,
    usedCyberTolerance: finalCybergear.usedTolerance,
    startingFunds: validation.startingFunds.totalFunds,
    remainingFunds: validation.advancement.remainingCredits,
    availableSkillPoints: validation.skills.availableSkillPoints + validation.advancement.totalSkillPointsEarned,
    spentSkillPoints: validation.skills.availableSkillPoints - validation.remainingSkillPoints + validation.advancement.totalSkillPointsSpent,
    remainingSkillPoints: validation.advancement.remainingSkillPoints,
    totalCarriedMass,
    valid: validation.valid,
    errors: validation.errors,
  };
}