import { useState } from 'react';
import {
  Alert, Checkbox, Chip, FormControl, InputLabel, MenuItem, Select, Stack,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Tabs, TextField, Typography,
} from '@mui/material';
import { getAllMutations } from '../services/characterDataService';
import type {
  MutationKind,
  MutationPlan,
  MutationSelection,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';

interface MutationsStepProps {
  speciesId: string;
  plan: MutationPlan;
  validation: CharacterValidationResult;
  onChange: (plan: MutationPlan) => void;
}

const ROWS_PER_PAGE = 20;

export function MutationsStep({ speciesId, plan, validation, onChange }: MutationsStepProps) {
  const [kind, setKind] = useState<MutationKind>('advantage');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const definitions = getAllMutations();
  const selectionById = new Map(plan.selections.map((selection) => [selection.mutationId, selection]));
  const selectedAdvantages = plan.selections
    .map((selection) => ({ selection, definition: definitions.find((entry) => entry.id === selection.mutationId) }))
    .filter(({ definition }) => definition?.kind === 'advantage' && definition.ability);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visible = definitions.filter((definition) => (
    definition.kind === kind
    && (!normalizedSearch || definition.name.toLocaleLowerCase().includes(normalizedSearch))
  ));
  const pageRows = visible.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const updateSelection = (selection: MutationSelection) => {
    onChange({
      ...plan,
      selections: [
        ...plan.selections.filter((entry) => entry.mutationId !== selection.mutationId),
        selection,
      ],
    });
  };

  const toggleMutation = (mutationId: string, checked: boolean) => {
    if (checked) updateSelection({ mutationId });
    else onChange({ ...plan, selections: plan.selections.filter((selection) => selection.mutationId !== mutationId) });
  };

  if (speciesId !== 'mutant-human') {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Mutations</Typography>
        <Alert severity="info">PHB mutation packages are available to Mutant Humans.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Mutation Package</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.mutations.spentAdvantagePoints}/${plan.advantagePointBudget} advantage points`} color={validation.mutations.spentAdvantagePoints === plan.advantagePointBudget ? 'success' : 'warning'} variant="outlined" />
          <Chip label={`${validation.mutations.spentDrawbackPoints}/${plan.drawbackPointBudget} drawback points`} color={validation.mutations.spentDrawbackPoints === plan.drawbackPointBudget ? 'success' : 'warning'} variant="outlined" />
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="mutation-origin-label">Origin</InputLabel>
          <Select labelId="mutation-origin-label" label="Origin" value={plan.origin} onChange={(event) => onChange({ ...plan, origin: event.target.value as MutationPlan['origin'] })}>
            <MenuItem value="engineered">Engineered</MenuItem>
            <MenuItem value="natural">Natural</MenuItem>
            <MenuItem value="directed">Directed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="mutation-scope-label">Scope</InputLabel>
          <Select labelId="mutation-scope-label" label="Scope" value={plan.scope} onChange={(event) => onChange({ ...plan, scope: event.target.value as MutationPlan['scope'] })}>
            <MenuItem value="individual">Individual</MenuItem>
            <MenuItem value="community">Community</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" type="number" label="Advantage Budget" value={plan.advantagePointBudget} onChange={(event) => onChange({ ...plan, advantagePointBudget: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1 } }} />
        <TextField size="small" type="number" label="Drawback Budget" value={plan.drawbackPointBudget} onChange={(event) => onChange({ ...plan, drawbackPointBudget: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1 } }} />
      </Stack>
      {validation.mutations.errors.length > 0 && <Alert severity="error">{validation.mutations.errors.join(' ')}</Alert>}
      <Stack direction="row" gap={1} flexWrap="wrap">
        {Object.entries(validation.mutations.effectiveAbilityScores).map(([ability, value]) => (
          <Chip key={ability} label={`${ability.toUpperCase()} ${value}`} size="small" variant="outlined" />
        ))}
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <Tabs value={kind} onChange={(_event, value: MutationKind) => { setKind(value); setPage(0); }} sx={{ minWidth: 300 }}>
          <Tab value="advantage" label="Advantages" />
          <Tab value="drawback" label="Drawbacks" />
        </Tabs>
        <TextField size="small" label="Search mutations" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} fullWidth />
      </Stack>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 430px)', minHeight: 340 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 70 }}>Select</TableCell>
              <TableCell>Mutation</TableCell>
              <TableCell sx={{ width: 100 }}>Tier</TableCell>
              <TableCell sx={{ width: 80 }}>Cost</TableCell>
              <TableCell sx={{ width: 260 }}>Details / Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((definition) => {
              const selection = selectionById.get(definition.id);
              return (
                <TableRow key={definition.id} selected={!!selection}>
                  <TableCell>
                    <Checkbox
                      checked={!!selection}
                      onChange={(event) => toggleMutation(definition.id, event.target.checked)}
                      inputProps={{ 'aria-label': `Select ${definition.name}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{definition.name}</Typography>
                    {definition.ability && <Typography variant="caption" color="text.secondary">{definition.ability.toUpperCase()}</Typography>}
                  </TableCell>
                  <TableCell>{definition.tier}</TableCell>
                  <TableCell>{definition.cost}</TableCell>
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
                    {selection && definition.requiresLinkedMutation && (
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`${definition.id}-link-label`}>Linked Advantage</InputLabel>
                        <Select
                          labelId={`${definition.id}-link-label`}
                          label="Linked Advantage"
                          value={selection.linkedMutationId || ''}
                          onChange={(event) => updateSelection({ ...selection, linkedMutationId: event.target.value })}
                          inputProps={{ 'aria-label': `${definition.name} linked advantage` }}
                        >
                          {selectedAdvantages.map(({ definition: selectedDefinition }) => (
                            <MenuItem key={selectedDefinition!.id} value={selectedDefinition!.id}>{selectedDefinition!.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
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