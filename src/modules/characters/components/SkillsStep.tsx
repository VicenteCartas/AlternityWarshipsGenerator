import { useMemo, useState } from 'react';
import {
  Alert, Box, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper,
  Dialog, DialogActions, DialogContent, DialogTitle, Button, Select, Stack, Tab,
  Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs,
  TextField, Tooltip, Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { scrollableTableContainerSx } from '@shared/constants/tableStyles';
import {
  getAllCharacterSourcePacks,
  getAllSkills,
  getSkillRankBenefits,
  getSpeciesById,
} from '../services/characterDataService';
import {
  getCharacterDefinitionSource,
  getCharacterDefinitionSources,
} from '../services/characterDefinitionSourceService';
import { calculateSkillListCost, calculateSpecialtyPurchaseCost } from '../services/skillPurchaseService';
import type {
  AbilityId,
  CharacterSkillRules,
  SkillPurchasePlan,
  SpecialtySkillPurchase,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { CharacterSourceFilter } from './CharacterSourceFilter';

interface SkillsStepProps {
  speciesId: string;
  plan: SkillPurchasePlan;
  skillRules: CharacterSkillRules;
  validation: CharacterValidationResult;
  onChange: (plan: SkillPurchasePlan) => void;
  onSkillRulesChange: (skillRules: CharacterSkillRules) => void;
}

const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wil', 'per'];

function getRankBenefitRanks(rankBenefits: ReturnType<typeof getSkillRankBenefits>): number[] {
  return [...new Set(rankBenefits.flatMap((benefit) => benefit.ranks))]
    .sort((left, right) => left - right);
}

function formatRankBenefitRanks(ranks: number[]): string {
  const interval = ranks[1] - ranks[0];
  const regularCadence = ranks.length >= 3
    && ranks[0] === interval
    && ranks.every((rank, index) => index === 0 || rank - ranks[index - 1] === interval);
  if (ranks.length === 12 && ranks.every((rank, index) => rank === index + 1)) return 'Every rank';
  if (regularCadence) return `Every ${interval} ranks`;
  if (ranks.length <= 4) return `Ranks ${ranks.join(', ')}`;
  return `${ranks.length} milestones`;
}

export function SkillsStep({
  speciesId,
  plan,
  skillRules,
  validation,
  onChange,
  onSkillRulesChange,
}: SkillsStepProps) {
  const [ability, setAbility] = useState<AbilityId>('str');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [rankBenefitSkillId, setRankBenefitSkillId] = useState<string | null>(null);
  const species = getSpeciesById(speciesId);
  const allSkills = getAllSkills();
  const sourcePacks = getAllCharacterSourcePacks();
  const sourceOptions = getCharacterDefinitionSources(allSkills, sourcePacks);
  const [expandedBroadSkillIds, setExpandedBroadSkillIds] = useState<Set<string>>(() => {
    const purchasedSpecialtyIds = new Set(plan.specialtySkills.map((purchase) => purchase.skillId));
    return new Set(
      allSkills
        .filter((skill) => skill.kind === 'specialty' && purchasedSpecialtyIds.has(skill.id))
        .map((skill) => skill.parentSkillId)
        .filter((id): id is string => Boolean(id)),
    );
  });
  const discountProfessionIds = useMemo(
    () => new Set(validation.skills.skillDiscountProfessionIds),
    [validation.skills.skillDiscountProfessionIds],
  );
  const retainedFreeIds = new Set(validation.skills.retainedFreeBroadSkillIds);
  const trainedBroadIds = new Set(validation.skills.trainedBroadSkillIds);
  const freeBroadIds = new Set(species?.freeBroadSkillIds || []);
  const specialtyPurchasesBySkillId = new Map<string, { purchase: SpecialtySkillPurchase; index: number }[]>();
  plan.specialtySkills.forEach((purchase, index) => {
    const purchases = specialtyPurchasesBySkillId.get(purchase.skillId) || [];
    purchases.push({ purchase, index });
    specialtyPurchasesBySkillId.set(purchase.skillId, purchases);
  });
  const rankBenefitSkill = allSkills.find((skill) => skill.id === rankBenefitSkillId);
  const selectedRankBenefits = rankBenefitSkill ? getSkillRankBenefits(rankBenefitSkill) : [];
  const selectedRank = rankBenefitSkill
    ? Math.max(
        rankBenefitSkill.id === 'language' && plan.nativeLanguage.trim() ? 3 : 0,
        ...(specialtyPurchasesBySkillId.get(rankBenefitSkill.id) || []).map(({ purchase }) => purchase.rank),
      )
    : 0;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const skillMatchesSource = (skill: (typeof allSkills)[number]) => (
    sourceFilter === 'all' || getCharacterDefinitionSource(skill, sourcePacks).key === sourceFilter
  );

  const skillMatchesSearch = (skill: (typeof allSkills)[number]) => {
    if (skill.name.toLocaleLowerCase().includes(normalizedSearch)) return true;
    return getSkillRankBenefits(skill).some((benefit) => (
      benefit.name.toLocaleLowerCase().includes(normalizedSearch)
      || benefit.description.toLocaleLowerCase().includes(normalizedSearch)
    ));
  };

  const broadSkills = allSkills.filter((skill) => {
    if (skill.kind !== 'broad' || skill.ability !== ability) return false;
    const specialties = allSkills.filter((entry) => entry.parentSkillId === skill.id);
    if (!skillMatchesSource(skill) && !specialties.some(skillMatchesSource)) return false;
    if (!normalizedSearch) return true;
    return skillMatchesSearch(skill)
      || specialties.some((entry) => skillMatchesSource(entry) && skillMatchesSearch(entry));
  });

  const updateSingleSpecialty = (skillId: string, rank: number) => {
    const specialtySkills = plan.specialtySkills.filter((entry) => entry.skillId !== skillId);
    if (rank > 0) specialtySkills.push({ skillId, rank });
    onChange({ ...plan, specialtySkills });
  };

  const updateSpecializedPurchase = (index: number, updates: Partial<SpecialtySkillPurchase>) => {
    onChange({
      ...plan,
      specialtySkills: plan.specialtySkills.map((entry, entryIndex) => (
        entryIndex === index ? { ...entry, ...updates } : entry
      )),
    });
  };

  const removeSpecializedPurchase = (index: number) => {
    onChange({
      ...plan,
      specialtySkills: plan.specialtySkills.filter((_entry, entryIndex) => entryIndex !== index),
    });
  };

  const addSpecializedPurchase = (skillId: string, rank = 1) => {
    onChange({
      ...plan,
      specialtySkills: [...plan.specialtySkills, { skillId, rank, specialization: '' }],
    });
  };

  const setBroadSkillExpanded = (skillId: string, expanded: boolean) => {
    setExpandedBroadSkillIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(skillId);
      else next.delete(skillId);
      return next;
    });
  };

  const toggleBroadSkill = (skillId: string, isFree: boolean, checked: boolean) => {
    if (isFree) {
      const cashedInFreeBroadSkillIds = checked
        ? plan.cashedInFreeBroadSkillIds.filter((id) => id !== skillId)
        : [...plan.cashedInFreeBroadSkillIds, skillId];
      onChange({ ...plan, cashedInFreeBroadSkillIds });
      return;
    }

    const purchasedBroadSkillIds = checked
      ? [...plan.purchasedBroadSkillIds, skillId]
      : plan.purchasedBroadSkillIds.filter((id) => id !== skillId);
    if (checked) setBroadSkillExpanded(skillId, true);
    const childIds = new Set(allSkills.filter((entry) => entry.parentSkillId === skillId).map((entry) => entry.id));
    const specialtySkills = checked
      ? plan.specialtySkills
      : plan.specialtySkills.filter((entry) => !childIds.has(entry.skillId));
    onChange({ ...plan, purchasedBroadSkillIds, specialtySkills });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5">Skills</Typography>
          <Typography variant="body2" color="text.secondary">
            Free broad skills do not count toward the purchased broad-skill limit.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.skills.remainingSkillPoints} points remaining`} color={validation.skills.remainingSkillPoints >= 0 ? 'success' : 'error'} variant="outlined" />
          <Chip label={`${validation.skills.purchasedBroadSkillCount}/${validation.skills.maxPurchasedBroadSkills} broad skills`} variant="outlined" />
        </Stack>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="subtitle1">Official Optional Skill Rules</Typography>
              <Typography variant="body2" color="text.secondary">
                First-party alternatives published by the Alternity development team.
              </Typography>
            </Box>
            <Chip label="Standard PHB remains the default" size="small" variant="outlined" />
          </Stack>
          <FormControlLabel
            labelPlacement="start"
            sx={{ m: 0, justifyContent: 'space-between', gap: 2 }}
            label={(
              <Box>
                <Typography variant="subtitle2">Optional Rules 2A and 2B</Typography>
                <Typography variant="body2" color="text.secondary">
                  30 + (3 x INT) starting skill points and 6 + INT resistance modifier broad skills.
                  Humans retain +5 skill points and +1 broad skill.
                </Typography>
              </Box>
            )}
            control={(
              <Switch
                checked={skillRules.startingSkillAllocation === 'optional-2ab'}
                onChange={(_event, checked) => onSkillRulesChange({
                  ...skillRules,
                  startingSkillAllocation: checked ? 'optional-2ab' : 'standard',
                })}
              />
            )}
          />
          <FormControlLabel
            labelPlacement="start"
            sx={{ m: 0, justifyContent: 'space-between', gap: 2 }}
            label={(
              <Box>
                <Typography variant="subtitle2">Optional Rule 2C</Typography>
                <Typography variant="body2" color="text.secondary">
                  Every specialty rank costs its list price, or list price -1 with a profession discount.
                </Typography>
              </Box>
            )}
            control={(
              <Switch
                checked={skillRules.specialtySkillCosts === 'optional-2c'}
                onChange={(_event, checked) => onSkillRulesChange({
                  ...skillRules,
                  specialtySkillCosts: checked ? 'optional-2c' : 'standard',
                })}
              />
            )}
          />
        </Stack>
      </Paper>
      {validation.skills.errors.length > 0 && <Alert severity="error">{validation.skills.errors.join(' ')}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
        <TextField
          size="small"
          label="Search skills"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />
        <CharacterSourceFilter
          id="skills-source"
          value={sourceFilter}
          options={sourceOptions}
          onChange={setSourceFilter}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Expand all broad skills in this Ability">
            <IconButton
              aria-label="Expand all broad skills"
              onClick={() => setExpandedBroadSkillIds((current) => new Set([
                ...current,
                ...broadSkills.map((skill) => skill.id),
              ]))}
            >
              <UnfoldMoreIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse all broad skills in this Ability">
            <IconButton
              aria-label="Collapse all broad skills"
              onClick={() => setExpandedBroadSkillIds((current) => {
                const next = new Set(current);
                broadSkills.forEach((skill) => next.delete(skill.id));
                return next;
              })}
            >
              <UnfoldLessIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Tabs value={ability} onChange={(_event, value: AbilityId) => setAbility(value)} variant="fullWidth">
        {ABILITIES.map((abilityId) => <Tab key={abilityId} value={abilityId} label={abilityId.toUpperCase()} />)}
      </Tabs>
      <TableContainer component={Paper} variant="outlined" sx={scrollableTableContainerSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }}>Train</TableCell>
              <TableCell>Skill</TableCell>
              <TableCell sx={{ width: 110 }}>Cost</TableCell>
              <TableCell sx={{ width: 120 }}>Rank</TableCell>
              <TableCell sx={{ width: 240 }}>Specialization</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {broadSkills.flatMap((broadSkill) => {
              const isFree = freeBroadIds.has(broadSkill.id);
              const isTrained = trainedBroadIds.has(broadSkill.id);
              const specialties = allSkills.filter((skill) => skill.parentSkillId === broadSkill.id);
              const broadMatchesSearch = skillMatchesSearch(broadSkill);
              const sourceSpecialties = specialties.filter(skillMatchesSource);
              const visibleSpecialties = normalizedSearch && !broadMatchesSearch
                ? sourceSpecialties.filter(skillMatchesSearch)
                : sourceSpecialties;
              const searchExpanded = Boolean(normalizedSearch) && visibleSpecialties.length > 0;
              const expanded = searchExpanded || expandedBroadSkillIds.has(broadSkill.id);
              const trainedSpecialtyCount = sourceSpecialties.reduce(
                (count, specialty) => count + (specialtyPurchasesBySkillId.get(specialty.id)?.length || 0),
                0,
              ) + (sourceSpecialties.some((specialty) => specialty.id === 'language') && plan.nativeLanguage.trim() ? 1 : 0);
              const rankBenefitSpecialtyCount = sourceSpecialties
                .filter((specialty) => getSkillRankBenefits(specialty).length > 0).length;
              const broadRow = (
                <TableRow key={broadSkill.id} sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>
                    <Checkbox
                      checked={isTrained}
                      onChange={(event) => toggleBroadSkill(broadSkill.id, isFree, event.target.checked)}
                      inputProps={{ 'aria-label': `${isFree ? 'Retain' : 'Purchase'} ${broadSkill.name}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton
                        size="small"
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${broadSkill.name} specialties`}
                        aria-expanded={expanded}
                        onClick={() => setBroadSkillExpanded(broadSkill.id, !expanded)}
                        disabled={searchExpanded}
                        sx={{ ml: -1 }}
                      >
                        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </IconButton>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography fontWeight={600}>{broadSkill.name}</Typography>
                          {isFree && <Chip label="Free" size="small" color={retainedFreeIds.has(broadSkill.id) ? 'success' : 'default'} variant="outlined" />}
                          {trainedSpecialtyCount > 0 && (
                            <Chip label={`${trainedSpecialtyCount} trained`} size="small" color="primary" variant="outlined" />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="caption" color="text.secondary">
                            {sourceSpecialties.length} {sourceSpecialties.length === 1 ? 'specialty' : 'specialties'}
                          </Typography>
                          {rankBenefitSpecialtyCount > 0 && (
                            <Stack direction="row" spacing={0.5} alignItems="center" color="primary.main">
                              <WorkspacePremiumOutlinedIcon sx={{ fontSize: 15 }} />
                              <Typography variant="caption" color="inherit">
                                {rankBenefitSpecialtyCount} with rank benefits
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{isFree ? (isTrained ? '0' : '+3 points') : calculateSkillListCost(broadSkill, discountProfessionIds)}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell />
                </TableRow>
              );
              const specialtyRows = expanded ? visibleSpecialties.map((specialty) => {
                const purchaseEntries = specialtyPurchasesBySkillId.get(specialty.id) || [];
                const purchase = purchaseEntries[0]?.purchase;
                const rank = purchase?.rank || 0;
                const rankBenefits = getSkillRankBenefits(specialty);
                const rankBenefitRanks = getRankBenefitRanks(rankBenefits);
                const cost = rank > 0
                  ? calculateSpecialtyPurchaseCost(
                    specialty,
                    rank,
                    discountProfessionIds,
                    skillRules.specialtySkillCosts,
                  )
                  : calculateSkillListCost(specialty, discountProfessionIds);
                const canAddSpecialization = specialty.requiresSpecialization
                  && isTrained
                  && purchaseEntries.length > 0
                  && purchaseEntries.every(({ purchase: entry }) => Boolean(entry.specialization?.trim()));
                const nativeLanguageRow = specialty.id === 'language' ? (
                  <TableRow key="language-native">
                    <TableCell />
                    <TableCell sx={{ pl: 5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">Language</Typography>
                        <Chip label="Native" size="small" color="success" variant="outlined" />
                      </Stack>
                    </TableCell>
                    <TableCell>Free</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={3}
                        disabled
                        inputProps={{ 'aria-label': 'Native Language rank' }}
                        fullWidth
                      >
                        <MenuItem value={3}>3</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={plan.nativeLanguage}
                        onChange={(event) => onChange({ ...plan, nativeLanguage: event.target.value })}
                        inputProps={{ 'aria-label': 'Native Language specialization' }}
                        placeholder="Language"
                        required
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                ) : null;
                const primaryRow = (
                  <TableRow key={`${specialty.id}-primary`}>
                    <TableCell />
                    <TableCell sx={{ pl: 5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{specialty.id === 'language' ? 'Additional language' : specialty.name}</Typography>
                        {rankBenefits.length > 0 && (
                          <Tooltip title={`Rank benefits at ranks ${rankBenefitRanks.join(', ')}`}>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<WorkspacePremiumOutlinedIcon fontSize="small" />}
                              aria-label={`View ${specialty.name} rank benefits`}
                              onClick={() => setRankBenefitSkillId(specialty.id)}
                              sx={{ minWidth: 0, px: 0.5, py: 0, fontSize: '0.72rem', textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                              {formatRankBenefitRanks(rankBenefitRanks)}
                            </Button>
                          </Tooltip>
                        )}
                        {specialty.requiresSpecialization && (
                          <Tooltip title={`Add another ${specialty.name} specialization`}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label={`Add another ${specialty.name} specialization`}
                                disabled={!canAddSpecialization}
                                onClick={() => addSpecializedPurchase(specialty.id)}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{rank > 0 ? cost : `${cost} at rank 1`}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={rank}
                        disabled={!isTrained}
                        onChange={(event) => {
                          const nextRank = Number(event.target.value);
                          if (specialty.requiresSpecialization) {
                            if (purchaseEntries[0]) {
                              if (nextRank > 0) updateSpecializedPurchase(purchaseEntries[0].index, { rank: nextRank });
                              else removeSpecializedPurchase(purchaseEntries[0].index);
                            } else if (nextRank > 0) {
                              addSpecializedPurchase(specialty.id, nextRank);
                            }
                          } else {
                            updateSingleSpecialty(specialty.id, nextRank);
                          }
                        }}
                        inputProps={{ 'aria-label': `${specialty.name} rank` }}
                        fullWidth
                      >
                        {[0, 1, 2, 3].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      {specialty.requiresSpecialization && rank > 0 && (
                        <TextField
                          size="small"
                          value={purchase?.specialization || ''}
                          onChange={(event) => updateSpecializedPurchase(purchaseEntries[0].index, { specialization: event.target.value })}
                          inputProps={{ 'aria-label': `${specialty.name} specialization` }}
                          placeholder="Subject or type"
                          fullWidth
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
                const additionalRows = specialty.requiresSpecialization
                  ? purchaseEntries.slice(1).map(({ purchase: additionalPurchase, index }, additionalIndex) => {
                      const displayIndex = additionalIndex + 2;
                      return (
                        <TableRow key={`${specialty.id}-${index}`}>
                          <TableCell />
                          <TableCell sx={{ pl: 8 }}>
                            <Typography variant="body2" color="text.secondary">
                              Additional {specialty.name.toLocaleLowerCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {calculateSpecialtyPurchaseCost(
                              specialty,
                              additionalPurchase.rank,
                              discountProfessionIds,
                              skillRules.specialtySkillCosts,
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={additionalPurchase.rank}
                              onChange={(event) => updateSpecializedPurchase(index, { rank: Number(event.target.value) })}
                              inputProps={{ 'aria-label': `${specialty.name} rank ${displayIndex}` }}
                              fullWidth
                            >
                              {[1, 2, 3].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <TextField
                                size="small"
                                value={additionalPurchase.specialization || ''}
                                onChange={(event) => updateSpecializedPurchase(index, { specialization: event.target.value })}
                                inputProps={{ 'aria-label': `${specialty.name} specialization ${displayIndex}` }}
                                placeholder="Subject or type"
                                fullWidth
                              />
                              <Tooltip title={`Remove ${specialty.name} specialization ${displayIndex}`}>
                                <IconButton
                                  size="small"
                                  aria-label={`Remove ${specialty.name} specialization ${displayIndex}`}
                                  onClick={() => removeSpecializedPurchase(index)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : [];
                return [nativeLanguageRow, primaryRow, ...additionalRows].filter(Boolean);
              }) : [];
              return [broadRow, ...specialtyRows.flat()];
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {species && (
        <FormControlLabel
          control={<Checkbox disabled checked={species.startingSkillPointBonus > 0} />}
          label={`${species.name} starting skill-point bonus: +${species.startingSkillPointBonus}`}
        />
      )}
      <Dialog
        open={Boolean(rankBenefitSkill)}
        onClose={() => setRankBenefitSkillId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{rankBenefitSkill?.name} rank benefits</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {selectedRankBenefits.map((benefit) => (
              <Box key={`${benefit.name}-${benefit.ranks.join('-')}`}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2">{benefit.name}</Typography>
                  {benefit.ranks.map((benefitRank) => (
                    <Chip
                      key={benefitRank}
                      label={`Rank ${benefitRank}`}
                      size="small"
                      color={selectedRank >= benefitRank ? 'success' : 'default'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {benefit.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRankBenefitSkillId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}