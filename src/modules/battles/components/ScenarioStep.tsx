import { useState } from 'react';
import {
  Stack, TextField, Box, Paper, Typography, Button, IconButton, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Alert, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { StepHeader } from '@shared/components/StepHeader';
import { ConfirmDialog } from '@shared/components';
import type { BattleState, Side, SideId, TheatreKind } from '../types/battle';
import { createTheatre } from '../constants/battleDefaults';
import { getTheatreKindDescription, getTheatreKindLabel } from '../services/battleFormatters';
import { isBattleStarted } from '../services/battleResolutionService';

interface ScenarioStepProps {
  state: BattleState;
  onChange: (next: BattleState) => void;
}

const THEATRE_KINDS: TheatreKind[] = ['space', 'bombardment', 'ground'];

export function ScenarioStep({ state, onChange }: ScenarioStepProps) {
  const [newTheatreKind, setNewTheatreKind] = useState<TheatreKind>('ground');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const battleStarted = isBattleStarted(state);

  const updateSide = (id: SideId, patch: Partial<Side>) => {
    if (id === 'A') onChange({ ...state, sideA: { ...state.sideA, ...patch } });
    else onChange({ ...state, sideB: { ...state.sideB, ...patch } });
  };

  const handleAddTheatre = () => {
    onChange({ ...state, theatres: [...state.theatres, createTheatre(newTheatreKind)] });
  };

  const handleRenameTheatre = (id: string, name: string) => {
    onChange({
      ...state,
      theatres: state.theatres.map((t) => (t.id === id ? { ...t, name } : t)),
    });
  };

  const handleRemoveTheatre = (id: string) => {
    const remaining = state.theatres.filter((t) => t.id !== id);
    if (remaining.length === 0) return;
    const fallbackId = remaining[0].id;
    const reassign = (side: Side): Side => ({
      ...side,
      stacks: side.stacks.map((s) => (s.theatreId === id ? { ...s, theatreId: fallbackId } : s)),
    });
    onChange({
      ...state,
      theatres: remaining,
      sideA: reassign(state.sideA),
      sideB: reassign(state.sideB),
    });
    setPendingRemoveId(null);
  };

  const stacksInTheatre = (theatreId: string) =>
    state.sideA.stacks.filter((s) => s.theatreId === theatreId).length +
    state.sideB.stacks.filter((s) => s.theatreId === theatreId).length;

  const pendingRemoveTheatre = state.theatres.find((t) => t.id === pendingRemoveId) ?? null;

  const renderSide = (side: Side) => (
    <Paper variant="outlined" sx={{ p: 2 }} key={side.id}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Side {side.id}</Typography>
      <Stack spacing={2}>
        <TextField
          label="Name"
          value={side.name}
          onChange={(e) => updateSide(side.id, { name: e.target.value })}
          fullWidth
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="Tactics–space tactics"
            type="number"
            value={side.tacticsSpaceScore}
            onChange={(e) => updateSide(side.id, { tacticsSpaceScore: Math.max(0, parseInt(e.target.value) || 0) })}
            slotProps={{ htmlInput: { min: 0, max: 30 } }}
            fullWidth
          />
          <TextField
            label="Tactics–ground tactics"
            type="number"
            value={side.tacticsGroundScore}
            onChange={(e) => updateSide(side.id, { tacticsGroundScore: Math.max(0, parseInt(e.target.value) || 0) })}
            slotProps={{ htmlInput: { min: 0, max: 30 } }}
            fullWidth
          />
        </Stack>
        <TextField
          label="Withdraws after losing (%)"
          type="number"
          value={Math.round(side.withdrawThreshold * 100)}
          onChange={(e) =>
            updateSide(side.id, {
              withdrawThreshold: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100,
            })
          }
          slotProps={{ htmlInput: { min: 0, max: 100 } }}
          helperText="Human fleets normally break off at 40%, Externals at 60%."
          fullWidth
        />
      </Stack>
    </Paper>
  );

  return (
    <Box>
      <StepHeader stepNumber={1} name="Scenario" isRequired />

      <Stack spacing={3} sx={{ mt: 2 }}>
        <TextField
          label="Scenario name"
          value={state.scenarioName}
          onChange={(e) => onChange({ ...state, scenarioName: e.target.value })}
          sx={{ maxWidth: 600 }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {renderSide(state.sideA)}
          {renderSide(state.sideB)}
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Theatres</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A battle can span several simultaneous engagements. Allocate each unit stack to a
            theatre on the Forces steps; every theatre is then resolved separately.
          </Typography>

          {battleStarted && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Rounds have already been resolved, so theatres are locked. Reset the battle on the
              Resolve step to change them.
            </Alert>
          )}

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Stacks</TableCell>
                  <TableCell align="right">Rounds</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.theatres.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={t.name}
                        onChange={(e) => handleRenameTheatre(t.id, e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getTheatreKindDescription(t.kind)}>
                        <Chip label={getTheatreKindLabel(t.kind)} size="small" variant="outlined" />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{stacksInTheatre(t.id)}</TableCell>
                    <TableCell align="right">{t.rounds.length}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label="Remove theatre"
                        disabled={battleStarted || state.theatres.length <= 1}
                        onClick={() => setPendingRemoveId(t.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <TextField
              select
              label="Theatre type"
              size="small"
              value={newTheatreKind}
              onChange={(e) => setNewTheatreKind(e.target.value as TheatreKind)}
              sx={{ minWidth: 240 }}
              disabled={battleStarted}
            >
              {THEATRE_KINDS.map((k) => (
                <MenuItem key={k} value={k}>{getTheatreKindLabel(k)}</MenuItem>
              ))}
            </TextField>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={handleAddTheatre}
              disabled={battleStarted}
            >
              Add Theatre
            </Button>
            <Typography variant="caption" color="text.secondary">
              {getTheatreKindDescription(newTheatreKind)}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={pendingRemoveTheatre !== null}
        title="Remove theatre?"
        message={
          `Remove "${pendingRemoveTheatre?.name ?? ''}"? Any units committed to it will be moved to ` +
          `"${state.theatres.find((t) => t.id !== pendingRemoveId)?.name ?? ''}".`
        }
        confirmLabel="Remove"
        onConfirm={() => pendingRemoveId && handleRemoveTheatre(pendingRemoveId)}
        onCancel={() => setPendingRemoveId(null)}
      />
    </Box>
  );
}
