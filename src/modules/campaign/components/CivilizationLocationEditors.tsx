import {
  Box, Button, ButtonBase, Checkbox, Chip, FormControlLabel, IconButton, MenuItem,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { CityTownLocation, InstallationLocation } from '../types/worldbuilding';
import { INSTALLATION_FACILITIES } from '../services/civilizationDesignService';

const FIELD_SX = { '& .MuiInputBase-root': { alignItems: 'flex-start' } } as const;

interface RecordListProps<T extends { id: string; name: string; kind: string }> {
  records: T[];
  selectedId: string | null;
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  onSelect: (id: string) => void;
}

function RecordList<T extends { id: string; name: string; kind: string }>({
  records, selectedId, emptyText, addLabel, onAdd, onSelect,
}: RecordListProps<T>) {
  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd}>{addLabel}</Button>
      {records.length === 0 && <Typography variant="body2" color="text.secondary">{emptyText}</Typography>}
      {records.map((record) => (
        <ButtonBase
          key={record.id}
          onClick={() => onSelect(record.id)}
          sx={{
            display: 'block', width: '100%', textAlign: 'left', px: 1.5, py: 1,
            borderLeft: 3, borderColor: selectedId === record.id ? 'primary.main' : 'divider',
            bgcolor: selectedId === record.id ? 'action.selected' : 'transparent',
          }}
        >
          <Typography fontWeight={600} noWrap>{record.name || 'Unnamed'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{record.kind}</Typography>
        </ButtonBase>
      ))}
    </Stack>
  );
}

function EditorActions({
  onExport,
  onDuplicate,
  onRemove,
}: {
  onExport: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <Stack direction="row" gap={0.5}>
      <Tooltip title="Export PDF"><IconButton aria-label="Export location PDF" onClick={onExport}><PictureAsPdfIcon /></IconButton></Tooltip>
      <Tooltip title="Duplicate"><IconButton aria-label="Duplicate location" onClick={onDuplicate}><ContentCopyIcon /></IconButton></Tooltip>
      <Tooltip title="Remove"><IconButton aria-label="Remove location" color="error" onClick={onRemove}><DeleteOutlineIcon /></IconButton></Tooltip>
    </Stack>
  );
}

export function CityTownEditor({
  records, selectedId, onSelectedIdChange, onAdd, onChange, onExport, onDuplicate, onRemove,
}: {
  records: CityTownLocation[];
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onAdd: () => void;
  onChange: (record: CityTownLocation) => void;
  onExport: (record: CityTownLocation) => void;
  onDuplicate: (record: CityTownLocation) => void;
  onRemove: (id: string) => void;
}) {
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const field = (key: keyof CityTownLocation, label: string) => selected && (
    <TextField
      label={label}
      value={String(selected[key])}
      onChange={(event) => onChange({ ...selected, [key]: event.target.value })}
      multiline
      minRows={3}
      fullWidth
      sx={FIELD_SX}
    />
  );
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 2 }}>
      <RecordList records={records} selectedId={selected?.id ?? null} emptyText="No cities or towns added." addLabel="Add City/Town" onAdd={onAdd} onSelect={onSelectedIdChange} />
      {selected ? (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Typography variant="h6">{selected.name || 'Unnamed Location'}</Typography>
            <EditorActions onExport={() => onExport(selected)} onDuplicate={() => onDuplicate(selected)} onRemove={() => onRemove(selected.id)} />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
            <TextField label="Location name" value={selected.name} onChange={(event) => onChange({ ...selected, name: event.target.value })} />
            <TextField select label="Location type" value={selected.kind} onChange={(event) => onChange({ ...selected, kind: event.target.value as CityTownLocation['kind'] })}>
              <MenuItem value="city">City</MenuItem><MenuItem value="town">Town</MenuItem>
            </TextField>
            <TextField label="Population" value={selected.population} onChange={(event) => onChange({ ...selected, population: event.target.value })} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            {field('overview', 'Overview and notable communities')}{field('layout', 'Districts, map scale, and layout')}
            {field('lodging', 'Where do the heroes sleep?')}{field('foodAndDrink', 'Where do they eat and drink?')}
            {field('equipmentAccess', 'Where can they obtain equipment and services?')}{field('criminalUnderworld', 'Where are the bad guys?')}
            {field('lawEnforcement', 'Where are the local law enforcers?')}{field('specialFacilities', 'Special facilities and structures')}
            {field('campaignRole', 'Campaign role and adventure opportunities')}{field('notes', 'Notes')}
          </Box>
        </Stack>
      ) : <Typography color="text.secondary">Add a city or town to begin.</Typography>}
    </Box>
  );
}

export function InstallationEditor({
  records, selectedId, onSelectedIdChange, onAdd, onChange, onExport, onDuplicate, onRemove,
}: {
  records: InstallationLocation[];
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onAdd: () => void;
  onChange: (record: InstallationLocation) => void;
  onExport: (record: InstallationLocation) => void;
  onDuplicate: (record: InstallationLocation) => void;
  onRemove: (id: string) => void;
}) {
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const field = (key: keyof InstallationLocation, label: string) => selected && (
    <TextField
      label={label}
      value={String(selected[key])}
      onChange={(event) => onChange({ ...selected, [key]: event.target.value })}
      multiline
      minRows={3}
      fullWidth
      sx={FIELD_SX}
    />
  );
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 2 }}>
      <RecordList records={records} selectedId={selected?.id ?? null} emptyText="No stations or installations added." addLabel="Add Station/Installation" onAdd={onAdd} onSelect={onSelectedIdChange} />
      {selected ? (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Typography variant="h6">{selected.name || 'Unnamed Location'}</Typography>
            <EditorActions onExport={() => onExport(selected)} onDuplicate={() => onDuplicate(selected)} onRemove={() => onRemove(selected.id)} />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <TextField label="Location name" value={selected.name} onChange={(event) => onChange({ ...selected, name: event.target.value })} />
            <TextField select label="Location type" value={selected.kind} onChange={(event) => onChange({ ...selected, kind: event.target.value as InstallationLocation['kind'] })}>
              <MenuItem value="station">Station</MenuItem><MenuItem value="installation">Installation</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            {field('purpose', 'Purpose')}{field('location', 'Location and access')}
            {field('occupants', 'Occupants and staffing')}{field('isolation', 'Isolation and external support')}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Typography variant="h6">Facilities</Typography>
            <Chip label={`${selected.facilityIds.length} ${selected.facilityIds.length === 1 ? 'facility' : 'facilities'} selected`} variant="outlined" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, columnGap: 2 }}>
            {INSTALLATION_FACILITIES.map((facility) => (
              <FormControlLabel
                key={facility.id}
                control={(
                  <Checkbox
                    checked={selected.facilityIds.includes(facility.id)}
                    onChange={(event) => onChange({
                      ...selected,
                      facilityIds: event.target.checked
                        ? [...selected.facilityIds, facility.id]
                        : selected.facilityIds.filter((id) => id !== facility.id),
                    })}
                  />
                )}
                label={facility.name}
              />
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            {field('layout', 'Facility layout and operations')}{field('contacts', 'Contacts and allies')}
            {field('rivals', 'Rivals and threats')}{field('campaignRole', 'Campaign role and adventure opportunities')}
            {field('notes', 'Notes')}
          </Box>
        </Stack>
      ) : <Typography color="text.secondary">Add a station or installation to begin.</Typography>}
    </Box>
  );
}
