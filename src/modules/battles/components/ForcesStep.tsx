import { useState } from 'react';
import {
  Box, Stack, Typography, Button, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Checkbox, Chip, IconButton, TextField, Alert, Tooltip, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { StepHeader } from '@shared/components/StepHeader';
import { ConfirmDialog } from '@shared/components';
import type { BattleRules, BattleState, Side, SideId, UnitStack } from '../types/battle';
import { THEATRE_DOMAIN } from '../types/battle';
import {
  computeForceStrength, effectiveFactor, effectiveStrength, isBattleStarted,
} from '../services/battleResolutionService';
import {
  describeEffectiveness, formatCombatStrength, getSpecializationLabel, getTheatreKindLabel,
} from '../services/battleFormatters';
import { AddUnitDialog } from './AddUnitDialog';

interface ForcesStepProps {
  state: BattleState;
  side: SideId;
  stepNumber: number;
  rules: BattleRules;
  onChange: (next: BattleState) => void;
}

export function ForcesStep({ state, side, stepNumber, rules, onChange }: ForcesStepProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const sideObj: Side = side === 'A' ? state.sideA : state.sideB;
  const battleStarted = isBattleStarted(state);
  const defaultTheatreId = state.theatres[0]?.id ?? '';

  const updateSide = (next: Side) => {
    if (side === 'A') onChange({ ...state, sideA: next });
    else onChange({ ...state, sideB: next });
  };

  const handleAdd = (stack: UnitStack) => {
    updateSide({ ...sideObj, stacks: [...sideObj.stacks, stack] });
  };

  const handleRemove = (id: string) => {
    updateSide({ ...sideObj, stacks: sideObj.stacks.filter((s) => s.id !== id) });
    setPendingRemoveId(null);
  };

  const handleClearAll = () => {
    updateSide({ ...sideObj, stacks: [] });
    setClearAllOpen(false);
  };

  const patchStack = (id: string, patch: Partial<UnitStack>) => {
    updateSide({
      ...sideObj,
      stacks: sideObj.stacks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const handleQuantityChange = (stack: UnitStack, quantity: number) => {
    const qty = Math.max(1, quantity);
    patchStack(stack.id, {
      initialQuantity: qty,
      currentStrength: stack.combatStrengthPerUnit * qty,
    });
  };

  const pendingRemoveStack = sideObj.stacks.find((s) => s.id === pendingRemoveId) ?? null;

  return (
    <Box>
      <StepHeader stepNumber={stepNumber} name={`${sideObj.name} — Forces`} isRequired />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, mt: 1 }} flexWrap="wrap" useFlexGap>
        {state.theatres.map((t) => (
          <Chip
            key={t.id}
            label={`${t.name}: ${formatCombatStrength(computeForceStrength(sideObj, t, rules))}`}
            color="primary"
            variant="outlined"
          />
        ))}
        <Chip label={`${sideObj.stacks.length} stack(s)`} variant="outlined" />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          color="warning"
          startIcon={<DeleteSweepIcon />}
          disabled={battleStarted || sideObj.stacks.length === 0}
          onClick={() => setClearAllOpen(true)}
        >
          Clear All
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={battleStarted}
          onClick={() => setDialogOpen(true)}
        >
          Add Unit Stack
        </Button>
      </Stack>

      {battleStarted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The battle is under way, so the order of battle is locked. Reset the battle on the
          Resolve step to change this side's forces.
        </Alert>
      )}

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Unit</TableCell>
              <TableCell align="right">CS / unit</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Theatre</TableCell>
              <TableCell align="right">Effective CS</TableCell>
              <TableCell align="right">Remaining CS</TableCell>
              <TableCell align="center">Priority</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sideObj.stacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  No units yet. Click <strong>Add Unit Stack</strong> to begin.
                </TableCell>
              </TableRow>
            )}
            {sideObj.stacks.map((s) => {
              const theatre = state.theatres.find((t) => t.id === s.theatreId) ?? state.theatres[0];
              const domain = theatre ? THEATRE_DOMAIN[theatre.kind] : s.domain;
              const factor = effectiveFactor(s, domain, rules);
              const startingCS = s.combatStrengthPerUnit * s.initialQuantity;
              const remainingNative = Math.max(0, s.currentStrength);
              const effective = effectiveStrength(s, domain, rules);
              const inactive = factor === null;
              const depleted = remainingNative <= 0;
              const damaged = remainingNative < startingCS && !depleted;
              return (
                <TableRow key={s.id} sx={inactive ? { opacity: 0.6 } : undefined}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{s.name}</span>
                      {s.specialization !== 'none' && (
                        <Chip
                          label={getSpecializationLabel(s.specialization)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{s.combatStrengthPerUnit.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={s.initialQuantity}
                      disabled={battleStarted}
                      onChange={(e) => handleQuantityChange(s, parseInt(e.target.value) || 1)}
                      slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={s.theatreId}
                      disabled={battleStarted}
                      onChange={(e) => patchStack(s.id, { theatreId: e.target.value })}
                      sx={{ minWidth: 190 }}
                    >
                      {state.theatres.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} ({getTheatreKindLabel(t.kind)})
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={describeEffectiveness(factor)}>
                      <Chip
                        label={inactive ? '—' : formatCombatStrength(effective)}
                        size="small"
                        color={inactive ? 'default' : 'primary'}
                        variant="outlined"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip
                      title={`${
                        s.combatStrengthPerUnit > 0
                          ? Math.floor(remainingNative / s.combatStrengthPerUnit)
                          : 0
                      } of ${s.initialQuantity} unit(s) still effective`}
                    >
                      <Chip
                        label={formatCombatStrength(remainingNative)}
                        size="small"
                        variant="outlined"
                        color={depleted ? 'error' : damaged ? 'warning' : 'success'}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Suggested tracked casualties protect priority assets until other units are exhausted.">
                      <span>
                        <Checkbox
                          checked={s.priorityAsset ?? false}
                          disabled={battleStarted}
                          onChange={(event) => patchStack(s.id, { priorityAsset: event.target.checked })}
                          inputProps={{ 'aria-label': `${s.name} priority asset` }}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="caption" color="text.secondary">{s.notes ?? ''}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      disabled={battleStarted}
                      onClick={() => setPendingRemoveId(s.id)}
                      aria-label="Remove"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <AddUnitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
        theatres={state.theatres}
        defaultTheatreId={defaultTheatreId}
        rules={rules}
      />

      <ConfirmDialog
        open={pendingRemoveStack !== null}
        title="Remove unit stack?"
        message={`Remove "${pendingRemoveStack?.name ?? ''}" from ${sideObj.name}? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={() => pendingRemoveId && handleRemove(pendingRemoveId)}
        onCancel={() => setPendingRemoveId(null)}
      />

      <ConfirmDialog
        open={clearAllOpen}
        title="Clear all forces?"
        message={`Remove all ${sideObj.stacks.length} unit stack(s) from ${sideObj.name}? This cannot be undone.`}
        confirmLabel="Clear All"
        onConfirm={handleClearAll}
        onCancel={() => setClearAllOpen(false)}
      />
    </Box>
  );
}
