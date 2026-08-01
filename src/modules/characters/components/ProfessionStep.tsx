import { useState } from 'react';
import {
  Alert,
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
  truncatedDescriptionSx,
} from '@shared/constants/tableStyles';
import {
  getAllCharacterSourcePacks,
  getAllProfessions,
  getAllSkills,
} from '../services/characterDataService';
import type {
  AbilityScores,
  ProfessionDefinition,
  PsionicPurchasePlan,
  ResistanceAbilityId,
  SkillPurchasePlan,
} from '../types/character';
import type { CharacterSourcePackDefinition } from '../types/sourcePack';
import type { ProfessionBenefitChoices } from '../types/characterState';

interface ProfessionStepProps {
  selectedProfessionId: string | null;
  abilityScores: AbilityScores;
  benefits: ProfessionBenefitChoices;
  resistanceBonusAbility?: ResistanceAbilityId;
  skillPlan: SkillPurchasePlan;
  psionicPlan: PsionicPurchasePlan;
  errors: string[];
  onSelect: (professionId: string) => void;
  onBenefitsChange: (benefits: ProfessionBenefitChoices) => void;
  onResistanceBonusChange: (ability?: ResistanceAbilityId) => void;
  onSkillPlanChange: (plan: SkillPurchasePlan) => void;
  onPsionicPlanChange: (plan: PsionicPurchasePlan) => void;
  professionDefinitions?: ProfessionDefinition[];
  sourcePackDefinitions?: CharacterSourcePackDefinition[];
}

interface ProfessionSource {
  key: string;
  label: string;
  kind: 'Book' | 'Mod';
}

type ProfessionSortField = 'name' | 'source' | 'actionCheck';
type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 20;
const RESISTANCE_ABILITIES: ResistanceAbilityId[] = ['str', 'dex', 'con', 'int', 'wil'];

function formatEffectId(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getProfessionSource(
  profession: ProfessionDefinition,
  sourcePacks: CharacterSourcePackDefinition[],
): ProfessionSource {
  if (profession._source && profession._source !== 'base') {
    return { key: `mod:${profession._source}`, label: profession._source, kind: 'Mod' };
  }
  const sourcePack = sourcePacks.find((pack) => pack.id === profession.sourcePackId);
  return {
    key: `book:${profession.sourcePackId}`,
    label: sourcePack?.name || profession.sourcePackId,
    kind: 'Book',
  };
}

function getRequirementText(profession: ProfessionDefinition): string {
  const entries = Object.entries(profession.requirements);
  return entries.length > 0
    ? entries.map(([ability, minimum]) => `${ability.toUpperCase()} ${minimum}`).join(', ')
    : 'None';
}

function requirementsMet(profession: ProfessionDefinition, scores: AbilityScores): boolean {
  return Object.entries(profession.requirements)
    .every(([ability, minimum]) => scores[ability as keyof AbilityScores] >= minimum);
}

function getBenefitSummaries(profession: ProfessionDefinition): string[] {
  switch (profession.id) {
    case 'combat-spec':
      return ['Choose one combat specialty skill for a -1 step situation bonus.'];
    case 'diplomat':
      return ['Choose Contacts or Resources and one secondary profession for skill pricing.'];
    case 'free-agent':
      return ['Add +1 to one resistance modifier and increase maximum Last Resort points by 1.'];
    case 'tech-op':
      return ['Improves the cost of learning and advancing technical skills.'];
    case 'mindwalker':
      return ['Gain psionic energy and choose one favored psionic discipline.'];
    default:
      return profession.benefitEffectIds.map(formatEffectId);
  }
}

export function ProfessionStep({
  selectedProfessionId,
  abilityScores,
  benefits,
  resistanceBonusAbility,
  skillPlan,
  psionicPlan,
  errors,
  onSelect,
  onBenefitsChange,
  onResistanceBonusChange,
  onSkillPlanChange,
  onPsionicPlanChange,
  professionDefinitions,
  sourcePackDefinitions,
}: ProfessionStepProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortField, setSortField] = useState<ProfessionSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const professions = professionDefinitions || getAllProfessions();
  const sourcePacks = sourcePackDefinitions || getAllCharacterSourcePacks();
  const selectedProfession = professions.find((entry) => entry.id === selectedProfessionId);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const combatSpecialties = getAllSkills().filter((skill) => (
    skill.kind === 'specialty'
    && skill.parentSkillId
    && [
      'armor-operation', 'unarmed-attack', 'heavy-weapons',
      'modern-ranged-weapons', 'melee-weapons', 'primitive-ranged-weapons',
    ].includes(skill.parentSkillId)
  ));

  const sources = new Map<string, ProfessionSource>();
  for (const profession of professions) {
    const source = getProfessionSource(profession, sourcePacks);
    sources.set(source.key, source);
  }
  const sourceOptions = Array.from(sources.values()).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'Book' ? -1 : 1;
    return left.label.localeCompare(right.label);
  });

  const filteredProfessions = professions
    .filter((profession) => {
      const source = getProfessionSource(profession, sourcePacks);
      if (sourceFilter !== 'all' && source.key !== sourceFilter) return false;
      if (!normalizedSearch) return true;
      return [
        profession.name,
        source.label,
        getRequirementText(profession),
        ...getBenefitSummaries(profession),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => {
      let comparison = 0;
      if (sortField === 'name') comparison = left.name.localeCompare(right.name);
      else if (sortField === 'source') {
        comparison = getProfessionSource(left, sourcePacks).label.localeCompare(
          getProfessionSource(right, sourcePacks).label,
        );
      } else comparison = left.actionCheckBonus - right.actionCheckBonus;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  const pageProfessions = filteredProfessions.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE,
  );

  const selectSecondaryProfession = (professionId: string) => {
    onSkillPlanChange({ ...skillPlan, additionalDiscountProfessionIds: [professionId] });
    if (professionId === 'mindwalker') {
      onPsionicPlanChange({
        accessPath: 'diplomat-mindwalker',
        purchasedBroadSkillIds: [],
        specialtySkills: [],
      });
    } else if (psionicPlan.accessPath === 'diplomat-mindwalker') {
      onPsionicPlanChange({ accessPath: 'none', purchasedBroadSkillIds: [], specialtySkills: [] });
    }
  };

  const changeSort = (field: ProfessionSortField) => {
    setSortDirection((current) => sortField === field && current === 'asc' ? 'desc' : 'asc');
    setSortField(field);
    setPage(0);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">Profession</Typography>
        <Typography variant="body2" color="text.secondary">
          {professions.length} available from {sourceOptions.length} source{sourceOptions.length === 1 ? '' : 's'}
        </Typography>
      </Box>

      {errors.length > 0 && <Alert severity="error">{errors.join(' ')}</Alert>}

      {selectedProfession ? (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
              <Box>
                <Typography variant="h6">{selectedProfession.name}</Typography>
                {selectedProfession.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedProfession.description}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" gap={1} alignItems="flex-start" flexWrap="wrap">
                <Chip
                  label={getProfessionSource(selectedProfession, sourcePacks).label}
                  size="small"
                  variant="outlined"
                />
                {getProfessionSource(selectedProfession, sourcePacks).kind === 'Mod' && (
                  <Chip label="Mod" size="small" color="secondary" variant="outlined" />
                )}
                {selectedProfession.optional && <Chip label="Optional rule" size="small" variant="outlined" />}
                <Chip
                  label={requirementsMet(selectedProfession, abilityScores) ? 'Requirements met' : 'Requirements not met'}
                  color={requirementsMet(selectedProfession, abilityScores) ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>

            <Stack direction="row" gap={1} flexWrap="wrap">
              {Object.entries(selectedProfession.requirements).map(([ability, minimum]) => (
                <Chip
                  key={ability}
                  label={`${ability.toUpperCase()} ${minimum}`}
                  size="small"
                  color={abilityScores[ability as keyof AbilityScores] >= minimum ? 'success' : 'error'}
                  variant="outlined"
                />
              ))}
              <Chip
                label={`Action Check +${selectedProfession.actionCheckBonus}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Starting benefits</Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {getBenefitSummaries(selectedProfession).map((summary) => (
                  <Typography component="li" variant="body2" color="text.secondary" key={summary}>
                    {summary}
                  </Typography>
                ))}
              </Stack>
            </Box>

            {selectedProfessionId === 'combat-spec' && (
              <FormControl size="small" sx={{ maxWidth: 480 }}>
                <InputLabel id="combat-specialty-label">Favored Combat Specialty</InputLabel>
                <Select
                  labelId="combat-specialty-label"
                  label="Favored Combat Specialty"
                  value={benefits.combatSpecSpecialtySkillId || ''}
                  onChange={(event) => onBenefitsChange({
                    ...benefits,
                    combatSpecSpecialtySkillId: event.target.value,
                  })}
                >
                  {combatSpecialties.map((skill) => (
                    <MenuItem key={skill.id} value={skill.id}>{skill.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedProfessionId === 'diplomat' && (
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel id="diplomat-benefit-label">Starting Benefit</InputLabel>
                  <Select
                    labelId="diplomat-benefit-label"
                    label="Starting Benefit"
                    value={benefits.diplomatBenefit || ''}
                    onChange={(event) => onBenefitsChange({
                      ...benefits,
                      diplomatBenefit: event.target.value as 'contacts' | 'resources',
                    })}
                  >
                    <MenuItem value="contacts">Contacts</MenuItem>
                    <MenuItem value="resources">Resources</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel id="secondary-profession-label">Secondary Profession</InputLabel>
                  <Select
                    labelId="secondary-profession-label"
                    label="Secondary Profession"
                    value={skillPlan.additionalDiscountProfessionIds[0] || ''}
                    onChange={(event) => selectSecondaryProfession(event.target.value)}
                  >
                    {professions
                      .filter((profession) => profession.id !== 'diplomat')
                      .map((profession) => (
                        <MenuItem key={profession.id} value={profession.id}>{profession.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {selectedProfessionId === 'free-agent' && (
              <FormControl size="small" sx={{ maxWidth: 360 }}>
                <InputLabel id="resistance-bonus-label">Resistance Bonus</InputLabel>
                <Select
                  labelId="resistance-bonus-label"
                  label="Resistance Bonus"
                  value={resistanceBonusAbility || ''}
                  onChange={(event) => onResistanceBonusChange(
                    event.target.value as ResistanceAbilityId,
                  )}
                >
                  {RESISTANCE_ABILITIES.map((ability) => (
                    <MenuItem key={ability} value={ability}>{ability.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography color="text.secondary">Select a profession from the table to configure its starting benefits.</Typography>
        </Paper>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField
          size="small"
          label="Search professions"
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
                  <IconButton
                    size="small"
                    aria-label="Clear profession search"
                    onClick={() => { setSearch(''); setPage(0); }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: { sm: 240 } }}>
          <InputLabel id="profession-source-label">Source</InputLabel>
          <Select
            labelId="profession-source-label"
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
        <Table size="small" stickyHeader aria-label="Profession comparison">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, ...stickyFirstColumnHeaderSx, minWidth: 190 }}>
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
              <TableCell sx={{ ...headerCellSx, minWidth: 180 }}>Requirements</TableCell>
              <TableCell align="center" sx={{ ...headerCellSx, minWidth: 130 }}>
                <TableSortLabel
                  active={sortField === 'actionCheck'}
                  direction={sortField === 'actionCheck' ? sortDirection : 'asc'}
                  onClick={() => changeSort('actionCheck')}
                >
                  Action Check
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerCellSx, minWidth: 300 }}>Starting Benefits</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageProfessions.map((profession) => {
              const source = getProfessionSource(profession, sourcePacks);
              const selected = profession.id === selectedProfessionId;
              const eligible = requirementsMet(profession, abilityScores);
              return (
                <TableRow
                  key={profession.id}
                  hover
                  selected={selected}
                  aria-selected={selected}
                  onClick={() => onSelect(profession.id)}
                  aria-label={`Select ${profession.name}`}
                  sx={selectableRowSx}
                >
                  <TableCell sx={stickyFirstColumnCellSx}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={selected ? 700 : 400}>
                        {profession.name}
                      </Typography>
                      {profession.optional && <Chip label="Optional" size="small" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" noWrap>{source.label}</Typography>
                      {source.kind === 'Mod' && <Chip label="Mod" size="small" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={eligible ? 'text.primary' : 'error.main'}>
                      {getRequirementText(profession)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">+{profession.actionCheckBonus}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={truncatedDescriptionSx}>
                      {getBenefitSummaries(profession).join(' ')}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredProfessions.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No professions match the current filters.
        </Typography>
      ) : (
        <TablePagination
          component="div"
          count={filteredProfessions.length}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
        />
      )}
    </Stack>
  );
}
