import type {
  ArmorDefinition,
  ArmorSelection,
  CombatGearResult,
  SpecialtySkillPurchase,
  WeaponDefinition,
  WeaponSelection,
} from '../types/character';

export function evaluateCombatGear(
  weaponSelections: WeaponSelection[],
  armorSelections: ArmorSelection[],
  weapons: WeaponDefinition[],
  armor: ArmorDefinition[],
  startingFunds: number,
  maximumProgressLevel: number,
  trainedBroadSkillIds: string[] = [],
  specialtySkills: SpecialtySkillPurchase[] = [],
  enforceBudget = true,
): CombatGearResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const weaponById = new Map(weapons.map((definition) => [definition.id, definition]));
  const armorById = new Map(armor.map((definition) => [definition.id, definition]));
  const selectedWeaponIds = new Set<string>();
  const selectedArmorIds = new Set<string>();
  const trainedBroadSkillIdSet = new Set(trainedBroadSkillIds);
  const specialtyRankById = new Map(specialtySkills.map((skill) => [skill.skillId, skill.rank]));
  let weaponCost = 0;
  let ammunitionCost = 0;
  let armorCost = 0;
  let totalMass = 0;
  let armorActionCheckPenalty = 0;

  for (const selection of weaponSelections) {
    const definition = weaponById.get(selection.weaponId);
    if (!definition) {
      errors.push(`Unknown weapon ${selection.weaponId}.`);
      continue;
    }
    if (selectedWeaponIds.has(definition.id)) {
      errors.push(`${definition.name} is selected more than once; use quantity instead.`);
      continue;
    }
    selectedWeaponIds.add(definition.id);
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      errors.push(`${definition.name} quantity must be a positive whole number.`);
      continue;
    }
    if (!Number.isInteger(selection.spareClips) || selection.spareClips < 0) {
      errors.push(`${definition.name} spare clips must be a nonnegative whole number.`);
      continue;
    }
    if (definition.progressLevel > maximumProgressLevel) {
      errors.push(`${definition.name} requires Progress Level ${definition.progressLevel}.`);
    }
    if (definition.cost === null) {
      errors.push(`${definition.name} has no listed purchase cost.`);
    } else {
      weaponCost += definition.cost * selection.quantity;
    }
    if (selection.spareClips > 0 && definition.clipCost === null) {
      errors.push(`${definition.name} has no separately priced ammunition clip.`);
    } else {
      ammunitionCost += (definition.clipCost || 0) * selection.spareClips;
    }
    totalMass += (definition.mass || 0) * selection.quantity;
  }

  for (const selection of armorSelections) {
    const definition = armorById.get(selection.armorId);
    if (!definition) {
      errors.push(`Unknown armor ${selection.armorId}.`);
      continue;
    }
    if (selectedArmorIds.has(definition.id)) {
      errors.push(`${definition.name} is selected more than once; use quantity instead.`);
      continue;
    }
    selectedArmorIds.add(definition.id);
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      errors.push(`${definition.name} quantity must be a positive whole number.`);
      continue;
    }
    if (definition.progressLevel > maximumProgressLevel) {
      errors.push(`${definition.name} requires Progress Level ${definition.progressLevel}.`);
    }
    armorCost += definition.cost * selection.quantity;
    totalMass += definition.mass * selection.quantity;
    let trainingReduction = trainedBroadSkillIdSet.has('armor-operation') ? 1 : 0;
    if (definition.skillId === 'combat-armor' || definition.skillId === 'powered-armor') {
      if ((specialtyRankById.get(definition.skillId) || 0) >= 1) trainingReduction += 1;
    }
    const residualPenalty = Math.max(0, definition.actionCheckPenalty - trainingReduction);
    armorActionCheckPenalty += residualPenalty * selection.quantity;
    if (definition.skillId === 'powered-armor' && (specialtyRankById.get('powered-armor') || 0) < 1) {
      errors.push(`${definition.name} cannot be used without a rank in Powered Armor.`);
    } else if (definition.actionCheckPenalty > 0 && !trainedBroadSkillIdSet.has('armor-operation')) {
      warnings.push(`${definition.name} is cumbersome without Armor Operation training.`);
    }
  }

  const totalCost = weaponCost + ammunitionCost + armorCost;
  const remainingFunds = startingFunds - totalCost;
  if (enforceBudget && remainingFunds < 0) {
    errors.push(`Combat gear exceeds the available funds by ${Math.abs(remainingFunds)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    weaponCost,
    ammunitionCost,
    armorCost,
    totalCost,
    totalMass,
    armorActionCheckPenalty,
    remainingFunds,
  };
}