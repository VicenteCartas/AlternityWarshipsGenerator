import { useState } from 'react';
import {
  Alert, Button, Checkbox, Chip, FormControl, InputLabel, MenuItem, Select,
  Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Tabs, TextField, Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { scrollableTableContainerSx } from '@shared/constants/tableStyles';
import {
  getAllCharacterSourcePacks,
  getAllEquipment,
  getEquipmentById,
} from '../services/characterDataService';
import {
  getCharacterDefinitionSource,
  getCharacterDefinitionSources,
} from '../services/characterDefinitionSourceService';
import { getEquipmentActiveMemory } from '../services/equipmentService';
import type {
  EquipmentCategory,
  EquipmentSelection,
  FundsDegree,
  ItemQuality,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';

interface EquipmentStepProps {
  selections: EquipmentSelection[];
  dieRolls: number[];
  wealthDegree?: FundsDegree;
  progressLevel: number;
  validation: CharacterValidationResult;
  onSelectionsChange: (selections: EquipmentSelection[]) => void;
  onDieRollsChange: (dieRolls: number[]) => void;
  onWealthDegreeChange: (wealthDegree?: FundsDegree) => void;
}

type EquipmentTab = 'all' | EquipmentCategory;
const ROWS_PER_PAGE = 20;

export function EquipmentStep({
  selections,
  dieRolls,
  wealthDegree,
  progressLevel,
  validation,
  onSelectionsChange,
  onDieRollsChange,
  onWealthDegreeChange,
}: EquipmentStepProps) {
  const [category, setCategory] = useState<EquipmentTab>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const definitions = getAllEquipment();
  const sourcePacks = getAllCharacterSourcePacks();
  const sourceOptions = getCharacterDefinitionSources(definitions, sourcePacks);
  const selectionById = new Map(selections.map((selection) => [selection.equipmentId, selection]));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visible = definitions.filter((definition) => (
    (category === 'all' || definition.category === category)
    && (sourceFilter === 'all' || getCharacterDefinitionSource(definition, sourcePacks).key === sourceFilter)
    && (!normalizedSearch || [definition.name, getCharacterDefinitionSource(definition, sourcePacks).label]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)))
  ));
  const pageRows = visible.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const wealthOptionId = validation.options.wealthOptionId;
  const fundsReady = validation.startingFunds.valid;

  const updateSelection = (selection: EquipmentSelection) => {
    onSelectionsChange([
      ...selections.filter((entry) => entry.equipmentId !== selection.equipmentId),
      selection,
    ]);
  };

  const toggleEquipment = (equipmentId: string, checked: boolean) => {
    if (!checked) {
      onSelectionsChange(selections.filter((selection) => selection.equipmentId !== equipmentId));
      return;
    }
    const definition = getEquipmentById(equipmentId)!;
    const quality = definition.qualityCosts
      ? Object.keys(definition.qualityCosts)[0] as ItemQuality
      : undefined;
    updateSelection({
      equipmentId,
      quantity: 1,
      ...(quality ? { quality } : {}),
      ...(definition.costMode !== 'fixed' ? { unitCostOverride: definition.cost || 0 } : {}),
    });
  };

  const updateDie = (index: number, value: number) => {
    const next = Array.from({ length: 5 }, (_entry, dieIndex) => dieRolls[dieIndex] || 0);
    next[index] = value;
    onDieRollsChange(next);
  };

  const rollFunds = () => {
    const dieSize = validation.startingFunds.dieSize;
    if (dieSize < 1) return;
    onDieRollsChange(Array.from({ length: 5 }, () => Math.floor(Math.random() * dieSize) + 1));
  };

  const errors = [...validation.startingFunds.errors, ...validation.equipment.errors];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Equipment</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip
            label={fundsReady ? `${validation.startingFunds.totalFunds} starting credits` : 'Starting credits not rolled'}
            color={fundsReady ? 'primary' : 'default'}
            variant="outlined"
          />
          <Chip label={`${validation.equipment.totalCost + validation.cybergear.equipmentCost} credits spent`} variant="outlined" />
          <Chip
            label={fundsReady ? `${validation.remainingFunds} credits remaining` : 'Roll credits before purchasing'}
            color={fundsReady ? (validation.remainingFunds >= 0 ? 'success' : 'error') : 'default'}
            variant="outlined"
          />
          <Chip label={`${validation.equipment.totalMass + validation.cybergear.totalMass} kg`} variant="outlined" />
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }}>
        {Array.from({ length: 5 }, (_entry, index) => (
          <TextField
            key={index}
            size="small"
            type="number"
            label={`Funds Die ${index + 1}`}
            value={dieRolls[index] || ''}
            onChange={(event) => updateDie(index, Number(event.target.value))}
            slotProps={{ htmlInput: { min: 1, max: Math.max(1, validation.startingFunds.dieSize) } }}
            sx={{ width: 120 }}
          />
        ))}
        <Button startIcon={<CasinoIcon />} onClick={rollFunds} disabled={validation.startingFunds.dieSize < 1}>Roll 5d{validation.startingFunds.dieSize || '?'}</Button>
        {wealthOptionId && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="wealth-degree-label">{wealthOptionId === 'filthy-rich' ? 'Filthy Rich' : 'Dirt Poor'} Check</InputLabel>
            <Select
              labelId="wealth-degree-label"
              label={`${wealthOptionId === 'filthy-rich' ? 'Filthy Rich' : 'Dirt Poor'} Check`}
              value={wealthDegree || ''}
              onChange={(event) => onWealthDegreeChange(event.target.value as FundsDegree)}
            >
              {(['marginal', 'ordinary', 'good', 'amazing'] as FundsDegree[]).map((degree) => <MenuItem key={degree} value={degree}>{degree}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>
      {!fundsReady && (
        <Alert severity="info">
          Roll all five starting-funds dice and complete any wealth check before buying equipment, weapons, or armor.
        </Alert>
      )}
      {errors.length > 0 && <Alert severity="error">{errors.join(' ')}</Alert>}
      <Stack direction={{ xs: 'column', lg: 'row' }} gap={2}>
        <Tabs
          value={category}
          onChange={(_event, value: EquipmentTab) => { setCategory(value); setPage(0); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Tab value="all" label="All" />
          <Tab value="sensor" label="Sensors" />
          <Tab value="miscellaneous" label="Misc" />
          <Tab value="survival" label="Survival" />
          <Tab value="service" label="Services" />
          <Tab value="computer" label="Computers" />
        </Tabs>
        <FormControl size="small" sx={{ width: { xs: '100%', lg: 220 }, flexShrink: 0 }}>
          <InputLabel id="equipment-source-label">Source</InputLabel>
          <Select
            labelId="equipment-source-label"
            label="Source"
            value={sourceFilter}
            onChange={(event) => { setSourceFilter(event.target.value); setPage(0); }}
          >
            <MenuItem value="all">All sources</MenuItem>
            {sourceOptions.map((source) => (
              <MenuItem key={source.key} value={source.key}>
                {source.label}{source.kind === 'Mod' ? ' (Mod)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Search equipment"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}
        />
      </Stack>
      <TableContainer sx={scrollableTableContainerSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 70 }}>Buy</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell sx={{ width: 80 }}>PL</TableCell>
              <TableCell sx={{ width: 140 }}>Quality</TableCell>
              <TableCell sx={{ width: 110 }}>Quantity</TableCell>
              <TableCell sx={{ width: 130 }}>Unit Cost</TableCell>
              <TableCell sx={{ width: 100 }}>Memory</TableCell>
              <TableCell sx={{ width: 90 }}>Granted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((definition) => {
              const selection = selectionById.get(definition.id);
              const unavailable = definition.progressLevel > progressLevel;
              const qualityKeys = Object.keys(definition.qualityCosts || {}) as ItemQuality[];
              return (
                <TableRow key={definition.id} selected={!!selection}>
                  <TableCell>
                    <Checkbox
                      checked={!!selection}
                      disabled={!fundsReady && !selection}
                      onChange={(event) => toggleEquipment(definition.id, event.target.checked)}
                      inputProps={{ 'aria-label': `Buy ${definition.name}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{definition.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{definition.category}</Typography>
                  </TableCell>
                  <TableCell><Chip label={`PL ${definition.progressLevel}`} size="small" color={unavailable ? 'error' : 'default'} variant="outlined" /></TableCell>
                  <TableCell>
                    {qualityKeys.length > 0 ? (
                      <Select
                        size="small"
                        value={selection?.quality || qualityKeys[0]}
                        disabled={!selection}
                        onChange={(event) => updateSelection({ ...selection!, quality: event.target.value as ItemQuality })}
                        inputProps={{ 'aria-label': `${definition.name} quality` }}
                        fullWidth
                      >
                        {qualityKeys.map((quality) => <MenuItem key={quality} value={quality}>{quality}</MenuItem>)}
                      </Select>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={selection?.quantity || 1}
                      disabled={!selection}
                      onChange={(event) => updateSelection({ ...selection!, quantity: Number(event.target.value) })}
                      inputProps={{ min: 1, 'aria-label': `${definition.name} quantity` }}
                    />
                  </TableCell>
                  <TableCell>
                    {definition.costMode === 'fixed' && definition.cost !== null ? definition.cost : (
                      <TextField
                        size="small"
                        type="number"
                        value={selection?.unitCostOverride ?? definition.cost ?? 0}
                        disabled={!selection}
                        onChange={(event) => updateSelection({ ...selection!, unitCostOverride: Number(event.target.value) })}
                        inputProps={{ min: 0, 'aria-label': `${definition.name} unit cost` }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{getEquipmentActiveMemory(definition, selection?.quality) ?? '-'}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={selection?.granted || false}
                      disabled={!selection}
                      onChange={(event) => updateSelection({ ...selection!, granted: event.target.checked })}
                      inputProps={{ 'aria-label': `${definition.name} granted` }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={visible.length}
        page={page}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
      />
    </Stack>
  );
}