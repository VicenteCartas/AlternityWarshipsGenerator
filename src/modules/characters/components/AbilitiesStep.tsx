import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { getCharacterRules, getSpeciesById } from '../services/characterDataService';
import type { AbilityId, AbilityScores } from '../types/character';

interface AbilitiesStepProps {
  scores: AbilityScores;
  speciesId: string;
  errors: string[];
  onChange: (scores: AbilityScores) => void;
}

const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wil', 'per'];

export function AbilitiesStep({ scores, speciesId, errors, onChange }: AbilitiesStepProps) {
  const species = getSpeciesById(speciesId);
  const pointPool = getCharacterRules().abilityPointPool;
  const total = ABILITIES.reduce((sum, ability) => sum + scores[ability], 0);
  const hasErrors = errors.length > 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="h5">Ability Scores</Typography>
        <Typography variant="h6" color={total === pointPool ? 'success.main' : 'error.main'}>{total} / {pointPool}</Typography>
      </Stack>
      <Alert
        severity={hasErrors ? 'error' : 'success'}
        sx={{
          height: { xs: 88, sm: 52 },
          boxSizing: 'border-box',
          alignItems: 'center',
          overflowY: 'auto',
        }}
      >
        {hasErrors ? errors.join(' ') : `Ability scores use all ${pointPool} points.`}
      </Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2 }}>
        {ABILITIES.map((ability) => {
          const limits = species?.abilityLimits[ability];
          return (
            <TextField
              key={ability}
              label={ability.toUpperCase()}
              type="number"
              value={scores[ability]}
              onChange={(event) => onChange({ ...scores, [ability]: Number(event.target.value) })}
              slotProps={{ htmlInput: { min: limits?.min, max: limits?.max } }}
              helperText={limits ? `${limits.min}-${limits.max}` : undefined}
            />
          );
        })}
      </Box>
    </Stack>
  );
}