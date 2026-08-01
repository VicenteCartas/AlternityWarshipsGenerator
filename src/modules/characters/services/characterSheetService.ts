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
  getProfessionById,
  getSpeciesById,
} from './characterDataService';
import type { AbilityId, SkillScore } from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

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

export interface CharacterSheetModel {
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
  attacks: CharacterSheetAttack[];
  armor: CharacterSheetArmor[];
  equipment: CharacterSheetItem[];
  computers: CharacterSheetItem[];
  cybergear: CharacterSheetItem[];
  perks: CharacterSheetNamedDetail[];
  flaws: CharacterSheetNamedDetail[];
  mutations: CharacterSheetNamedDetail[];
  psionicSkills: CharacterSheetSkill[];
  psionicAccessPath: CharacterState['psionicPlan']['accessPath'];
  mutationOrigin: CharacterState['mutationPlan']['origin'];
  mutationScope: CharacterState['mutationPlan']['scope'];
  speciesAbilities: string[];
  professionBenefits: string[];
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

function optionDetails(selection: CharacterState['optionSelections'][number]): string {
  return details(
    selection.value !== undefined ? `${selection.value} points` : '',
    selection.targetAbility?.toUpperCase(),
    selection.choiceIds?.join(', '),
    selection.notes,
  );
}

function skillScoreForWeapon(
  skillId: string,
  state: CharacterState,
  validation: CharacterValidationResult,
): SkillScore | null {
  const skills = getAllSkills();
  const skill = skills.find((entry) => entry.id === skillId);
  if (!skill) return null;
  const purchase = state.skillPlan.specialtySkills.find((entry) => entry.skillId === skillId);
  const trainedBroad = Boolean(skill.parentSkillId && validation.skills.trainedBroadSkillIds.includes(skill.parentSkillId));
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
  const species = getSpeciesById(state.speciesId);
  const profession = state.professionId ? getProfessionById(state.professionId) : undefined;

  const abilities = (Object.keys(ABILITY_LABELS) as AbilityId[]).map((id) => ({
    id,
    label: ABILITY_LABELS[id],
    score: validation.effectiveAbilityScores[id],
    untrained: validation.derived.untrainedScores[id],
    resistance: validation.derived.resistanceModifiers[id],
  }));

  const broadSkills: CharacterSheetSkill[] = validation.skills.trainedBroadSkillIds.map((skillId) => {
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
  const specialtySkills: CharacterSheetSkill[] = state.skillPlan.specialtySkills.map((purchase) => {
    const definition = skills.find((entry) => entry.id === purchase.skillId);
    const ability = definition?.ability || 'int';
    return {
      ability,
      name: `${definition?.name || purchase.skillId}${purchase.specialization ? ` (${purchase.specialization})` : ''}`,
      rank: purchase.rank,
      source: 'Purchased',
      ...calculateSkillScore(validation.effectiveAbilityScores[ability], purchase.rank),
    };
  });
  const purchasedSpecialtyIds = new Set(state.skillPlan.specialtySkills.map((purchase) => purchase.skillId));
  const speciesSpecialtySkills: CharacterSheetSkill[] = Object.entries(validation.speciesBenefits.grantedSpecialtyRanks)
    .filter(([skillId]) => !purchasedSpecialtyIds.has(skillId))
    .map(([skillId, rank]) => {
      const definition = skills.find((entry) => entry.id === skillId);
      const ability = definition?.ability || 'int';
      return {
        ability,
        name: definition?.name || skillId,
        rank,
        source: 'Species',
        ...calculateSkillScore(validation.effectiveAbilityScores[ability], rank),
      };
    });
  const nativeLanguage: CharacterSheetSkill = {
    ability: 'int',
    name: `Language (${validation.skills.nativeLanguage || 'Not selected'})`,
    rank: 3,
    source: 'Native',
    ...calculateSkillScore(validation.effectiveAbilityScores.int, 3),
  };

  const attacks: CharacterSheetAttack[] = [
    {
      name: 'Unarmed', skill: 'Unarmed Attack',
      score: skillScoreForWeapon('brawl', state, validation),
      accuracy: '-', actions: '1', mode: '-', range: 'Personal',
      damage: `d4s/d4+1s/d4+2s (${validation.derived.strengthDamageAdjustment >= 0 ? '+' : ''}${validation.derived.strengthDamageAdjustment} STR)`,
      quantity: 1, clips: 0,
    },
    ...state.weaponSelections.map((selection) => {
      const definition = weaponDefinitions.find((entry) => entry.id === selection.weaponId);
      return {
        name: definition?.name || selection.weaponId,
        skill: definition?.skillId || '-',
        score: definition ? skillScoreForWeapon(definition.skillId, state, validation) : null,
        accuracy: definition ? `${definition.accuracy >= 0 ? '+' : ''}${definition.accuracy}` : '-',
        actions: String(definition?.actions ?? '-'),
        mode: definition?.mode || '-',
        range: definition?.range || '-',
        damage: definition ? `${definition.damageType} ${definition.damage}` : '-',
        quantity: selection.quantity,
        clips: selection.spareClips,
      };
    }),
    ...(validation.speciesBenefits.naturalWeapon ? [{
      name: 'Natural weapon',
      skill: validation.speciesBenefits.naturalWeapon.skillId,
      score: skillScoreForWeapon(validation.speciesBenefits.naturalWeapon.skillId, state, validation),
      accuracy: '-', actions: '1', mode: '-', range: 'Personal',
      damage: `${validation.speciesBenefits.naturalWeapon.damageType} ${validation.speciesBenefits.naturalWeapon.damage}`,
      quantity: 1, clips: 0,
    }] : []),
  ];

  const armor = [
    ...state.armorSelections.map((selection) => {
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

  const selectedEquipment = state.equipmentSelections.map((selection) => {
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

  const options = state.optionSelections.map((selection) => ({
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
  const psionicRows: CharacterSheetSkill[] = state.psionicPlan.specialtySkills.map((purchase) => {
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

  return {
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
    contacts: state.identity.contacts,
    enemies: state.identity.enemies,
    notes: state.identity.notes,
    abilities,
    skills: [...broadSkills, nativeLanguage, ...speciesSpecialtySkills, ...specialtySkills],
    attacks,
    armor,
    equipment: selectedEquipment.filter(({ definition }) => definition?.category !== 'computer').map(({ item }) => item),
    computers: selectedEquipment.filter(({ definition }) => definition?.category === 'computer').map(({ item }) => item),
    cybergear: [
      ...intrinsicCybergear,
      ...state.cybergearSelections.map((selection) => ({
        name: cybergearDefinitions.find((entry) => entry.id === selection.gearId)?.name || selection.gearId,
        quantity: selection.quantity,
        details: details(selection.quality, selection.notes),
        mass: (cybergearDefinitions.find((entry) => entry.id === selection.gearId)?.qualities
          .find((quality) => quality.quality === selection.quality)?.mass || 0) * selection.quantity,
      })),
    ],
    perks: options.filter(({ definition }) => definition?.kind === 'perk').map(({ definition, selection }) => ({
      name: definition?.name || selection.optionId,
      details: optionDetails(selection),
    })),
    flaws: options.filter(({ definition }) => definition?.kind === 'flaw').map(({ definition, selection }) => ({
      name: definition?.name || selection.optionId,
      details: optionDetails(selection),
    })),
    mutations,
    psionicSkills: psionicRows,
    psionicAccessPath: state.psionicPlan.accessPath,
    mutationOrigin: state.mutationPlan.origin,
    mutationScope: state.mutationPlan.scope,
    speciesAbilities: validation.speciesBenefits.summaries,
    professionBenefits,
    strengthDamageAdjustment: validation.derived.strengthDamageAdjustment,
    actionCheck: validation.derived.actionCheck,
    actionsPerRound: validation.derived.actionsPerRound,
    movement: validation.derived.movement,
    durability: validation.derived.durability,
    lastResorts: validation.derived.lastResorts,
    psionicEnergy: validation.psionics.maximumEnergyPoints,
    cyberTolerance: validation.cybergear.cyberTolerance,
    usedCyberTolerance: validation.cybergear.usedTolerance,
    startingFunds: validation.startingFunds.totalFunds,
    remainingFunds: validation.remainingFunds,
    availableSkillPoints: validation.skills.availableSkillPoints,
    spentSkillPoints: validation.skills.availableSkillPoints - validation.remainingSkillPoints,
    remainingSkillPoints: validation.remainingSkillPoints,
    totalCarriedMass: validation.equipment.totalMass + validation.cybergear.totalMass + validation.combatGear.totalMass,
    valid: validation.valid,
    errors: validation.errors,
  };
}