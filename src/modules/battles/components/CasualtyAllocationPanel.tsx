import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CasinoIcon from '@mui/icons-material/Casino';
import CheckIcon from '@mui/icons-material/Check';
import type {
  BattleRules, BattleState, PendingCasualtyAllocation, Side, SideId,
  StackCasualtyAllocation, Theatre, UnitStack,
} from '../types/battle';
import {
  casualtyEffectiveLoss,
  confirmCasualtyAllocation,
  effectiveFactor,
  stacksInTheatre,
  suggestCasualtyAllocation,
} from '../services/battleResolutionService';
import { THEATRE_DOMAIN } from '../types/battle';
import { formatCombatStrength } from '../services/battleFormatters';

interface CasualtyAllocationPanelProps {
  state: BattleState;
  theatre: Theatre;
  pending: PendingCasualtyAllocation;
  rules: BattleRules;
  onChange: (next: BattleState) => void;
}

function stackOutcome(stack: UnitStack, strengthLoss: number): string {
  const clampedLoss = Math.min(stack.currentStrength, Math.max(0, strengthLoss));
  const wholeDestroyed = stack.combatStrengthPerUnit > 0
    ? Math.floor((clampedLoss + 1e-8) / stack.combatStrengthPerUnit)
    : 0;
  const partialDamage = stack.combatStrengthPerUnit > 0
    ? clampedLoss - wholeDestroyed * stack.combatStrengthPerUnit
    : clampedLoss;
  const remaining = Math.max(0, stack.currentStrength - clampedLoss);
  const parts = [wholeDestroyed > 0 ? `${wholeDestroyed} destroyed` : null];
  if (partialDamage > 1e-6) parts.push(`${formatCombatStrength(partialDamage)} damage`);
  if (parts.every((part) => !part)) parts.push('No loss');
  return `${parts.filter(Boolean).join(' + ')}; ${formatCombatStrength(remaining)} CS remains`;
}

function allocationMap(allocations: StackCasualtyAllocation[]): Map<string, number> {
  return new Map(allocations.map((allocation) => [allocation.stackId, allocation.strengthLoss]));
}

export function CasualtyAllocationPanel({
  state,
  theatre,
  pending,
  rules,
  onChange,
}: CasualtyAllocationPanelProps) {
  const [protectPriorityAssets, setProtectPriorityAssets] = useState(true);
  const [allocations, setAllocations] = useState(pending.allocations);

  useEffect(() => {
    setAllocations(pending.allocations);
  }, [pending]);

  const sideFor = (sideId: SideId): Side => sideId === 'A' ? state.sideA : state.sideB;
  const suggest = (sideId: SideId, vary: boolean) => {
    const side = sideFor(sideId);
    const suggestion = suggestCasualtyAllocation(
      side,
      theatre,
      pending.targetEffectiveLoss[sideId],
      rules,
      protectPriorityAssets,
      vary ? Math.random : () => 0.5,
    );
    setAllocations((current) => ({ ...current, [sideId]: suggestion }));
  };
  const patchLoss = (sideId: SideId, stack: UnitStack, strengthLoss: number) => {
    const nextLoss = Math.min(stack.currentStrength, Math.max(0, strengthLoss));
    setAllocations((current) => ({
      ...current,
      [sideId]: [
        ...current[sideId].filter((allocation) => allocation.stackId !== stack.id),
        ...(nextLoss > 0 ? [{ stackId: stack.id, strengthLoss: nextLoss }] : []),
      ],
    }));
  };

  const renderSide = (sideId: SideId) => {
    const side = sideFor(sideId);
    const domain = THEATRE_DOMAIN[theatre.kind];
    const stacks = stacksInTheatre(side, theatre.id).filter((stack) => {
      const factor = effectiveFactor(stack, domain, rules);
      return factor !== null && factor > 0 && stack.currentStrength > 0;
    });
    const losses = allocationMap(allocations[sideId]);
    const allocatedEffective = casualtyEffectiveLoss(side, theatre, allocations[sideId], rules);
    const target = pending.targetEffectiveLoss[sideId];
    const difference = allocatedEffective - target;
    const withinLeeway = Math.abs(difference) <= Math.max(1, target * 0.01);
    return (
      <Paper key={sideId} variant="outlined" sx={{ p: 2, minWidth: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h6">{side.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Target loss: {formatCombatStrength(target)} effective CS
            </Typography>
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Allocated ${formatCombatStrength(allocatedEffective)}`}
              color={withinLeeway ? 'success' : 'warning'}
              variant="outlined"
            />
            <Chip
              label={`${difference >= 0 ? '+' : ''}${formatCombatStrength(difference)} difference`}
              color={withinLeeway ? 'success' : 'warning'}
              variant="outlined"
            />
          </Stack>
        </Stack>
        <Stack direction="row" gap={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<AutoFixHighIcon />} onClick={() => suggest(sideId, false)}>Suggest losses</Button>
          <Button size="small" startIcon={<CasinoIcon />} onClick={() => suggest(sideId, true)}>Vary suggestion</Button>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unit</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Current CS</TableCell>
                <TableCell align="right">Factor</TableCell>
                <TableCell align="right">Native CS lost</TableCell>
                <TableCell>Suggested result</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stacks.map((stack) => {
                const factor = effectiveFactor(stack, domain, rules) ?? 0;
                const loss = losses.get(stack.id) ?? 0;
                return (
                  <TableRow key={stack.id}>
                    <TableCell>{stack.name}</TableCell>
                    <TableCell>{stack.priorityAsset ? 'Protected' : '-'}</TableCell>
                    <TableCell align="right">{formatCombatStrength(stack.currentStrength)}</TableCell>
                    <TableCell align="right">{factor.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={loss}
                        onChange={(event) => patchLoss(sideId, stack, Number(event.target.value))}
                        inputProps={{ min: 0, max: stack.currentStrength, step: 'any', 'aria-label': `${side.name} ${stack.name} CS lost` }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>{stackOutcome(stack, loss)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'warning.main', borderWidth: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5">Allocate Round {pending.round} Losses</Typography>
          <Typography variant="body2" color="text.secondary">
            The Externals allows each side to choose specific units whose CS approximates the loss total, with a few points of leeway.
          </Typography>
        </Box>
        <Alert severity="warning">
          Review both suggestions before continuing. The next round is locked until these losses are applied.
        </Alert>
        <FormControlLabel
          control={<Checkbox checked={protectPriorityAssets} onChange={(event) => setProtectPriorityAssets(event.target.checked)} />}
          label="Protect priority assets in suggestions"
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 2 }}>
          {renderSide('A')}
          {renderSide('B')}
        </Box>
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            color="warning"
            startIcon={<CheckIcon />}
            onClick={() => onChange(confirmCasualtyAllocation(state, theatre.id, allocations, rules))}
          >
            Apply Allocated Losses
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
