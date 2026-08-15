import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, IconButton,
  MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  getAllArmor,
  getAllCharacterOptions,
  getAllCybergear,
  getAllEquipment,
  getAllPsionicSkills,
  getAllSkills,
  getAllWeapons,
  getAdvancementRules,
  getFxRules,
} from '../services/characterDataService';
import {
  createEmptyAdvancementLevel,
  listAdvancementBenefitChoices,
  normalizeAdvancementPlan,
} from '../services/advancementService';
import type {
  AdvancementBenefitPurchase,
  AdvancementEquipmentAcquisition,
  AdvancementLevelPlan,
  AdvancementPlan,
  AdvancementSkillDomain,
  CharacterOptionSelection,
} from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

interface AdvancementStepProps {
  state: CharacterState;
  validation: CharacterValidationResult;
  onChange: (plan: AdvancementPlan) => void;
}

function skillKey(domain: AdvancementSkillDomain, skillId: string, specialization?: string): string {
  return `${domain}:${skillId}:${(specialization || '').trim().toLocaleLowerCase()}`;
}

function benefitLabel(benefit: AdvancementBenefitPurchase): string {
  if (benefit.type === 'ability-score-increase') return `Ability Score Increase: ${benefit.ability?.toUpperCase() || '?'}`;
  if (benefit.type === 'new-perk') return `New Perk: ${getAllCharacterOptions().find((entry) => entry.id === benefit.optionSelection?.optionId)?.name || '?'}`;
  if (benefit.type === 'remove-flaw') return `Remove Flaw: ${getAllCharacterOptions().find((entry) => entry.id === benefit.flawId)?.name || '?'}`;
  return getAdvancementRules().benefits.find((entry) => entry.type === benefit.type)?.name
    || (benefit.type === 'acquire-contact' ? 'Acquire Contact' : benefit.type);
}

export function AdvancementStep({ state, validation, onChange }: AdvancementStepProps) {
  const normalizedPlan = useMemo(
    () => normalizeAdvancementPlan(state.advancementPlan, state.level),
    [state.advancementPlan, state.level],
  );
  const [selectedLevel, setSelectedLevel] = useState(Math.min(2, state.level));
  const [skillDomain, setSkillDomain] = useState<AdvancementSkillDomain>('core');
  const [broadSkillId, setBroadSkillId] = useState('');
  const [specialtySkillId, setSpecialtySkillId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [benefitKey, setBenefitKey] = useState('');
  const [acquisition, setAcquisition] = useState<AdvancementEquipmentAcquisition>({
    kind: 'equipment', itemId: '', method: 'granted', quantity: 1,
  });

  const activeLevel = state.level <= 1
    ? 1
    : Math.min(state.level, Math.max(2, selectedLevel));

  const levelPlan = normalizedPlan.levels.find((entry) => entry.level === activeLevel)
    || createEmptyAdvancementLevel(Math.max(2, activeLevel));
  const levelResult = validation.advancement.levelResults.find((entry) => entry.level === activeLevel);
  const benefitChoices = listAdvancementBenefitChoices(state, activeLevel);
  const coreSkills = getAllSkills();
  const psionicSkills = getAllPsionicSkills();
  const fxRules = getFxRules();

  const fxBroadBeforeOrAtLevel = useMemo(() => {
    let broadSkill = state.fxPlan.broadSkill;
    for (const entry of normalizedPlan.levels.filter((candidate) => candidate.level <= activeLevel)) {
      const purchase = entry.broadSkills.find((candidate) => candidate.domain === 'fx');
      if (purchase) broadSkill = purchase.skillId as CharacterState['fxPlan']['broadSkill'];
    }
    return broadSkill;
  }, [activeLevel, normalizedPlan.levels, state.fxPlan.broadSkill]);

  const broadDefinitions = skillDomain === 'core'
    ? coreSkills.filter((entry) => entry.kind === 'broad')
    : skillDomain === 'psionic'
      ? psionicSkills.filter((entry) => entry.kind === 'broad')
      : fxBroadBeforeOrAtLevel
        ? []
        : fxRules.broadSkills.map((entry) => ({ id: entry.discipline, name: entry.name }));
  const specialtyDefinitions = skillDomain === 'core'
    ? coreSkills.filter((entry) => entry.kind === 'specialty')
    : skillDomain === 'psionic'
      ? psionicSkills.filter((entry) => entry.kind === 'specialty')
      : fxBroadBeforeOrAtLevel === 'faith'
        ? fxRules.faithSpecialties.map((entry) => ({ id: `faith:${entry.quality}`, name: entry.name }))
        : state.fxPlan.designs
          .filter((design) => !fxBroadBeforeOrAtLevel || design.discipline === fxBroadBeforeOrAtLevel)
          .map((design) => ({ id: design.id, name: design.name }));

  const rankBeforeLevel = useMemo(() => {
    const ranks = new Map<string, number>();
    for (const purchase of state.skillPlan.specialtySkills) {
      ranks.set(skillKey('core', purchase.skillId, purchase.specialization), purchase.rank);
    }
    if (state.skillPlan.nativeLanguage) ranks.set(skillKey('core', 'language', state.skillPlan.nativeLanguage), 3);
    for (const [skillId, rank] of Object.entries(validation.speciesBenefits.grantedSpecialtyRanks)) {
      if (![...ranks.keys()].some((key) => key.startsWith(`core:${skillId}:`))) ranks.set(skillKey('core', skillId), rank);
    }
    for (const purchase of state.psionicPlan.specialtySkills) ranks.set(skillKey('psionic', purchase.skillId), purchase.rank);
    for (const purchase of state.fxPlan.abilityPurchases) ranks.set(skillKey('fx', purchase.designId), purchase.rank);
    for (const purchase of state.fxPlan.faithPurchases) ranks.set(skillKey('fx', `faith:${purchase.quality}`), purchase.rank);
    for (const entry of normalizedPlan.levels.filter((candidate) => candidate.level < activeLevel)) {
      for (const purchase of entry.specialtySkills) {
        const key = skillKey(purchase.domain, purchase.skillId, purchase.specialization);
        ranks.set(key, (ranks.get(key) || 0) + 1);
      }
    }
    return ranks;
  }, [activeLevel, normalizedPlan.levels, state.fxPlan.abilityPurchases, state.fxPlan.faithPurchases, state.psionicPlan.specialtySkills, state.skillPlan, validation.speciesBenefits.grantedSpecialtyRanks]);

  const broadSkillLabel = (domain: AdvancementSkillDomain, skillId: string): string => {
    if (domain === 'core') return coreSkills.find((skill) => skill.id === skillId)?.name || skillId;
    if (domain === 'psionic') return psionicSkills.find((skill) => skill.id === skillId)?.name || skillId;
    return fxRules.broadSkills.find((skill) => skill.discipline === skillId)?.name || skillId;
  };

  const specialtySkillLabel = (domain: AdvancementSkillDomain, skillId: string): string => {
    if (domain === 'core') return coreSkills.find((skill) => skill.id === skillId)?.name || skillId;
    if (domain === 'psionic') return psionicSkills.find((skill) => skill.id === skillId)?.name || skillId;
    if (skillId.startsWith('faith:')) {
      return fxRules.faithSpecialties.find((skill) => `faith:${skill.quality}` === skillId)?.name || skillId;
    }
    return state.fxPlan.designs.find((design) => design.id === skillId)?.name || skillId;
  };

  const updateLevel = (updates: Partial<AdvancementLevelPlan>) => {
    onChange({
      levels: normalizedPlan.levels.map((entry) => entry.level === activeLevel ? { ...entry, ...updates } : entry),
    });
  };

  const addBroadSkill = () => {
    if (!broadSkillId) return;
    updateLevel({ broadSkills: [...levelPlan.broadSkills, { domain: skillDomain, skillId: broadSkillId }] });
    setBroadSkillId('');
  };

  const addSpecialtyRank = () => {
    if (!specialtySkillId) return;
    updateLevel({
      specialtySkills: [
        ...levelPlan.specialtySkills,
        { domain: skillDomain, skillId: specialtySkillId, specialization: specialization.trim() || undefined },
      ],
    });
    setSpecialtySkillId('');
    setSpecialization('');
  };

  const addBenefit = () => {
    const choice = benefitChoices.find((entry) => entry.key === benefitKey);
    if (!choice) return;
    let purchase: AdvancementBenefitPurchase = { type: choice.type };
    if (choice.ability) purchase = { ...purchase, ability: choice.ability };
    if (choice.optionId) {
      const definition = getAllCharacterOptions().find((entry) => entry.id === choice.optionId)!;
      purchase = {
        ...purchase,
        optionSelection: {
          optionId: definition.id,
          ...(definition.values.length > 0 ? { value: definition.values[0] } : {}),
          ...(definition.choices ? { choiceIds: [] } : {}),
        },
      };
    }
    if (choice.flawId) purchase = { ...purchase, flawId: choice.flawId };
    updateLevel({ benefits: [...levelPlan.benefits, purchase] });
    setBenefitKey('');
  };

  const updateBenefit = (index: number, updates: Partial<AdvancementBenefitPurchase>) => {
    updateLevel({ benefits: levelPlan.benefits.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...updates } : entry) });
  };

  const updateBenefitOption = (index: number, updates: Partial<CharacterOptionSelection>) => {
    const benefit = levelPlan.benefits[index];
    if (!benefit.optionSelection) return;
    updateBenefit(index, { optionSelection: { ...benefit.optionSelection, ...updates } });
  };

  const itemDefinitions = acquisition.kind === 'equipment'
    ? getAllEquipment()
    : acquisition.kind === 'weapon'
      ? getAllWeapons()
      : acquisition.kind === 'armor'
        ? getAllArmor()
        : getAllCybergear();
  const selectedItem = itemDefinitions.find((entry) => entry.id === acquisition.itemId);

  const addAcquisition = () => {
    if (!acquisition.itemId) return;
    updateLevel({ acquisitions: [...levelPlan.acquisitions, acquisition] });
    setAcquisition({ kind: acquisition.kind, itemId: '', method: 'granted', quantity: 1 });
  };

  if (state.level === 1) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Advancement</Typography>
        <Alert severity="info">This is a level-1 character. Increase Target Level in Identity to add advancement levels.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5">Advancement</Typography>
          <Typography variant="body2" color="text.secondary">
            Build each level in order. Unspent skill points and credits carry forward.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`Level ${state.level}`} color="primary" variant="outlined" />
          <Chip label={`${validation.advancement.achievementPoints} AP`} variant="outlined" />
          <Chip label={`${validation.advancement.remainingSkillPoints} skill points stored`} color={validation.advancement.remainingSkillPoints >= 0 ? 'success' : 'error'} variant="outlined" />
          <Chip label={`${validation.advancement.remainingCredits} credits`} color={validation.advancement.remainingCredits >= 0 ? 'success' : 'error'} variant="outlined" />
          {validation.advancement.finalFxBroadSkill && <Chip label={`${validation.advancement.currentMaximumFxEnergy}/${validation.advancement.maximumFxEnergy} FX energy`} color="primary" variant="outlined" />}
        </Stack>
      </Stack>
      {validation.advancement.errors.length > 0 && (
        <Alert severity="error">{validation.advancement.errors.join(' ')}</Alert>
      )}
      <Tabs value={activeLevel} onChange={(_event, value: number) => setSelectedLevel(value)} variant="scrollable" scrollButtons="auto">
        {normalizedPlan.levels.map((entry) => <Tab key={entry.level} value={entry.level} label={`Level ${entry.level}`} />)}
      </Tabs>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={`+${levelResult?.skillPointsEarned || activeLevel + 4} skill points`} color="primary" variant="outlined" />
        <Chip label={`${levelResult?.carriedIn || 0} carried in`} variant="outlined" />
        <Chip label={`${levelResult?.spent || 0} spent`} variant="outlined" />
        <Chip label={`${levelResult?.remaining || 0} remaining`} variant="outlined" />
        <Chip label={`${levelResult?.creditsRemaining ?? validation.remainingFunds} credits after level`} variant="outlined" />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Skills</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Select size="small" value={skillDomain} onChange={(event) => setSkillDomain(event.target.value as AdvancementSkillDomain)} sx={{ minWidth: 130 }} inputProps={{ 'aria-label': 'Skill domain' }}>
              <MenuItem value="core">Core</MenuItem>
              <MenuItem value="psionic" disabled={state.psionicPlan.accessPath === 'none'}>Psionic</MenuItem>
              <MenuItem value="fx" disabled={!state.selectedSourcePackIds.includes('gmg-fx') && state.fxPlan.designs.length === 0}>FX</MenuItem>
            </Select>
            <Select size="small" value={broadSkillId} onChange={(event) => setBroadSkillId(event.target.value)} displayEmpty fullWidth inputProps={{ 'aria-label': 'New broad skill' }}>
              <MenuItem value=""><em>Choose a broad skill</em></MenuItem>
              {broadDefinitions.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
            </Select>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addBroadSkill} disabled={!broadSkillId}>Add Broad</Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Select size="small" value={specialtySkillId} onChange={(event) => setSpecialtySkillId(event.target.value)} displayEmpty fullWidth inputProps={{ 'aria-label': 'Specialty rank' }}>
              <MenuItem value=""><em>Choose a specialty</em></MenuItem>
              {specialtyDefinitions.map((entry) => {
                const key = skillKey(skillDomain, entry.id, specialization);
                const nextRank = (rankBeforeLevel.get(key) || 0) + 1;
                return <MenuItem key={entry.id} value={entry.id}>{entry.name} (next rank {nextRank})</MenuItem>;
              })}
            </Select>
            {(() => {
              const selected = specialtyDefinitions.find((entry) => entry.id === specialtySkillId);
              return Boolean(selected && 'requiresSpecialization' in selected && selected.requiresSpecialization);
            })() && (
              <TextField size="small" label="Subject or type" value={specialization} onChange={(event) => setSpecialization(event.target.value)} />
            )}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addSpecialtyRank} disabled={!specialtySkillId}>Add Rank</Button>
          </Stack>
          {[...levelPlan.broadSkills.map((entry, index) => ({
            key: `broad-${index}`, label: `${entry.domain === 'psionic' ? 'Psionic ' : entry.domain === 'fx' ? 'FX ' : ''}${broadSkillLabel(entry.domain, entry.skillId)} broad skill`,
            remove: () => updateLevel({ broadSkills: levelPlan.broadSkills.filter((_item, itemIndex) => itemIndex !== index) }),
          })), ...levelPlan.specialtySkills.map((entry, index) => ({
            key: `specialty-${index}`, label: `${specialtySkillLabel(entry.domain, entry.skillId)}${entry.specialization ? ` (${entry.specialization})` : ''}: +1 rank`,
            remove: () => updateLevel({ specialtySkills: levelPlan.specialtySkills.filter((_item, itemIndex) => itemIndex !== index) }),
          }))].map((entry) => (
            <Stack key={entry.key} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">{entry.label}</Typography>
              <Tooltip title="Remove"><IconButton size="small" onClick={entry.remove}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Achievement Benefits</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Select size="small" value={benefitKey} onChange={(event) => setBenefitKey(event.target.value)} displayEmpty fullWidth inputProps={{ 'aria-label': 'Achievement benefit' }}>
              <MenuItem value=""><em>Choose a benefit</em></MenuItem>
              {benefitChoices.map((entry) => <MenuItem key={entry.key} value={entry.key}>{entry.label}</MenuItem>)}
            </Select>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addBenefit} disabled={!benefitKey}>Add Benefit</Button>
          </Stack>
          {levelPlan.benefits.map((benefit, index) => {
            const option = benefit.optionSelection
              ? getAllCharacterOptions().find((entry) => entry.id === benefit.optionSelection?.optionId)
              : undefined;
            return (
              <Paper key={`${benefit.type}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={600}>{benefitLabel(benefit)}</Typography>
                    <Tooltip title="Remove"><IconButton size="small" onClick={() => updateLevel({ benefits: levelPlan.benefits.filter((_entry, entryIndex) => entryIndex !== index) })}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                  {(benefit.type === 'monetary-award') && <TextField size="small" type="number" label="Awarded Credits" value={benefit.credits || 0} onChange={(event) => updateBenefit(index, { credits: Number(event.target.value) })} inputProps={{ min: 0 }} />}
                  {(benefit.type === 'acquire-contact') && <TextField size="small" label="Contact" value={benefit.notes || ''} onChange={(event) => updateBenefit(index, { notes: event.target.value })} />}
                  {option && benefit.optionSelection && (
                    <Stack spacing={1}>
                      {option.values.length > 1 && (
                        <Select size="small" value={benefit.optionSelection.value ?? option.values[0]} onChange={(event) => updateBenefitOption(index, { value: Number(event.target.value) })} inputProps={{ 'aria-label': `${option.name} value` }}>
                          {option.values.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </Select>
                      )}
                      {option.choices?.map((choice) => (
                        <FormControlLabel key={choice.id} control={<Checkbox checked={(benefit.optionSelection?.choiceIds || []).includes(choice.id)} onChange={(event) => updateBenefitOption(index, { choiceIds: event.target.checked ? [...(benefit.optionSelection?.choiceIds || []), choice.id] : (benefit.optionSelection?.choiceIds || []).filter((id) => id !== choice.id) })} />} label={`${choice.name} (${choice.value})`} />
                      ))}
                      {option.requiresNotes && <TextField size="small" label={`${option.name} details`} value={benefit.optionSelection.notes || ''} onChange={(event) => updateBenefitOption(index, { notes: event.target.value })} />}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Campaign Resources</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: state.selectedSourcePackIds.includes('gmg-fx') ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }, gap: 2 }}>
            <TextField size="small" type="number" label="Credits Awarded" value={levelPlan.creditsAwarded} onChange={(event) => updateLevel({ creditsAwarded: Number(event.target.value) })} inputProps={{ min: 0 }} />
            <TextField size="small" type="number" label="Last Resorts Spent" value={levelPlan.lastResortPointsSpent} onChange={(event) => updateLevel({ lastResortPointsSpent: Number(event.target.value) })} inputProps={{ min: 0 }} />
            <TextField size="small" type="number" label="Last Resorts Repurchased" value={levelPlan.lastResortPointsPurchased} onChange={(event) => updateLevel({ lastResortPointsPurchased: Number(event.target.value) })} inputProps={{ min: 0 }} />
            {state.selectedSourcePackIds.includes('gmg-fx') && <TextField size="small" type="number" label="FX Energy Purchased" value={levelPlan.fxEnergyPointsPurchased || 0} onChange={(event) => updateLevel({ fxEnergyPointsPurchased: Number(event.target.value) })} inputProps={{ min: 0 }} />}
          </Box>
          <Divider />
          <Typography variant="subtitle1" fontWeight={600}>Equipment Acquisitions</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <Select size="small" value={acquisition.kind} onChange={(event) => setAcquisition({ kind: event.target.value as AdvancementEquipmentAcquisition['kind'], itemId: '', method: acquisition.method, quantity: 1 })} inputProps={{ 'aria-label': 'Acquisition kind' }}>
              <MenuItem value="equipment">Equipment</MenuItem><MenuItem value="weapon">Weapon</MenuItem><MenuItem value="armor">Armor</MenuItem><MenuItem value="cybergear">Cybergear</MenuItem>
            </Select>
            <Select size="small" value={acquisition.itemId} onChange={(event) => {
              const itemId = event.target.value;
              const cyber = acquisition.kind === 'cybergear' ? getAllCybergear().find((entry) => entry.id === itemId) : undefined;
              const equipment = acquisition.kind === 'equipment' ? getAllEquipment().find((entry) => entry.id === itemId) : undefined;
              setAcquisition({ ...acquisition, itemId, quality: cyber?.qualities[0]?.quality || (equipment?.qualityCosts ? 'marginal' : undefined) });
            }} displayEmpty inputProps={{ 'aria-label': 'Acquired item' }}>
              <MenuItem value=""><em>Choose item</em></MenuItem>
              {itemDefinitions.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
            </Select>
            <Select size="small" value={acquisition.method} onChange={(event) => setAcquisition({ ...acquisition, method: event.target.value as AdvancementEquipmentAcquisition['method'] })} inputProps={{ 'aria-label': 'Acquisition method' }}>
              <MenuItem value="granted">Granted / Found</MenuItem><MenuItem value="purchased">Purchased</MenuItem>
            </Select>
            <TextField size="small" type="number" label="Quantity" value={acquisition.quantity} onChange={(event) => setAcquisition({ ...acquisition, quantity: Number(event.target.value) })} inputProps={{ min: 1 }} />
            {acquisition.kind === 'cybergear' && selectedItem && 'qualities' in selectedItem && <Select size="small" value={acquisition.quality || ''} onChange={(event) => setAcquisition({ ...acquisition, quality: event.target.value as AdvancementEquipmentAcquisition['quality'] })} inputProps={{ 'aria-label': 'Acquisition quality' }}>{selectedItem.qualities.map((entry) => <MenuItem key={entry.quality} value={entry.quality}>{entry.quality}</MenuItem>)}</Select>}
            {acquisition.kind === 'equipment' && selectedItem && 'qualityCosts' in selectedItem && selectedItem.qualityCosts && <Select size="small" value={acquisition.quality || 'marginal'} onChange={(event) => setAcquisition({ ...acquisition, quality: event.target.value as AdvancementEquipmentAcquisition['quality'] })} inputProps={{ 'aria-label': 'Acquisition quality' }}>{Object.keys(selectedItem.qualityCosts).map((quality) => <MenuItem key={quality} value={quality}>{quality}</MenuItem>)}</Select>}
            {acquisition.kind === 'weapon' && <TextField size="small" type="number" label="Spare Clips" value={acquisition.spareClips || 0} onChange={(event) => setAcquisition({ ...acquisition, spareClips: Number(event.target.value) })} inputProps={{ min: 0 }} />}
            {acquisition.method === 'purchased' && <TextField size="small" type="number" label="Actual Unit Price (optional)" value={acquisition.unitCostOverride ?? ''} onChange={(event) => setAcquisition({ ...acquisition, unitCostOverride: event.target.value === '' ? undefined : Number(event.target.value) })} inputProps={{ min: 0 }} />}
          </Box>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addAcquisition} disabled={!acquisition.itemId} sx={{ alignSelf: 'flex-start' }}>Add Acquisition</Button>
          {levelPlan.acquisitions.map((entry, index) => {
            const name = getAllEquipment().find((item) => item.id === entry.itemId)?.name || getAllWeapons().find((item) => item.id === entry.itemId)?.name || getAllArmor().find((item) => item.id === entry.itemId)?.name || getAllCybergear().find((item) => item.id === entry.itemId)?.name || entry.itemId;
            return <Stack key={`${entry.kind}-${entry.itemId}-${index}`} direction="row" alignItems="center" justifyContent="space-between"><Typography variant="body2">{entry.quantity}x {name} | {entry.method === 'granted' ? 'Granted / Found' : 'Purchased'}</Typography><Tooltip title="Remove"><IconButton size="small" onClick={() => updateLevel({ acquisitions: levelPlan.acquisitions.filter((_item, itemIndex) => itemIndex !== index) })}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip></Stack>;
          })}
          <TextField label="Level Notes" value={levelPlan.notes} onChange={(event) => updateLevel({ notes: event.target.value })} multiline minRows={2} />
        </Stack>
      </Paper>
    </Stack>
  );
}
