import { Autocomplete, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { getCharacterIdentityOptions } from '../services/characterDataService';
import type { CharacterIdentity } from '../types/characterState';

interface IdentityStepProps {
  identity: CharacterIdentity;
  progressLevel: number;
  targetLevel: number;
  onIdentityChange: (identity: CharacterIdentity) => void;
  onProgressLevelChange: (progressLevel: number) => void;
  onTargetLevelChange: (targetLevel: number) => void;
}

interface EditableOptionProps {
  label: string;
  options: string[];
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}

function EditableOption({ label, options, value, required = false, onChange }: EditableOptionProps) {
  return (
    <Autocomplete
      freeSolo
      autoSelect
      options={options}
      value={value || null}
      inputValue={value}
      onChange={(_event, nextValue) => onChange(nextValue || '')}
      onInputChange={(_event, nextValue, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(nextValue);
      }}
      renderInput={(params) => <TextField {...params} label={label} required={required} />}
    />
  );
}

export function IdentityStep({
  identity,
  progressLevel,
  targetLevel,
  onIdentityChange,
  onProgressLevelChange,
  onTargetLevelChange,
}: IdentityStepProps) {
  const identityOptions = getCharacterIdentityOptions();
  const setField = (field: keyof CharacterIdentity, value: string | string[]) => {
    onIdentityChange({ ...identity, [field]: value });
  };

  const setTrait = (index: number, value: string) => {
    const next = [identity.characterTraits[0] || '', identity.characterTraits[1] || ''];
    next[index] = value;
    setField('characterTraits', next.filter((trait) => trait.trim().length > 0));
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
        <EditableOption
          label="Motivation"
          options={identityOptions.motivations}
          value={identity.motivation}
          onChange={(value) => setField('motivation', value)}
          required
        />
        <EditableOption
          label="Moral Attitude"
          options={identityOptions.moralAttitudes}
          value={identity.moralAttitude}
          onChange={(value) => setField('moralAttitude', value)}
          required
        />
        <EditableOption
          label="Character Trait 1"
          options={identityOptions.characterTraits.filter((trait) => trait !== identity.characterTraits[1])}
          value={identity.characterTraits[0] || ''}
          onChange={(value) => setTrait(0, value)}
          required
        />
        <EditableOption
          label="Character Trait 2"
          options={identityOptions.characterTraits.filter((trait) => trait !== identity.characterTraits[0])}
          value={identity.characterTraits[1] || ''}
          onChange={(value) => setTrait(1, value)}
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