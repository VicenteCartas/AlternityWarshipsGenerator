import { useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  headerCellSx,
  scrollableTableContainerSx,
  selectableRowSx,
  stickyFirstColumnCellSx,
  stickyFirstColumnHeaderSx,
} from '@shared/constants/tableStyles';
import {
  getAllCharacterSourcePacks,
  getAllSpecies,
  getPsionicSkillById,
  getSkillById,
} from '../services/characterDataService';
import { evaluateSpeciesBenefits } from '../services/speciesAbilityService';
import type {
  AbilityId,
  SpeciesBenefitResult,
  SpeciesDefinition,
} from '../types/character';
import type { CharacterSourcePackDefinition } from '../types/sourcePack';

interface SpeciesStepProps {
  selectedSpeciesId: string;
  onSelect: (speciesId: string) => void;
  speciesDefinitions?: SpeciesDefinition[];
  sourcePackDefinitions?: CharacterSourcePackDefinition[];
  selectedSpeciesBenefits?: SpeciesBenefitResult;
}

interface SpeciesSource {
  key: string;
  label: string;
  kind: 'Book' | 'Mod';
}

const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wil', 'per'];
const ROWS_PER_PAGE = 20;

type SpeciesSortField = 'name' | 'source' | AbilityId;
type SortDirection = 'asc' | 'desc';

function formatEffectId(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSpeciesSource(
  species: SpeciesDefinition,
  sourcePacks: CharacterSourcePackDefinition[],
): SpeciesSource {
  if (species._source && species._source !== 'base') {
    return { key: `mod:${species._source}`, label: species._source, kind: 'Mod' };
  }
  const sourcePack = sourcePacks.find((pack) => pack.id === species.sourcePackId);
  return {
    key: `book:${species.sourcePackId}`,
    label: sourcePack?.name || species.sourcePackId,
    kind: 'Book',
  };
}

export function SpeciesStep({
  selectedSpeciesId,
  onSelect,
  speciesDefinitions,
  sourcePackDefinitions,
  selectedSpeciesBenefits,
}: SpeciesStepProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortField, setSortField] = useState<SpeciesSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const species = speciesDefinitions || getAllSpecies();
  const sourcePacks = sourcePackDefinitions || getAllCharacterSourcePacks();
  const selectedSpecies = species.find((entry) => entry.id === selectedSpeciesId) || species[0];
  const normalizedSearch = search.trim().toLocaleLowerCase();

  const sources = new Map<string, SpeciesSource>();
  for (const entry of species) {
    const source = getSpeciesSource(entry, sourcePacks);
    sources.set(source.key, source);
  }
  const sourceOptions = Array.from(sources.values()).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'Book' ? -1 : 1;
    return left.label.localeCompare(right.label);
  });

  const filteredSpecies = species
    .filter((entry) => {
      const source = getSpeciesSource(entry, sourcePacks);
      if (sourceFilter !== 'all' && source.key !== sourceFilter) return false;
      if (!normalizedSearch) return true;
      const skillNames = entry.freeBroadSkillIds.map((id) => (
        getSkillById(id)?.name || getPsionicSkillById(id)?.name || id
      ));
      return [entry.name, source.label, ...skillNames]
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => {
      let comparison = 0;
      if (sortField === 'name') comparison = left.name.localeCompare(right.name);
      else if (sortField === 'source') {
        comparison = getSpeciesSource(left, sourcePacks).label.localeCompare(
          getSpeciesSource(right, sourcePacks).label,
        );
      } else {
        comparison = left.abilityLimits[sortField].min - right.abilityLimits[sortField].min
          || left.abilityLimits[sortField].max - right.abilityLimits[sortField].max;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  const pageSpecies = filteredSpecies.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const changeSort = (field: SpeciesSortField) => {
    setSortDirection((current) => sortField === field && current === 'asc' ? 'desc' : 'asc');
    setSortField(field);
    setPage(0);
  };

  if (!selectedSpecies) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Species</Typography>
        <Typography color="text.secondary">No species are available from the selected sources.</Typography>
      </Stack>
    );
  }

  const selectedSource = getSpeciesSource(selectedSpecies, sourcePacks);
  const benefits = selectedSpeciesBenefits || evaluateSpeciesBenefits(selectedSpecies, [], []);
  const freeSkills = selectedSpecies.freeBroadSkillIds.map((id) => (
    getSkillById(id)?.name || getPsionicSkillById(id)?.name || id
  ));
  const ruleSummaries = benefits.summaries.length > 0
    ? benefits.summaries
    : selectedSpecies.specialAbilityIds.map(formatEffectId);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">Species</Typography>
        <Typography variant="body2" color="text.secondary">
          {species.length} available from {sourceOptions.length} source{sourceOptions.length === 1 ? '' : 's'}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
            <Box>
              <Typography variant="h6">{selectedSpecies.name}</Typography>
              {selectedSpecies.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {selectedSpecies.description}
                </Typography>
              )}
            </Box>
            <Stack direction="row" gap={1} alignItems="flex-start" flexWrap="wrap">
              <Chip label={selectedSource.label} size="small" variant="outlined" />
              {selectedSource.kind === 'Mod' && <Chip label="Mod" size="small" color="secondary" variant="outlined" />}
            </Stack>
          </Stack>

          <Stack direction="row" gap={1} flexWrap="wrap">
            {ABILITIES.map((ability) => (
              <Chip
                key={ability}
                size="small"
                variant="outlined"
                label={`${ability.toUpperCase()} ${selectedSpecies.abilityLimits[ability].min}-${selectedSpecies.abilityLimits[ability].max}`}
              />
            ))}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Free broad skills</Typography>
              <Typography variant="body2" color="text.secondary">{freeSkills.join(', ')}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Species rules</Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {ruleSummaries.map((summary) => (
                  <Typography component="li" variant="body2" color="text.secondary" key={summary}>
                    {summary}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField
          size="small"
          label="Search species"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear species search" onClick={() => { setSearch(''); setPage(0); }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: { sm: 240 } }}>
          <InputLabel id="species-source-label">Source</InputLabel>
          <Select
            labelId="species-source-label"
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
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={scrollableTableContainerSx}>
        <Table size="small" stickyHeader aria-label="Species comparison">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, ...stickyFirstColumnHeaderSx, minWidth: 180 }}>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => changeSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerCellSx, minWidth: 180 }}>
                <TableSortLabel
                  active={sortField === 'source'}
                  direction={sortField === 'source' ? sortDirection : 'asc'}
                  onClick={() => changeSort('source')}
                >
                  Source
                </TableSortLabel>
              </TableCell>
              {ABILITIES.map((ability) => (
                <TableCell key={ability} align="center" sx={{ ...headerCellSx, minWidth: 76 }}>
                  <TableSortLabel
                    active={sortField === ability}
                    direction={sortField === ability ? sortDirection : 'asc'}
                    onClick={() => changeSort(ability)}
                  >
                    {ability.toUpperCase()}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ ...headerCellSx, minWidth: 130 }}>Requirements</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageSpecies.map((entry) => {
              const source = getSpeciesSource(entry, sourcePacks);
              const selected = entry.id === selectedSpeciesId;
              return (
                <TableRow
                  key={entry.id}
                  hover
                  selected={selected}
                  aria-selected={selected}
                  onClick={() => onSelect(entry.id)}
                  aria-label={`Select ${entry.name}`}
                  sx={selectableRowSx}
                >
                  <TableCell sx={stickyFirstColumnCellSx}>
                    <Typography variant="body2" fontWeight={selected ? 700 : 400}>{entry.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" noWrap>{source.label}</Typography>
                      {source.kind === 'Mod' && <Chip label="Mod" size="small" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  {ABILITIES.map((ability) => (
                    <TableCell key={ability} align="center">
                      {entry.abilityLimits[ability].min}-{entry.abilityLimits[ability].max}
                    </TableCell>
                  ))}
                  <TableCell>{entry.requiresMutations ? 'Mutations' : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredSpecies.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No species match the current filters.
        </Typography>
      ) : (
        <TablePagination
          component="div"
          count={filteredSpecies.length}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
        />
      )}
    </Stack>
  );
}