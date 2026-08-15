import { useState } from 'react';
import {
  Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Select, Snackbar,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { ConfirmDialog } from '@shared/components';
import { scrollableTableContainerSx } from '@shared/constants/tableStyles';
import { getFxRules } from '../services/characterDataService';
import { importFxAbilityDesigns, serializeFxAbilityDesigns } from '../services/fxService';
import type { CharacterValidationResult } from '../types/characterState';
import type { FxAbilityDesign, FxCampaignTone, FxDiscipline, FxPlan, FxQuality } from '../types/fx';
import { FxAbilityDialog } from './FxAbilityDialog';

interface FxStepProps {
  plan: FxPlan;
  validation: CharacterValidationResult;
  onChange: (plan: FxPlan) => void;
}

type Notice = { message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null;

function titleCase(value: string): string {
  return value.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

export function FxStep({ plan, validation, onChange }: FxStepProps) {
  const rules = getFxRules();
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<FxAbilityDesign | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [pendingBroadSkill, setPendingBroadSkill] = useState<FxDiscipline | null | undefined>();
  const [pendingDesignUpdate, setPendingDesignUpdate] = useState<FxAbilityDesign | null>(null);
  const [pendingDeleteDesign, setPendingDeleteDesign] = useState<FxAbilityDesign | null>(null);
  const [pendingCampaignTone, setPendingCampaignTone] = useState<FxCampaignTone | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const setCampaignTone = (campaignTone: FxCampaignTone) => {
    if (campaignTone === plan.campaignTone) return;
    if (validation.advancement.finalFxBroadSkill) {
      setPendingCampaignTone(campaignTone);
      return;
    }
    onChange({ ...plan, campaignTone });
  };

  const setBroadSkill = (broadSkill: FxDiscipline | null) => {
    const hasPurchases = validation.advancement.finalFxAbilityPurchases.length > 0
      || validation.advancement.finalFxFaithPurchases.length > 0;
    if (hasPurchases && broadSkill !== plan.broadSkill) {
      setPendingBroadSkill(broadSkill);
      return;
    }
    onChange({ ...plan, broadSkill });
  };

  const applyBroadSkill = (broadSkill: FxDiscipline | null) => onChange({
    ...plan,
    broadSkill,
    abilityPurchases: [],
    faithPurchases: [],
  });

  const openNewDesign = () => {
    setEditingDesign(null);
    setDialogKey((current) => current + 1);
    setDesignDialogOpen(true);
  };

  const openEditDesign = (design: FxAbilityDesign) => {
    setEditingDesign(design);
    setDialogKey((current) => current + 1);
    setDesignDialogOpen(true);
  };

  const replaceDesign = (design: FxAbilityDesign) => onChange({
    ...plan,
    designs: plan.designs.some((entry) => entry.id === design.id)
      ? plan.designs.map((entry) => entry.id === design.id ? design : entry)
      : [...plan.designs, design],
  });

  const saveDesign = (design: FxAbilityDesign) => {
    setDesignDialogOpen(false);
    if (editingDesign && validation.advancement.finalFxAbilityPurchases.some((purchase) => purchase.designId === editingDesign.id)) {
      setPendingDesignUpdate(design);
      return;
    }
    replaceDesign(design);
  };

  const setAbilityRank = (designId: string, rank: number) => onChange({
    ...plan,
    abilityPurchases: rank === 0
      ? plan.abilityPurchases.filter((purchase) => purchase.designId !== designId)
      : [
        ...plan.abilityPurchases.filter((purchase) => purchase.designId !== designId),
        { designId, rank },
      ],
  });

  const setFaithRank = (quality: FxQuality, rank: number) => onChange({
    ...plan,
    faithPurchases: rank === 0
      ? plan.faithPurchases.filter((purchase) => purchase.quality !== quality)
      : [
        ...plan.faithPurchases.filter((purchase) => purchase.quality !== quality),
        { quality, rank },
      ],
  });

  const exportDesigns = async () => {
    if (plan.designs.length === 0) return;
    try {
      const json = serializeFxAbilityDesigns(plan.designs);
      if (!window.electronAPI) {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'fx-abilities.fx-ability.json';
        link.click();
        URL.revokeObjectURL(url);
        setNotice({ message: `Exported ${plan.designs.length} FX abilities.`, severity: 'success' });
        return;
      }
      const dialogResult = await window.electronAPI.showFxAbilitySaveDialog('fx-abilities.fx-ability.json');
      if (dialogResult.canceled || !dialogResult.filePath) return;
      const result = await window.electronAPI.saveFile(dialogResult.filePath, json);
      setNotice(result.success
        ? { message: `Exported ${plan.designs.length} FX abilities.`, severity: 'success' }
        : { message: `Export failed: ${result.error}`, severity: 'error' });
    } catch (error) {
      setNotice({ message: `Export failed: ${error instanceof Error ? error.message : String(error)}`, severity: 'error' });
    }
  };

  const applyImportedJson = (json: string) => {
    const result = importFxAbilityDesigns(json, plan.designs, rules);
    if (result.designs.length > 0) onChange({ ...plan, designs: [...plan.designs, ...result.designs] });
    setNotice(result.warnings.length > 0
      ? { message: `Imported ${result.designs.length}. ${result.warnings.join(' ')}`, severity: 'warning' }
      : result.designs.length > 0
        ? { message: `Imported ${result.designs.length} FX abilities.`, severity: 'success' }
        : { message: 'No FX abilities were imported.', severity: 'info' });
  };

  const importDesigns = async () => {
    try {
      if (!window.electronAPI) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.fx-ability.json';
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) applyImportedJson(await file.text());
        };
        input.click();
        return;
      }
      const dialogResult = await window.electronAPI.showFxAbilityOpenDialog();
      if (dialogResult.canceled || dialogResult.filePaths.length === 0) return;
      const readResult = await window.electronAPI.readFile(dialogResult.filePaths[0]);
      if (!readResult.success || !readResult.content) {
        setNotice({ message: `Import failed: ${readResult.error}`, severity: 'error' });
        return;
      }
      applyImportedJson(readResult.content);
    } catch (error) {
      setNotice({ message: `Import failed: ${error instanceof Error ? error.message : String(error)}`, severity: 'error' });
    }
  };

  const selectedTone = rules.campaignTones.find((tone) => tone.id === plan.campaignTone);
  const defaultDiscipline = plan.broadSkill === 'super-power' ? 'super-power' : 'arcane';

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5">FX</Typography>
          <Typography variant="body2" color="text.secondary">Gamemaster Guide optional FX rules</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.fx.spentSkillPoints} skill points spent`} variant="outlined" />
          <Chip label={`${validation.fx.remainingSkillPoints} remaining`} color={validation.fx.remainingSkillPoints >= 0 ? 'success' : 'error'} variant="outlined" />
          <Chip label={`${validation.advancement.currentMaximumFxEnergy}/${validation.advancement.maximumFxEnergy} FX energy`} color={plan.broadSkill ? 'primary' : 'default'} variant="outlined" />
        </Stack>
      </Stack>

      {validation.fx.errors.length > 0 && <Alert severity="error">{validation.fx.errors.join(' ')}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Campaign Tone</Typography>
          <ToggleButtonGroup
            exclusive
            value={plan.campaignTone}
            onChange={(_event, value) => value && setCampaignTone(value)}
            fullWidth
            size="small"
          >
            {rules.campaignTones.map((tone) => (
              <ToggleButton key={tone.id} value={tone.id} aria-label={`${tone.name} campaign tone`}>
                <Stack><span>{tone.name}</span><Typography variant="caption">{tone.startingEnergy}/{tone.maximumEnergy} energy, {tone.skillPointCostPerEnergy} SP each</Typography></Stack>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {selectedTone && (
            <Typography variant="body2" color="text.secondary">
              Starts with {selectedTone.startingEnergy} FX energy; maximum {selectedTone.maximumEnergy}; additional points cost {selectedTone.skillPointCostPerEnergy} SP each.
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">FX Broad Skill</Typography>
          <ToggleButtonGroup
            exclusive
            value={plan.broadSkill || 'none'}
            onChange={(_event, value) => value && setBroadSkill(value === 'none' ? null : value)}
            fullWidth
            size="small"
          >
            <ToggleButton value="none">None</ToggleButton>
            {rules.broadSkills.map((skill) => (
              <ToggleButton key={skill.discipline} value={skill.discipline} aria-label={`${skill.name} broad skill`}>
                {skill.name} ({skill.cost} SP)
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {plan.broadSkill === 'faith' && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Faith Specialties</Typography>
          <TextField
            label="Faith Relic or Focus"
            value={plan.faithFocus || ''}
            onChange={(event) => onChange({ ...plan, faithFocus: event.target.value })}
            helperText="Without a focus, miracle checks take +1, +2, or +3 steps according to quality"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TableContainer sx={scrollableTableContainerSx}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Miracle Skill</TableCell><TableCell>Quality</TableCell><TableCell>Base Cost</TableCell><TableCell>Starting Rank</TableCell></TableRow></TableHead>
              <TableBody>{rules.faithSpecialties.map((specialty) => {
                const rank = plan.faithPurchases.find((purchase) => purchase.quality === specialty.quality)?.rank || 0;
                return <TableRow key={specialty.quality}>
                  <TableCell>{specialty.name}</TableCell><TableCell>{titleCase(specialty.quality)}</TableCell><TableCell>{specialty.cost}</TableCell>
                  <TableCell><Select size="small" value={rank} onChange={(event) => setFaithRank(specialty.quality, Number(event.target.value))} inputProps={{ 'aria-label': `${specialty.name} rank` }}><MenuItem value={0}>Not purchased</MenuItem>{[1, 2, 3].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box><Typography variant="h6">Designed Abilities</Typography><Typography variant="body2" color="text.secondary">Arcane spells and Super Power abilities</Typography></Box>
          <Stack direction="row" gap={1}>
            <Tooltip title="Import FX abilities"><IconButton aria-label="Import FX abilities" onClick={() => { void importDesigns(); }}><FileUploadOutlinedIcon /></IconButton></Tooltip>
            <Tooltip title="Export FX abilities"><span><IconButton aria-label="Export FX abilities" onClick={() => { void exportDesigns(); }} disabled={plan.designs.length === 0}><FileDownloadOutlinedIcon /></IconButton></span></Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewDesign}>Design Ability</Button>
          </Stack>
        </Stack>
        <TableContainer sx={scrollableTableContainerSx}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Ability</TableCell><TableCell>Quality</TableCell><TableCell>Cost</TableCell><TableCell>Starting Rank</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {plan.designs.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>No designed FX abilities</TableCell></TableRow>}
              {plan.designs.map((design) => {
                const result = validation.fx.designResults.find((entry) => entry.designId === design.id);
                const rank = plan.abilityPurchases.find((purchase) => purchase.designId === design.id)?.rank || 0;
                const finalRank = validation.advancement.finalFxAbilityPurchases.find((purchase) => purchase.designId === design.id)?.rank || 0;
                const purchasable = result?.valid && plan.broadSkill === design.discipline;
                return <TableRow key={design.id}>
                  <TableCell><Typography fontWeight={600}>{design.name}</Typography><Typography variant="caption" color="text.secondary">{design.description}</Typography></TableCell>
                  <TableCell>{design.discipline === 'arcane' ? 'Arcane Magic' : 'Super Power'} / {titleCase(design.category)}</TableCell>
                  <TableCell>{design.ability.toUpperCase()}</TableCell><TableCell>{result?.quality ? titleCase(result.quality) : 'Invalid'}</TableCell><TableCell>{result?.purchaseCost ?? '-'}</TableCell>
                  <TableCell><Select size="small" value={rank} disabled={!purchasable} onChange={(event) => setAbilityRank(design.id, Number(event.target.value))} inputProps={{ 'aria-label': `${design.name} rank` }}><MenuItem value={0}>Not purchased</MenuItem>{[1, 2, 3].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></TableCell>
                  <TableCell align="right">
                    <Tooltip title={`Edit ${design.name}`}><IconButton size="small" aria-label={`Edit ${design.name}`} onClick={() => openEditDesign(design)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={finalRank > 0 ? 'Remove purchased ranks before deleting' : `Delete ${design.name}`}><span><IconButton size="small" aria-label={`Delete ${design.name}`} disabled={finalRank > 0} onClick={() => setPendingDeleteDesign(design)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <FxAbilityDialog
        key={dialogKey}
        open={designDialogOpen}
        editingDesign={editingDesign}
        defaultDiscipline={defaultDiscipline}
        onSave={saveDesign}
        onCancel={() => setDesignDialogOpen(false)}
      />
      <ConfirmDialog
        open={pendingCampaignTone !== null}
        title="Change FX campaign tone?"
        message="Changing campaign tone recalculates starting and maximum FX energy and the skill-point cost of energy purchased during advancement."
        confirmLabel="Change Campaign Tone"
        confirmColor="warning"
        onConfirm={() => {
          if (pendingCampaignTone) onChange({ ...plan, campaignTone: pendingCampaignTone });
          setPendingCampaignTone(null);
        }}
        onCancel={() => setPendingCampaignTone(null)}
      />
      <ConfirmDialog
        open={pendingBroadSkill !== undefined}
        title="Change FX broad skill?"
        message="Changing the FX broad skill removes all starting FX specialty ranks. Designed abilities remain in the library, and advancement purchases may need to be removed separately."
        confirmLabel="Change Broad Skill"
        confirmColor="warning"
        onConfirm={() => {
          if (pendingBroadSkill !== undefined) applyBroadSkill(pendingBroadSkill);
          setPendingBroadSkill(undefined);
        }}
        onCancel={() => setPendingBroadSkill(undefined)}
      />
      <ConfirmDialog
        open={pendingDesignUpdate !== null}
        title="Recalculate purchased FX ability?"
        message="Editing this ability recalculates its creation and advancement costs. The character may need additional changes to remain valid."
        confirmLabel="Update Ability"
        confirmColor="warning"
        onConfirm={() => {
          if (pendingDesignUpdate) replaceDesign(pendingDesignUpdate);
          setPendingDesignUpdate(null);
        }}
        onCancel={() => setPendingDesignUpdate(null)}
      />
      <ConfirmDialog
        open={pendingDeleteDesign !== null}
        title="Delete FX ability?"
        message={`Delete ${pendingDeleteDesign?.name || 'this ability'} from the character's design library?`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDeleteDesign) onChange({ ...plan, designs: plan.designs.filter((design) => design.id !== pendingDeleteDesign.id) });
          setPendingDeleteDesign(null);
        }}
        onCancel={() => setPendingDeleteDesign(null)}
      />
      <Snackbar open={notice !== null} autoHideDuration={5000} onClose={() => setNotice(null)}>
        <Alert severity={notice?.severity || 'info'} onClose={() => setNotice(null)}>{notice?.message}</Alert>
      </Snackbar>
    </Stack>
  );
}