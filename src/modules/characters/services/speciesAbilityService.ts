import type {
  SpeciesBenefitResult,
  SpeciesDefinition,
  SpecialtySkillPurchase,
} from '../types/character';

const WEREN_REDUCED_TECH_PENALTY = 'weren-reduced-technology-penalty';

export function getSpeciesStartingOptions(speciesId: string): { id: string; name: string; skillPointCost: number }[] {
  return speciesId === 'weren'
    ? [{ id: WEREN_REDUCED_TECH_PENALTY, name: 'Reduce high-tech equipment penalty to +1 step', skillPointCost: 4 }]
    : [];
}

export function evaluateSpeciesBenefits(
  species: SpeciesDefinition,
  selectedOptionIds: string[],
  purchasedSpecialties: SpecialtySkillPurchase[],
): SpeciesBenefitResult {
  const errors: string[] = [];
  const allowedOptions = getSpeciesStartingOptions(species.id);
  const allowedOptionIds = new Set(allowedOptions.map((option) => option.id));
  const selectedIds = new Set<string>();
  for (const optionId of selectedOptionIds) {
    if (selectedIds.has(optionId)) errors.push(`Species option ${optionId} is selected more than once.`);
    else if (!allowedOptionIds.has(optionId)) errors.push(`${optionId} is not a starting option for ${species.name}.`);
    selectedIds.add(optionId);
  }

  const skillPointCost = allowedOptions
    .filter((option) => selectedIds.has(option.id))
    .reduce((sum, option) => sum + option.skillPointCost, 0);
  const grantedSpecialtyRanks: Record<string, number> = {};
  const skillSituationStepBonuses: Record<string, number> = {};
  const summaries: string[] = [];
  let technologyUseStepPenalty = 0;
  let naturalArmor: SpeciesBenefitResult['naturalArmor'] = null;
  let naturalWeapon: SpeciesBenefitResult['naturalWeapon'] = null;

  switch (species.id) {
    case 'human':
      summaries.push('+5 starting skill points and +1 purchased broad-skill allowance.');
      break;
    case 'mutant-human':
      summaries.push('Uses a balanced PHB mutation package instead of the human skill bonus.');
      break;
    case 'fraal':
      summaries.push('Telepathy is a free broad skill; psionic energy depends on the selected psionic path.');
      break;
    case 'mechalus':
      skillSituationStepBonuses['computer-operation'] = -1;
      skillSituationStepBonuses.hacking = -1;
      summaries.push('-1 step with Computer Operation and Hacking while physically merged with a computer.');
      summaries.push('Natural Good nanocomputer, two neural data slots, and circuitry functioning as a reflex device.');
      summaries.push('Cyber tolerance +4; cybernetic equipment is not subject to rejection checks.');
      break;
    case 'sesheyan':
      grantedSpecialtyRanks['zero-g-training'] = 1;
      if (purchasedSpecialties.some((skill) => skill.skillId === 'zero-g-training')) {
        skillSituationStepBonuses['zero-g-training'] = -1;
      }
      summaries.push('Natural flight uses Acrobatics; conscious wing use prevents falling damage.');
      summaries.push('Functions as Zero-G Training rank 1 without purchase; purchased ranks gain an additional -1 step species benefit.');
      summaries.push('Night vision ignores low-light penalties; bright light causes +1 to +3 step penalties unless protected.');
      break;
    case 'tsa':
      skillSituationStepBonuses.juryrig = -1;
      naturalArmor = { lowImpact: 'd4+1', highImpact: 'd4', energy: 'd4-1' };
      summaries.push('-1 base Action Check step and -1 step with Technical Science-Juryrig.');
      summaries.push('Natural armor: d4+1 LI / d4 HI / d4-1 En.');
      break;
    case 'weren':
      technologyUseStepPenalty = selectedIds.has(WEREN_REDUCED_TECH_PENALTY) ? 1 : 2;
      naturalWeapon = { skillId: 'brawl', damageType: 'LI/O', damage: 'd4w/d4+2w/d4m' };
      summaries.push('Superior durability uses CON x 1.5.');
      summaries.push('Natural claws: d4w/d4+2w/d4m (LI/O), plus Strength damage adjustment.');
      summaries.push('+1 step penalty to ranged attacks against the weren when natural camouflage applies.');
      summaries.push(`High-tech equipment penalty: +${technologyUseStepPenalty} steps.`);
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    skillPointCost,
    grantedSpecialtyRanks,
    skillSituationStepBonuses,
    technologyUseStepPenalty,
    naturalArmor,
    naturalWeapon,
    summaries,
  };
}