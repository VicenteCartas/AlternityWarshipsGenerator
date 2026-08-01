import { Alert, Chip, Stack, Typography } from '@mui/material';
import type { CharacterStepId, CharacterValidationResult } from '../types/characterState';

interface RulesOverviewStepProps {
  stepId: CharacterStepId;
  validation: CharacterValidationResult;
}

export function RulesOverviewStep({ stepId, validation }: RulesOverviewStepProps) {
  const details: Record<string, { title: string; chips: string[]; errors: string[] }> = {
    skills: {
      title: 'Skills',
      chips: [`${validation.skills.remainingSkillPoints} points remaining`, `${validation.skills.purchasedBroadSkillCount}/${validation.skills.maxPurchasedBroadSkills} broad skills`],
      errors: validation.skills.errors,
    },
    options: {
      title: 'Perks & Flaws',
      chips: [`${validation.options.perkCount} perks`, `${validation.options.flawCount} flaws`, `${validation.options.skillPointAdjustment >= 0 ? '+' : ''}${validation.options.skillPointAdjustment} skill points`],
      errors: validation.options.errors,
    },
    psionics: {
      title: 'Psionics',
      chips: [validation.psionics.accessPath, `${validation.psionics.maximumEnergyPoints} energy`, `${validation.psionics.spentSkillPoints} skill points spent`],
      errors: validation.psionics.errors,
    },
    mutations: {
      title: 'Mutations',
      chips: [`${validation.mutations.spentAdvantagePoints} advantage points`, `${validation.mutations.spentDrawbackPoints} drawback points`],
      errors: validation.mutations.errors,
    },
    cybergear: {
      title: 'Cybergear',
      chips: [`${validation.cybergear.usedTolerance}/${validation.cybergear.cyberTolerance} tolerance`, `${validation.cybergear.equipmentCost} credits`],
      errors: validation.cybergear.errors,
    },
    equipment: {
      title: 'Equipment',
      chips: [`${validation.startingFunds.totalFunds} starting credits`, `${validation.remainingFunds} credits remaining`, `${validation.equipment.totalMass} kg`],
      errors: [...validation.startingFunds.errors, ...validation.equipment.errors],
    },
  };
  const detail = details[stepId];

  return (
    <Stack spacing={3}>
      <Typography variant="h5">{detail.title}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {detail.chips.map((chip) => <Chip key={chip} label={chip} variant="outlined" />)}
      </Stack>
      {detail.errors.length > 0 && <Alert severity="warning">{detail.errors.join(' ')}</Alert>}
    </Stack>
  );
}