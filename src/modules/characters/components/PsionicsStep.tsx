import {
  Alert, Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem,
  Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { getAllPsionicSkills, getPsionicRules, getSpeciesById } from '../services/characterDataService';
import type {
  PsionicAccessPath,
  PsionicPurchasePlan,
  SkillPurchasePlan,
  SpecialtySkillPurchase,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';

interface PsionicsStepProps {
  speciesId: string;
  professionId: string | null;
  plan: PsionicPurchasePlan;
  coreSkillPlan: SkillPurchasePlan;
  validation: CharacterValidationResult;
  onChange: (plan: PsionicPurchasePlan) => void;
  onCoreSkillPlanChange: (plan: SkillPurchasePlan) => void;
}

export function PsionicsStep({
  speciesId,
  professionId,
  plan,
  coreSkillPlan,
  validation,
  onChange,
  onCoreSkillPlanChange,
}: PsionicsStepProps) {
  const skills = getAllPsionicSkills();
  const rules = getPsionicRules();
  const species = getSpeciesById(speciesId);
  const broadSkills = skills.filter((skill) => skill.kind === 'broad');
  const trainedBroadIds = new Set(validation.psionics.trainedBroadSkillIds);
  const selectedSpecialties = new Map(plan.specialtySkills.map((purchase) => [purchase.skillId, purchase]));
  const selectedCostById = new Map(validation.psionics.costs.map((cost) => [cost.skillId, cost.cost]));

  const setAccessPath = (accessPath: PsionicAccessPath) => {
    const additionalDiscountProfessionIds = accessPath === 'diplomat-mindwalker'
      ? [...coreSkillPlan.additionalDiscountProfessionIds.filter((id) => id !== 'mindwalker'), 'mindwalker']
      : coreSkillPlan.additionalDiscountProfessionIds.filter((id) => id !== 'mindwalker');
    onCoreSkillPlanChange({ ...coreSkillPlan, additionalDiscountProfessionIds });
    onChange({ accessPath, purchasedBroadSkillIds: [], specialtySkills: [] });
  };

  const toggleBroadSkill = (skillId: string, checked: boolean) => {
    const purchasedBroadSkillIds = checked
      ? [...plan.purchasedBroadSkillIds, skillId]
      : plan.purchasedBroadSkillIds.filter((id) => id !== skillId);
    const childIds = new Set(skills.filter((skill) => skill.parentSkillId === skillId).map((skill) => skill.id));
    const specialtySkills = checked
      ? plan.specialtySkills
      : plan.specialtySkills.filter((purchase) => !childIds.has(purchase.skillId));
    onChange({ ...plan, purchasedBroadSkillIds, specialtySkills });
  };

  const updateSpecialty = (purchase: SpecialtySkillPurchase, rank: number) => {
    const specialtySkills = plan.specialtySkills.filter((entry) => entry.skillId !== purchase.skillId);
    if (rank > 0) specialtySkills.push({ ...purchase, rank });
    onChange({ ...plan, specialtySkills });
  };

  const maxRank = plan.accessPath === 'talent'
    ? rules.talentMaximumSpecialtyRank
    : 3;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Psionics</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.psionics.maximumEnergyPoints} energy`} color="primary" variant="outlined" />
          <Chip label={`${validation.psionics.remainingSkillPoints} skill points remaining`} variant="outlined" />
        </Stack>
      </Stack>
      <FormControl sx={{ maxWidth: 360 }}>
        <InputLabel id="psionic-path-label">Access Path</InputLabel>
        <Select
          labelId="psionic-path-label"
          label="Access Path"
          value={plan.accessPath}
          onChange={(event) => setAccessPath(event.target.value as PsionicAccessPath)}
        >
          <MenuItem value="none">No psionics</MenuItem>
          <MenuItem value="talent" disabled={professionId === 'mindwalker'}>Talent</MenuItem>
          <MenuItem value="mindwalker" disabled={professionId !== 'mindwalker'}>Mindwalker</MenuItem>
          <MenuItem value="diplomat-mindwalker" disabled={professionId !== 'diplomat'}>Diplomat / Mindwalker</MenuItem>
        </Select>
      </FormControl>
      {validation.psionics.errors.length > 0 && <Alert severity="error">{validation.psionics.errors.join(' ')}</Alert>}
      {plan.accessPath === 'mindwalker' && (
        <FormControl sx={{ maxWidth: 360 }}>
          <InputLabel id="favored-psionic-label">Favored Discipline</InputLabel>
          <Select
            labelId="favored-psionic-label"
            label="Favored Discipline"
            value={plan.favoredBroadSkillId || ''}
            onChange={(event) => onChange({ ...plan, favoredBroadSkillId: event.target.value })}
          >
            {broadSkills.map((skill) => <MenuItem key={skill.id} value={skill.id}>{skill.name}</MenuItem>)}
          </Select>
        </FormControl>
      )}
      {plan.accessPath !== 'none' && (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 390px)', minHeight: 360 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>Train</TableCell>
                <TableCell>Discipline / Skill</TableCell>
                <TableCell sx={{ width: 130 }}>Cost</TableCell>
                <TableCell sx={{ width: 130 }}>Rank</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {broadSkills.flatMap((broadSkill) => {
                const isFree = species?.freeBroadSkillIds.includes(broadSkill.id) || false;
                const isTrained = trainedBroadIds.has(broadSkill.id);
                const broadRow = (
                  <TableRow key={broadSkill.id} sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Checkbox
                        checked={isTrained}
                        disabled={isFree}
                        onChange={(event) => toggleBroadSkill(broadSkill.id, event.target.checked)}
                        inputProps={{ 'aria-label': `Purchase ${broadSkill.name}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{broadSkill.name}</Typography>
                        {isFree && <Chip label="Species" size="small" color="success" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{selectedCostById.get(broadSkill.id) ?? broadSkill.listedCost}</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                );
                const specialtyRows = skills
                  .filter((skill) => skill.parentSkillId === broadSkill.id)
                  .map((skill) => {
                    const purchase = selectedSpecialties.get(skill.id);
                    const rank = purchase?.rank || 0;
                    return (
                      <TableRow key={skill.id}>
                        <TableCell />
                        <TableCell sx={{ pl: 5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2">{skill.name}</Typography>
                            {!skill.canUseUntrained && <Chip label="Trained only" size="small" variant="outlined" />}
                          </Stack>
                        </TableCell>
                        <TableCell>{selectedCostById.get(skill.id) ?? skill.listedCost}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={rank}
                            disabled={!isTrained}
                            onChange={(event) => updateSpecialty(purchase || { skillId: skill.id, rank: 0 }, Number(event.target.value))}
                            inputProps={{ 'aria-label': `${skill.name} rank` }}
                            fullWidth
                          >
                            {Array.from({ length: maxRank + 1 }, (_value, index) => (
                              <MenuItem key={index} value={index}>{index}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  });
                return [broadRow, ...specialtyRows];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {plan.accessPath === 'talent' && (
        <FormControlLabel
          control={<Checkbox checked readOnly />}
          label={`Talent limit: ${rules.talentBroadSkillLimit} discipline, ${rules.talentSpecialtySkillLimit} specialty skills`}
        />
      )}
    </Stack>
  );
}