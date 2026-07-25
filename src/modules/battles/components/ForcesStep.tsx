import { useState } from 'react';
import {
  Box, Stack, Typography, Button, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { StepHeader } from '@shared/components/StepHeader';
import type { BattleState, Side, SideId, UnitStack } from '../types/battle';
import { computeForceStrength } from '../services/battleResolutionService';
import { AddUnitDialog } from './AddUnitDialog';

interface ForcesStepProps {
  state: BattleState;
  side: SideId;
  stepNumber: number;
  onChange: (next: BattleState) => void;
}

export function ForcesStep({ state, side, stepNumber, onChange }: ForcesStepProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sideObj: Side = side === 'A' ? state.sideA : state.sideB;
  const fs = computeForceStrength(sideObj);

  const updateSide = (next: Side) => {
    // Keep initialForceStrength in sync with current totals while still editing.
    const updated: Side = { ...next, initialForceStrength: computeForceStrength(next) };
    if (side === 'A') onChange({ ...state, sideA: updated });
    else onChange({ ...state, sideB: updated });
  };

  const handleAdd = (stack: UnitStack) => {
    updateSide({ ...sideObj, stacks: [...sideObj.stacks, stack] });
  };

  const handleRemove = (id: string) => {
    updateSide({ ...sideObj, stacks: sideObj.stacks.filter((s) => s.id !== id) });
  };

  return (
    <Box>
      <StepHeader stepNumber={stepNumber} name={`${sideObj.name} — Forces`} isRequired />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, mt: 1 }}>
        <Chip label={`Total Force Strength: ${fs.toLocaleString()}`} color="primary" variant="outlined" />
        <Chip label={`${sideObj.stacks.length} stack(s)`} variant="outlined" />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Unit Stack
        </Button>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Unit</TableCell>
              <TableCell align="right">CS / unit</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Total CS</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sideObj.stacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  No units yet. Click <strong>Add Unit Stack</strong> to begin.
                </TableCell>
              </TableRow>
            )}
            {sideObj.stacks.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell align="right">{s.combatStrengthPerUnit}</TableCell>
                <TableCell align="right">{s.initialQuantity}</TableCell>
                <TableCell align="right">
                  <Chip label={(s.combatStrengthPerUnit * s.initialQuantity).toLocaleString()} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{s.notes ?? ''}</Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRemove(s.id)} aria-label="Remove">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <AddUnitDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAdd} />
    </Box>
  );
}
