import { useState } from 'react';
import {
  Alert, Checkbox, Chip, FormControlLabel, MenuItem, Select, Stack,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Typography,
} from '@mui/material';
import { getAllCharacterOptions, getAllCharacterSourcePacks } from '../services/characterDataService';
import {
  getCharacterDefinitionSource,
  getCharacterDefinitionSources,
} from '../services/characterDefinitionSourceService';
import type {
  AbilityId,
  CharacterOptionKind,
  CharacterOptionSelection,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { CharacterSourceFilter } from './CharacterSourceFilter';

interface CharacterOptionsStepProps {
  selections: CharacterOptionSelection[];
  validation: CharacterValidationResult;
  onChange: (selections: CharacterOptionSelection[]) => void;
}

const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wil', 'per'];

export function CharacterOptionsStep({ selections, validation, onChange }: CharacterOptionsStepProps) {
  const [kind, setKind] = useState<CharacterOptionKind>('perk');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const definitions = getAllCharacterOptions();
  const sourcePacks = getAllCharacterSourcePacks();
  const sourceOptions = getCharacterDefinitionSources(definitions, sourcePacks);
  const selectionById = new Map(selections.map((selection) => [selection.optionId, selection]));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visible = definitions.filter((definition) => (
    definition.kind === kind
    && (sourceFilter === 'all' || getCharacterDefinitionSource(definition, sourcePacks).key === sourceFilter)
    && (!normalizedSearch || definition.name.toLocaleLowerCase().includes(normalizedSearch))
  ));

  const updateSelection = (selection: CharacterOptionSelection) => {
    onChange([
      ...selections.filter((entry) => entry.optionId !== selection.optionId),
      selection,
    ]);
  };

  const toggleOption = (optionId: string, checked: boolean) => {
    if (!checked) {
      onChange(selections.filter((selection) => selection.optionId !== optionId));
      return;
    }
    const definition = definitions.find((entry) => entry.id === optionId)!;
    updateSelection({
      optionId,
      ...(definition.values.length > 0 ? { value: definition.values[0] } : {}),
      ...(definition.choices ? { choiceIds: [] } : {}),
    });
  };

  const toggleChoice = (selection: CharacterOptionSelection, choiceId: string, checked: boolean) => {
    const current = selection.choiceIds || [];
    updateSelection({
      ...selection,
      choiceIds: checked ? [...current, choiceId] : current.filter((id) => id !== choiceId),
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Perks & Flaws</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.options.perkCount}/3 perks`} variant="outlined" />
          <Chip label={`${validation.options.flawCount}/3 flaws`} variant="outlined" />
          <Chip
            label={`${validation.options.skillPointAdjustment >= 0 ? '+' : ''}${validation.options.skillPointAdjustment} skill points`}
            color={validation.options.skillPointAdjustment >= 0 ? 'success' : 'warning'}
            variant="outlined"
          />
        </Stack>
      </Stack>
      {validation.options.errors.length > 0 && <Alert severity="error">{validation.options.errors.join(' ')}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <Tabs value={kind} onChange={(_event, value: CharacterOptionKind) => setKind(value)} sx={{ minWidth: 240 }}>
          <Tab value="perk" label="Perks" />
          <Tab value="flaw" label="Flaws" />
        </Tabs>
        <TextField size="small" label="Search options" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
        <CharacterSourceFilter
          id="character-options-source"
          value={sourceFilter}
          options={sourceOptions}
          onChange={setSourceFilter}
        />
      </Stack>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: 380 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 70 }}>Select</TableCell>
              <TableCell>Option</TableCell>
              <TableCell sx={{ width: 140 }}>Value</TableCell>
              <TableCell sx={{ width: 230 }}>Choice</TableCell>
              <TableCell sx={{ width: 260 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((definition) => {
              const selection = selectionById.get(definition.id);
              return (
                <TableRow key={definition.id} selected={!!selection}>
                  <TableCell>
                    <Checkbox
                      checked={!!selection}
                      onChange={(event) => toggleOption(definition.id, event.target.checked)}
                      inputProps={{ 'aria-label': `Select ${definition.name}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{definition.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {definition.ability ? definition.ability.toUpperCase() : 'General'}
                        {definition.activation ? ` | ${definition.activation}` : ''}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {selection && definition.values.length > 1 ? (
                      <Select
                        size="small"
                        value={selection.value ?? definition.values[0]}
                        onChange={(event) => updateSelection({ ...selection, value: Number(event.target.value) })}
                        inputProps={{ 'aria-label': `${definition.name} value` }}
                        fullWidth
                      >
                        {definition.values.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </Select>
                    ) : definition.values.length === 1 ? definition.values[0] : '-'}
                  </TableCell>
                  <TableCell>
                    {selection && definition.choices && (
                      <Stack>
                        {definition.choices.map((choice) => (
                          <FormControlLabel
                            key={choice.id}
                            control={(
                              <Checkbox
                                size="small"
                                checked={(selection.choiceIds || []).includes(choice.id)}
                                onChange={(event) => toggleChoice(selection, choice.id, event.target.checked)}
                              />
                            )}
                            label={`${choice.name} (${choice.value})`}
                          />
                        ))}
                      </Stack>
                    )}
                    {selection && definition.requiresTargetAbility && (
                      <Select
                        size="small"
                        value={selection.targetAbility || ''}
                        onChange={(event) => updateSelection({ ...selection, targetAbility: event.target.value as AbilityId })}
                        displayEmpty
                        inputProps={{ 'aria-label': `${definition.name} ability` }}
                        fullWidth
                      >
                        <MenuItem value="" disabled>Ability</MenuItem>
                        {ABILITIES.map((ability) => <MenuItem key={ability} value={ability}>{ability.toUpperCase()}</MenuItem>)}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {selection && definition.requiresNotes && (
                      <TextField
                        size="small"
                        value={selection.notes || ''}
                        onChange={(event) => updateSelection({ ...selection, notes: event.target.value })}
                        inputProps={{ 'aria-label': `${definition.name} details` }}
                        fullWidth
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}