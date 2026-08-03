import type {
  AbilityId,
  AbilityScores,
  AbilityValidationResult,
  CharacterCalculationOptions,
  CharacterDerivedStats,
  CharacterRules,
  CharacterSkillRules,
  CombatMovementBand,
  DurabilityStats,
  LastResortBand,
  NumericBand,
  ProfessionDefinition,
  ResistanceAbilityId,
  SkillBudget,
  SkillScore,
  SpeciesDefinition,
} from '../types/character';
import { ABILITY_IDS } from '../types/character';
import { STANDARD_CHARACTER_SKILL_RULES } from '../constants/characterSkillRules';

function inBand(value: number, band: { min?: number; max?: number }): boolean {
  return (band.min === undefined || value >= band.min)
    && (band.max === undefined || value <= band.max);
}

function numericBandValue(value: number, bands: NumericBand[]): number {
  const band = bands.find((entry) => inBand(value, entry));
  if (!band) throw new Error(`No rules-table entry covers value ${value}.`);
  return band.value;
}

export function calculateAbilityPointsUsed(scores: AbilityScores): number {
  return ABILITY_IDS.reduce((sum, ability) => sum + scores[ability], 0);
}

export function validateAbilityAllocation(
  scores: AbilityScores,
  species: SpeciesDefinition,
  profession: ProfessionDefinition | null,
  rules: CharacterRules,
): AbilityValidationResult {
  const errors: string[] = [];
  const pointsUsed = calculateAbilityPointsUsed(scores);

  if (pointsUsed !== rules.abilityPointPool) {
    errors.push(`Ability scores must total ${rules.abilityPointPool} points; currently ${pointsUsed}.`);
  }

  for (const ability of ABILITY_IDS) {
    const score = scores[ability];
    const limits = species.abilityLimits[ability];
    if (score < limits.min || score > limits.max) {
      errors.push(`${ability.toUpperCase()} must be between ${limits.min} and ${limits.max} for ${species.name}.`);
    }
  }

  if (profession) {
    for (const [ability, minimum] of Object.entries(profession.requirements) as [AbilityId, number][]) {
      if (scores[ability] < minimum) {
        errors.push(`${profession.name} requires ${ability.toUpperCase()} ${minimum} or higher.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    pointsUsed,
    pointsRemaining: rules.abilityPointPool - pointsUsed,
    errors,
  };
}

export function calculateResistanceModifier(score: number, rules: CharacterRules): number {
  return numericBandValue(score, rules.resistanceModifiers);
}

export function calculateSkillBudget(
  intelligence: number,
  species: SpeciesDefinition,
  rules: CharacterRules,
  skillRules: CharacterSkillRules = STANDARD_CHARACTER_SKILL_RULES,
): SkillBudget {
  if (skillRules.startingSkillAllocation === 'optional-2ab') {
    return {
      baseSkillPoints: 30 + (3 * intelligence),
      totalSkillPoints: 30 + (3 * intelligence) + species.startingSkillPointBonus,
      maxPurchasedBroadSkills: 6
        + calculateResistanceModifier(intelligence, rules)
        + species.broadSkillLimitBonus,
    };
  }

  const sorted = [...rules.startingSkillPoints].sort((a, b) => a.intelligence - b.intelligence);
  const row = sorted.find((entry) => entry.intelligence === intelligence)
    ?? (intelligence < sorted[0].intelligence ? sorted[0] : sorted[sorted.length - 1]);
  return {
    baseSkillPoints: row.skillPoints,
    totalSkillPoints: row.skillPoints + species.startingSkillPointBonus,
    maxPurchasedBroadSkills: row.maxBroadSkills + species.broadSkillLimitBonus,
  };
}

export function calculateLastResorts(
  personality: number,
  rules: CharacterRules,
  profession: ProfessionDefinition | null,
): CharacterDerivedStats['lastResorts'] {
  const row = rules.lastResorts.find((entry: LastResortBand) => inBand(personality, entry));
  if (!row) throw new Error(`No last-resort entry covers Personality ${personality}.`);
  return {
    maximum: row.maximum + (profession?.lastResortMaximumBonus ?? 0),
    initial: row.maximum,
    cost: row.cost,
    actionCost: profession?.lastResortActionCost ?? 1,
  };
}

export function calculateResistanceModifiers(
  scores: AbilityScores,
  rules: CharacterRules,
  profession: ProfessionDefinition | null,
  bonusAbility?: ResistanceAbilityId,
): CharacterDerivedStats['resistanceModifiers'] {
  const choiceBonus = profession?.resistanceModifierChoiceBonus ?? 0;
  return Object.fromEntries(
    ABILITY_IDS.map((ability) => [
      ability,
      ability === 'per'
        ? null
        : calculateResistanceModifier(scores[ability], rules)
          + (ability === bonusAbility ? choiceBonus : 0),
    ]),
  ) as CharacterDerivedStats['resistanceModifiers'];
}

export function calculateActionCheck(
  scores: AbilityScores,
  species: SpeciesDefinition,
  profession: ProfessionDefinition | null,
): CharacterDerivedStats['actionCheck'] {
  const score = Math.floor((scores.dex + scores.int) / 2) + (profession?.actionCheckBonus ?? 0);
  return {
    score,
    marginal: score + 1,
    ordinary: score,
    good: Math.floor(score / 2),
    amazing: Math.floor(score / 4),
    dieStep: species.actionCheckDieStep,
  };
}

export function calculateActionsPerRound(scores: AbilityScores, rules: CharacterRules): number {
  return numericBandValue(scores.con + scores.wil, rules.actionsPerRound);
}

export function calculateCombatMovement(scores: AbilityScores, rules: CharacterRules): CombatMovementBand {
  const total = scores.str + scores.dex;
  const row = rules.combatMovement.find((entry) => inBand(total, entry));
  if (!row) throw new Error(`No combat-movement entry covers STR + DEX ${total}.`);
  return row;
}

export function calculateDurability(scores: AbilityScores, species: SpeciesDefinition): DurabilityStats {
  const adjustedConstitution = Math.floor(scores.con * species.durabilityMultiplier);
  return {
    stun: adjustedConstitution,
    wound: adjustedConstitution,
    mortal: Math.ceil(adjustedConstitution / 2),
    fatigue: Math.ceil(adjustedConstitution / 2),
  };
}

export function calculateSkillScore(abilityScore: number, rank: number): SkillScore {
  const ordinary = abilityScore + rank;
  return {
    ordinary,
    good: Math.floor(ordinary / 2),
    amazing: Math.floor(ordinary / 4),
  };
}

export function calculateCharacterDerivedStats(
  scores: AbilityScores,
  species: SpeciesDefinition,
  profession: ProfessionDefinition | null,
  rules: CharacterRules,
  options: CharacterCalculationOptions = {},
): CharacterDerivedStats {
  const resistanceModifiers = calculateResistanceModifiers(
    scores,
    rules,
    profession,
    options.resistanceBonusAbility,
  );

  const untrainedScores = Object.fromEntries(
    ABILITY_IDS.map((ability) => [ability, Math.floor(scores[ability] / 2)]),
  ) as Record<AbilityId, number>;

  return {
    untrainedScores,
    resistanceModifiers,
    skillBudget: calculateSkillBudget(scores.int, species, rules, options.skillRules),
    lastResorts: calculateLastResorts(scores.per, rules, profession),
    actionCheck: calculateActionCheck(scores, species, profession),
    actionsPerRound: calculateActionsPerRound(scores, rules),
    movement: calculateCombatMovement(scores, rules),
    durability: calculateDurability(scores, species),
    strengthDamageAdjustment: numericBandValue(scores.str, rules.strengthDamageAdjustment),
  };
}