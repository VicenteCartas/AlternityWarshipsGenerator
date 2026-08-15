import type {
  CharacterStepId,
  CharacterState,
  CharacterValidationResult,
} from '../types/characterState';

export interface CharacterStepDefinition {
  id: CharacterStepId;
  label: string;
  required: boolean;
}

const ALL_CHARACTER_STEPS: CharacterStepDefinition[] = [
  { id: 'identity', label: 'Identity', required: true },
  { id: 'species', label: 'Species', required: true },
  { id: 'profession', label: 'Profession', required: true },
  { id: 'abilities', label: 'Abilities', required: true },
  { id: 'skills', label: 'Skills', required: true },
  { id: 'options', label: 'Perks & Flaws', required: false },
  { id: 'psionics', label: 'Psionics', required: false },
  { id: 'fx', label: 'FX', required: false },
  { id: 'mutations', label: 'Mutations', required: false },
  { id: 'cybergear', label: 'Cybergear', required: false },
  { id: 'equipment', label: 'Equipment', required: true },
  { id: 'advancement', label: 'Advancement', required: true },
  { id: 'summary', label: 'Summary', required: true },
];

export function getCharacterSteps(state: CharacterState): CharacterStepDefinition[] {
  const hasFxData = state.fxPlan.campaignTone !== null
    || state.fxPlan.broadSkill !== null
    || Boolean(state.fxPlan.faithFocus?.trim())
    || state.fxPlan.designs.length > 0
    || state.fxPlan.abilityPurchases.length > 0
    || state.fxPlan.faithPurchases.length > 0;
  const fxEnabled = state.selectedSourcePackIds.includes('gmg-fx');
  return ALL_CHARACTER_STEPS
    .filter((step) => step.id !== 'fx' || fxEnabled || hasFxData)
    .map((step) => ({
    ...step,
    required: step.id === 'mutations'
      ? state.speciesId === 'mutant-human'
      : step.id === 'psionics'
        ? state.professionId === 'mindwalker'
          || state.skillPlan.additionalDiscountProfessionIds.includes('mindwalker')
        : step.required,
  }));
}

export function getCharacterStepCompletion(
  state: CharacterState,
  validation: CharacterValidationResult,
): Map<CharacterStepId, boolean> {
  const identityComplete = Boolean(
    state.identity.heroName.trim()
    && state.identity.career.trim()
    && state.identity.motivation.trim()
    && state.identity.moralAttitude.trim()
    && state.identity.characterTraits.length > 0
    && state.identity.characterTraits.length <= 2
    && state.progressLevel >= 4
    && state.progressLevel <= 9,
  );
  const professionComplete = Boolean(
    state.professionId
    && validation.professionErrors.length === 0
    && !validation.abilities.errors.some((error) => error.includes(' requires ')),
  );

  return new Map<CharacterStepId, boolean>([
    ['identity', identityComplete],
    ['species', Boolean(state.speciesId) && validation.speciesBenefits.valid],
    ['profession', professionComplete],
    ['abilities', validation.abilities.valid],
    ['skills', validation.skills.valid && validation.remainingSkillPoints >= 0],
    ['options', state.optionSelections.length > 0 && validation.options.valid],
    ['psionics', state.psionicPlan.accessPath !== 'none' && validation.psionics.valid],
    ['fx', state.fxPlan.broadSkill !== null && validation.fx.valid],
    ['mutations', state.mutationPlan.selections.length > 0 && validation.mutations.valid],
    ['cybergear', state.cybergearSelections.length > 0 && validation.cybergear.valid],
    ['equipment', validation.startingFunds.valid && validation.equipment.valid && validation.combatGear.valid],
    ['advancement', validation.advancement.valid],
    ['summary', validation.valid],
  ]);
}