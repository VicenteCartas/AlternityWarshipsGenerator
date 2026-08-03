import { useState } from 'react';
import {
  Alert, Checkbox, Chip, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { getAllCharacterSourcePacks, getAllCybergear } from '../services/characterDataService';
import {
  getCharacterDefinitionSource,
  getCharacterDefinitionSources,
} from '../services/characterDefinitionSourceService';
import type { CybergearSelection, EquipmentQuality } from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { CharacterSourceFilter } from './CharacterSourceFilter';
import { EquipmentProgressLevelFilter } from './EquipmentProgressLevelFilter';

interface CybergearStepProps {
  speciesId: string;
  selections: CybergearSelection[];
  progressLevel: number;
  validation: CharacterValidationResult;
  onChange: (selections: CybergearSelection[]) => void;
}

export function CybergearStep({ speciesId, selections, progressLevel, validation, onChange }: CybergearStepProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedProgressLevels, setSelectedProgressLevels] = useState<number[] | null>(null);
  const definitions = getAllCybergear();
  const sourcePacks = getAllCharacterSourcePacks();
  const sourceOptions = getCharacterDefinitionSources(definitions, sourcePacks);
  const progressLevelFilter = selectedProgressLevels ?? [progressLevel];
  const availableProgressLevels = Array.from(new Set([
    ...definitions.map((definition) => definition.progressLevel),
    progressLevel,
  ])).sort((left, right) => left - right);
  const selectionById = new Map(selections.map((selection) => [selection.gearId, selection]));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visible = definitions.filter((definition) => (
    (progressLevelFilter.length === 0 || progressLevelFilter.includes(definition.progressLevel))
    && (sourceFilter === 'all' || getCharacterDefinitionSource(definition, sourcePacks).key === sourceFilter)
    && (!normalizedSearch || definition.name.toLocaleLowerCase().includes(normalizedSearch))
  ));

  const updateSelection = (selection: CybergearSelection) => {
    onChange([
      ...selections.filter((entry) => entry.gearId !== selection.gearId),
      selection,
    ]);
  };

  const toggleGear = (gearId: string, checked: boolean) => {
    if (!checked) {
      onChange(selections.filter((selection) => selection.gearId !== gearId));
      return;
    }
    const definition = definitions.find((entry) => entry.id === gearId)!;
    updateSelection({ gearId, quality: definition.qualities[0].quality, quantity: 1 });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Cybergear</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.cybergear.usedTolerance}/${validation.cybergear.cyberTolerance} tolerance`} color={validation.cybergear.remainingTolerance >= 0 ? 'success' : 'error'} variant="outlined" />
          <Chip label={`${validation.skills.availableSkillPoints} skill points available`} color="primary" variant="outlined" />
          <Chip
            label={`${validation.remainingSkillPoints} skill points remaining`}
            color={validation.remainingSkillPoints >= 0 ? 'success' : 'error'}
            variant="outlined"
          />
          <Tooltip title="A one-time deduction from the hero's normal skill-point pool when any installed cybergear requires training. Items marked No training cost are exempt.">
            <span tabIndex={0}>
              <Chip
                label={validation.cybergear.trainingSkillPointCost > 0
                  ? `Cybergear training: ${validation.cybergear.trainingSkillPointCost} skill points`
                  : 'No skill-point training cost'}
                variant="outlined"
              />
            </span>
          </Tooltip>
          <Chip label={`${validation.cybergear.equipmentCost} credits`} variant="outlined" />
          <Chip label={`${validation.cybergear.totalMass} kg`} variant="outlined" />
        </Stack>
      </Stack>
      {speciesId === 'mechalus' && (
        <Alert severity="info">
          Mechalus begin with an intrinsic Good nanocomputer, two neural data slots, and circuitry functioning as a reflex device. These species abilities do not need to be installed from the catalog.
        </Alert>
      )}
      {validation.cybergear.requiresAcceptanceCheck && <Alert severity="warning">This installation requires a cyber tolerance acceptance check.</Alert>}
      {validation.cybergear.errors.length > 0 && <Alert severity="error">{validation.cybergear.errors.join(' ')}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <TextField size="small" label="Search cybergear" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
        <EquipmentProgressLevelFilter
          id="cybergear-progress-level"
          availableLevels={availableProgressLevels}
          selectedLevels={progressLevelFilter}
          onChange={setSelectedProgressLevels}
        />
        <CharacterSourceFilter
          id="cybergear-source"
          value={sourceFilter}
          options={sourceOptions}
          onChange={setSourceFilter}
        />
      </Stack>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: 380 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 70 }}>Install</TableCell>
              <TableCell>Cybergear</TableCell>
              <TableCell sx={{ width: 90 }}>PL</TableCell>
              <TableCell sx={{ width: 150 }}>Quality</TableCell>
              <TableCell sx={{ width: 110 }}>Quantity</TableCell>
              <TableCell sx={{ width: 100 }}>Tolerance</TableCell>
              <TableCell sx={{ width: 120 }}>Cost</TableCell>
              <TableCell sx={{ width: 100 }}>Mass</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((definition) => {
              const selection = selectionById.get(definition.id);
              const quality = (
                selection
                  ? definition.qualities.find((entry) => entry.quality === selection.quality)
                  : undefined
              ) ?? definition.qualities[0]!;
              const quantity = selection?.quantity || 1;
              const unavailable = definition.progressLevel > progressLevel;
              return (
                <TableRow key={definition.id} selected={!!selection}>
                  <TableCell>
                    <Checkbox
                      checked={!!selection}
                      onChange={(event) => toggleGear(definition.id, event.target.checked)}
                      inputProps={{ 'aria-label': `Install ${definition.name}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{definition.name}</Typography>
                      {definition.requiresNanocomputer && <Chip label="Nanocomputer" size="small" variant="outlined" />}
                      {definition.freeSkillPointTraining && <Chip label="No training cost" size="small" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell><Chip label={`PL ${definition.progressLevel}`} size="small" color={unavailable ? 'error' : 'default'} variant="outlined" /></TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={selection?.quality || quality.quality}
                      disabled={!selection}
                      onChange={(event) => updateSelection({ ...selection!, quality: event.target.value as EquipmentQuality })}
                      inputProps={{ 'aria-label': `${definition.name} quality` }}
                      fullWidth
                    >
                      {definition.qualities.map((entry) => <MenuItem key={entry.quality} value={entry.quality}>{entry.quality}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={quantity}
                      disabled={!selection}
                      onChange={(event) => updateSelection({ ...selection!, quantity: Number(event.target.value) })}
                      inputProps={{ min: 1, 'aria-label': `${definition.name} quantity` }}
                    />
                  </TableCell>
                  <TableCell>{quality.size * quantity}</TableCell>
                  <TableCell>{quality.cost * quantity}</TableCell>
                  <TableCell>{(quality.mass || 0) * quantity}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}