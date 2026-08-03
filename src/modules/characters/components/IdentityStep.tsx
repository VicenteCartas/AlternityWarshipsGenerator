import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { CharacterIdentity } from '../types/characterState';

interface IdentityStepProps {
  identity: CharacterIdentity;
  progressLevel: number;
  targetLevel: number;
  onIdentityChange: (identity: CharacterIdentity) => void;
  onProgressLevelChange: (progressLevel: number) => void;
  onTargetLevelChange: (targetLevel: number) => void;
}

export function IdentityStep({
  identity,
  progressLevel,
  targetLevel,
  onIdentityChange,
  onProgressLevelChange,
  onTargetLevelChange,
}: IdentityStepProps) {
  const setField = (field: keyof CharacterIdentity, value: string | string[]) => {
    onIdentityChange({ ...identity, [field]: value });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Identity and Roleplaying</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <TextField label="Hero Name" value={identity.heroName} onChange={(event) => setField('heroName', event.target.value)} required />
        <TextField label="Player Name" value={identity.playerName} onChange={(event) => setField('playerName', event.target.value)} />
        <TextField label="Campaign" value={identity.campaign} onChange={(event) => setField('campaign', event.target.value)} />
        <TextField label="Gamemaster" value={identity.gamemaster} onChange={(event) => setField('gamemaster', event.target.value)} />
        <TextField label="Career" value={identity.career} onChange={(event) => setField('career', event.target.value)} required />
        <TextField select label="Progress Level" value={progressLevel} onChange={(event) => onProgressLevelChange(Number(event.target.value))}>
          {[4, 5, 6, 7, 8, 9].map((level) => <MenuItem key={level} value={level}>PL {level}</MenuItem>)}
        </TextField>
        <TextField
          label="Target Level"
          type="number"
          value={targetLevel}
          onChange={(event) => onTargetLevelChange(Number(event.target.value))}
          helperText="Level 1 is created first; later levels use Advancement"
          inputProps={{ min: 1, max: 30, step: 1 }}
        />
        <TextField label="Gender" value={identity.gender} onChange={(event) => setField('gender', event.target.value)} />
        <TextField label="Age" value={identity.age} onChange={(event) => setField('age', event.target.value)} />
        <TextField label="Height" value={identity.height} onChange={(event) => setField('height', event.target.value)} />
        <TextField label="Weight" value={identity.weight} onChange={(event) => setField('weight', event.target.value)} />
        <TextField label="Hair" value={identity.hair} onChange={(event) => setField('hair', event.target.value)} />
        <TextField label="Eyes" value={identity.eyes} onChange={(event) => setField('eyes', event.target.value)} />
        <TextField label="Allegiance" value={identity.allegiance} onChange={(event) => setField('allegiance', event.target.value)} />
        <TextField label="Social Status" value={identity.socialStatus} onChange={(event) => setField('socialStatus', event.target.value)} />
        <TextField label="Motivation" value={identity.motivation} onChange={(event) => setField('motivation', event.target.value)} required />
        <TextField label="Moral Attitude" value={identity.moralAttitude} onChange={(event) => setField('moralAttitude', event.target.value)} required />
        <TextField
          label="Character Traits"
          value={identity.characterTraits.join(', ')}
          onChange={(event) => setField('characterTraits', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
          helperText="Separate traits with commas"
          error={identity.characterTraits.length > 2}
          required
        />
      </Box>
      <TextField label="Appearance" value={identity.appearance} onChange={(event) => setField('appearance', event.target.value)} multiline minRows={2} />
      <TextField label="Background" value={identity.background} onChange={(event) => setField('background', event.target.value)} multiline minRows={3} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <TextField label="Contacts" value={identity.contacts} onChange={(event) => setField('contacts', event.target.value)} multiline minRows={2} />
        <TextField label="Enemies" value={identity.enemies} onChange={(event) => setField('enemies', event.target.value)} multiline minRows={2} />
      </Box>
      <TextField label="Notes" value={identity.notes} onChange={(event) => setField('notes', event.target.value)} multiline minRows={3} />
    </Stack>
  );
}