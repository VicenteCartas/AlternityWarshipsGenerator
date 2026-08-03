import {
  Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select,
} from '@mui/material';

interface EquipmentProgressLevelFilterProps {
  id: string;
  availableLevels: number[];
  selectedLevels: number[];
  onChange: (levels: number[]) => void;
}

export function EquipmentProgressLevelFilter({
  id,
  availableLevels,
  selectedLevels,
  onChange,
}: EquipmentProgressLevelFilterProps) {
  const labelId = `${id}-label`;

  return (
    <FormControl size="small" sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
      <InputLabel id={labelId}>Progress Levels</InputLabel>
      <Select
        multiple
        displayEmpty
        labelId={labelId}
        label="Progress Levels"
        value={selectedLevels.map(String)}
        onChange={(event) => {
          const values = typeof event.target.value === 'string'
            ? event.target.value.split(',')
            : event.target.value;
          onChange(values.includes('all') ? [] : values.map(Number));
        }}
        renderValue={(selected) => selected.length === 0
          ? 'All PLs'
          : selected.map((level) => `PL ${level}`).join(', ')}
      >
        <MenuItem value="all">
          <Checkbox checked={selectedLevels.length === 0} />
          <ListItemText primary="All PLs" />
        </MenuItem>
        {availableLevels.map((level) => (
          <MenuItem key={level} value={String(level)}>
            <Checkbox checked={selectedLevels.includes(level)} />
            <ListItemText primary={`PL ${level}`} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}