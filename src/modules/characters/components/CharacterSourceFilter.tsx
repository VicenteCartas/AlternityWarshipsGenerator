import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { CharacterDefinitionSource } from '../services/characterDefinitionSourceService';

interface CharacterSourceFilterProps {
  id: string;
  value: string;
  options: CharacterDefinitionSource[];
  onChange: (value: string) => void;
}

export function CharacterSourceFilter({ id, value, options, onChange }: CharacterSourceFilterProps) {
  const labelId = `${id}-label`;

  return (
    <FormControl size="small" sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
      <InputLabel id={labelId}>Source</InputLabel>
      <Select
        labelId={labelId}
        label="Source"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <MenuItem value="all">All sources</MenuItem>
        {options.map((source) => (
          <MenuItem key={source.key} value={source.key}>
            {source.label}{source.kind === 'Mod' ? ' (Mod)' : ''}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}