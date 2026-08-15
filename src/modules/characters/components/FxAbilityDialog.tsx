import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Select, Stack, Step,
  StepLabel, Stepper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getFxRules } from '../services/characterDataService';
import { calculateFxAbilityDesign, generateFxAbilityDesignId } from '../services/fxService';
import { ABILITY_IDS } from '../types/character';
import type {
  FxAbilityCategory,
  FxAbilityDesign,
  FxCharacteristicSelection,
  FxComplexity,
  FxDiscipline,
} from '../types/fx';

interface FxAbilityDialogProps {
  open: boolean;
  editingDesign: FxAbilityDesign | null;
  defaultDiscipline: Exclude<FxDiscipline, 'faith'>;
  onSave: (design: FxAbilityDesign) => void;
  onCancel: () => void;
}

const STEPS = ['Concept', 'Characteristics', 'Trappings', 'Review'];
const ARCANE_CATEGORIES: Array<{ id: FxAbilityCategory; label: string }> = [
  { id: 'augur', label: 'Augur' },
  { id: 'conjure', label: 'Conjure' },
  { id: 'summon', label: 'Summon' },
  { id: 'transform', label: 'Transform' },
];
const SUPER_CATEGORIES: Array<{ id: FxAbilityCategory; label: string }> = [
  { id: 'enchanted-relic', label: 'Enchanted Relic' },
  { id: 'extreme-ability', label: 'Extreme Ability' },
  { id: 'overscience-gadget', label: 'Overscience Gadget' },
];

function initialDesign(
  editingDesign: FxAbilityDesign | null,
  defaultDiscipline: Exclude<FxDiscipline, 'faith'>,
): FxAbilityDesign {
  return editingDesign || {
    id: generateFxAbilityDesignId(),
    name: '',
    discipline: defaultDiscipline,
    category: defaultDiscipline === 'arcane' ? 'augur' : 'extreme-ability',
    ability: 'wil',
    description: '',
    characteristics: [],
    trappings: {},
  };
}

export function FxAbilityDialog({
  open,
  editingDesign,
  defaultDiscipline,
  onSave,
  onCancel,
}: FxAbilityDialogProps) {
  const rules = getFxRules();
  const [activeStep, setActiveStep] = useState(0);
  const [design, setDesign] = useState(() => initialDesign(editingDesign, defaultDiscipline));
  const [characteristicId, setCharacteristicId] = useState('');
  const [choiceId, setChoiceId] = useState('');
  const [characteristicNotes, setCharacteristicNotes] = useState('');
  const calculation = useMemo(() => calculateFxAbilityDesign(design, rules), [design, rules]);
  const characteristic = rules.characteristics.find((entry) => entry.id === characteristicId);
  const categories = design.discipline === 'arcane' ? ARCANE_CATEGORIES : SUPER_CATEGORIES;

  const updateDesign = (updates: Partial<FxAbilityDesign>) => setDesign((current) => ({ ...current, ...updates }));
  const updateTrappings = (updates: Partial<FxAbilityDesign['trappings']>) => updateDesign({
    trappings: { ...design.trappings, ...updates },
  });

  const changeDiscipline = (discipline: Exclude<FxDiscipline, 'faith'>) => updateDesign({
    discipline,
    category: discipline === 'arcane' ? 'augur' : 'extreme-ability',
    trappings: {},
  });

  const addCharacteristic = () => {
    if (!characteristicId || !choiceId) return;
    const selection: FxCharacteristicSelection = {
      characteristicId,
      choiceId,
      ...(characteristicNotes.trim() ? { notes: characteristicNotes.trim() } : {}),
    };
    updateDesign({ characteristics: [...design.characteristics, selection] });
    setCharacteristicId('');
    setChoiceId('');
    setCharacteristicNotes('');
  };

  const conceptComplete = Boolean(design.name.trim() && design.description.trim());
  const canContinue = activeStep === 0
    ? conceptComplete
    : activeStep === 1
      ? design.characteristics.length > 0 && calculation.effectCost <= 15
      : true;

  const renderConcept = () => (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <Select
          value={design.discipline}
          onChange={(event) => changeDiscipline(event.target.value as Exclude<FxDiscipline, 'faith'>)}
          inputProps={{ 'aria-label': 'FX discipline' }}
          fullWidth
        >
          <MenuItem value="arcane">Arcane Magic</MenuItem>
          <MenuItem value="super-power">Super Power</MenuItem>
        </Select>
        <Select
          value={design.category}
          onChange={(event) => updateDesign({ category: event.target.value as FxAbilityCategory })}
          inputProps={{ 'aria-label': 'FX category' }}
          fullWidth
        >
          {categories.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.label}</MenuItem>)}
        </Select>
        <Select
          value={design.ability}
          onChange={(event) => updateDesign({ ability: event.target.value as FxAbilityDesign['ability'] })}
          inputProps={{ 'aria-label': 'Associated Ability' }}
          sx={{ minWidth: 140 }}
        >
          {ABILITY_IDS.map((ability) => <MenuItem key={ability} value={ability}>{ability.toUpperCase()}</MenuItem>)}
        </Select>
      </Stack>
      <TextField label="Ability Name" value={design.name} onChange={(event) => updateDesign({ name: event.target.value })} required />
      <TextField
        label="Effect Description"
        value={design.description}
        onChange={(event) => updateDesign({ description: event.target.value })}
        multiline
        minRows={4}
        required
      />
    </Stack>
  );

  const renderCharacteristics = () => (
    <Stack spacing={2}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={`${calculation.effectCost}/15 effect points`} color={calculation.effectCost <= 15 ? 'primary' : 'error'} variant="outlined" />
        <Chip label={`${calculation.quality || 'Invalid'} quality`} variant="outlined" />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
        <Select
          value={characteristicId}
          onChange={(event) => {
            setCharacteristicId(event.target.value);
            setChoiceId('');
          }}
          displayEmpty
          inputProps={{ 'aria-label': 'FX characteristic' }}
          fullWidth
        >
          <MenuItem value=""><em>Choose characteristic</em></MenuItem>
          {rules.characteristics.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.label}</MenuItem>)}
        </Select>
        <Select
          value={choiceId}
          onChange={(event) => setChoiceId(event.target.value)}
          displayEmpty
          disabled={!characteristic}
          inputProps={{ 'aria-label': 'FX characteristic value' }}
          fullWidth
        >
          <MenuItem value=""><em>Choose value</em></MenuItem>
          {(characteristic?.choices || []).map((choice) => (
            <MenuItem key={choice.id} value={choice.id}>{choice.label} ({choice.cost} SP)</MenuItem>
          ))}
        </Select>
        <TextField label="Effect Details" value={characteristicNotes} onChange={(event) => setCharacteristicNotes(event.target.value)} fullWidth />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addCharacteristic} disabled={!characteristicId || !choiceId}>Add</Button>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>Characteristic</TableCell><TableCell>Value</TableCell><TableCell>Details</TableCell><TableCell align="right">Cost</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {design.characteristics.map((selection, index) => {
              const definition = rules.characteristics.find((entry) => entry.id === selection.characteristicId);
              const choice = definition?.choices.find((entry) => entry.id === selection.choiceId);
              return (
                <TableRow key={`${selection.characteristicId}-${selection.choiceId}-${index}`}>
                  <TableCell>{definition?.label || selection.characteristicId}</TableCell>
                  <TableCell>{choice?.label || selection.choiceId}</TableCell>
                  <TableCell>{selection.notes || '-'}</TableCell>
                  <TableCell align="right">{choice?.cost ?? '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Remove ${definition?.label || selection.characteristicId}`}
                      onClick={() => updateDesign({ characteristics: design.characteristics.filter((_entry, entryIndex) => entryIndex !== index) })}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  const renderTrappings = () => design.discipline === 'arcane' ? (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Checkbox checked={Boolean(design.trappings.complexRitual)} onChange={(event) => updateTrappings({ complexRitual: event.target.checked })} />}
        label={`Complex ritual${calculation.quality ? ` (-${{ ordinary: 1, good: 2, amazing: 3 }[calculation.quality]} SP)` : ''}`}
      />
      {design.trappings.complexRitual && <TextField label="Ritual Description" value={design.trappings.ritual || ''} onChange={(event) => updateTrappings({ ritual: event.target.value })} multiline minRows={2} />}
      <TextField label="Consumed Component" value={design.trappings.component || ''} onChange={(event) => updateTrappings({ component: event.target.value })} helperText="Reduces cost by 1 SP" />
      <TextField label="Required Focus" value={design.trappings.focus || ''} onChange={(event) => updateTrappings({ focus: event.target.value })} helperText="Reduces cost by 1 SP" />
      <Alert severity="info">Word and will are always part of Arcane Magic and do not reduce its cost.</Alert>
    </Stack>
  ) : (
    <Stack spacing={2}>
      <TextField label="Limitation" value={design.trappings.limitation || ''} onChange={(event) => updateTrappings({ limitation: event.target.value })} helperText="Reduces cost by 1 SP" />
      <TextField label="Trigger" value={design.trappings.trigger || ''} onChange={(event) => updateTrappings({ trigger: event.target.value })} helperText="Reduces cost by 1 SP" />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField label="Component or Replenishment" value={design.trappings.component || ''} onChange={(event) => updateTrappings({ component: event.target.value })} fullWidth />
        <Select
          value={design.trappings.componentComplexity || 'simple'}
          onChange={(event) => updateTrappings({ componentComplexity: event.target.value as FxComplexity })}
          disabled={!design.trappings.component?.trim()}
          inputProps={{ 'aria-label': 'Component complexity' }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="simple">Simple (-1 SP)</MenuItem>
          <MenuItem value="ordinary">Ordinary complex (-1 SP)</MenuItem>
          <MenuItem value="good">Good complex (-2 SP)</MenuItem>
          <MenuItem value="amazing">Amazing complex (-3 SP)</MenuItem>
        </Select>
      </Stack>
    </Stack>
  );

  const renderReview = () => (
    <Stack spacing={2}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={`${calculation.quality || 'Invalid'} quality`} color={calculation.valid ? 'primary' : 'error'} />
        <Chip label={`${calculation.effectCost} effect points`} variant="outlined" />
        <Chip label={`-${calculation.trappingReduction} trappings`} variant="outlined" />
        <Chip label={`${calculation.purchaseCost} SP at rank 1`} color="success" variant="outlined" />
      </Stack>
      <Box>
        <Typography variant="h6">{design.name || 'Unnamed FX Ability'}</Typography>
        <Typography color="text.secondary">
          {design.discipline === 'arcane' ? 'Arcane Magic' : 'Super Power'} / {categories.find((entry) => entry.id === design.category)?.label} / {design.ability.toUpperCase()}
        </Typography>
      </Box>
      <Typography>{design.description}</Typography>
      {calculation.errors.length > 0 && <Alert severity="error">{calculation.errors.join(' ')}</Alert>}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="md">
      <DialogTitle>{editingDesign ? 'Edit FX Ability' : 'Design FX Ability'}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 2 }}>
          {STEPS.map((step) => <Step key={step}><StepLabel>{step}</StepLabel></Step>)}
        </Stepper>
        {activeStep === 0 && renderConcept()}
        {activeStep === 1 && renderCharacteristics()}
        {activeStep === 2 && renderTrappings()}
        {activeStep === 3 && renderReview()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        {activeStep > 0 && <Button onClick={() => setActiveStep((step) => step - 1)}>Back</Button>}
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={() => setActiveStep((step) => step + 1)} disabled={!canContinue}>Next</Button>
        ) : (
          <Button variant="contained" onClick={() => onSave(design)} disabled={!calculation.valid}>Save Ability</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}