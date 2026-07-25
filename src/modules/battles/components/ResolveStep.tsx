import { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Paper, Chip, MenuItem, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, Alert, Divider,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { StepHeader } from '@shared/components/StepHeader';
import type { BattleState, CheckResult, RoundResult } from '../types/battle';
import {
  computeForceStrength, determineRoles, tacticalAdvantageStep,
  applyRound, shouldWithdraw,
} from '../services/battleResolutionService';
import { rollTacticsCheck, stepDieSize } from '../services/alternityRoll';

interface ResolveStepProps {
  state: BattleState;
  stepNumber: number;
  onChange: (next: BattleState) => void;
}

const RESULT_LABELS: Record<CheckResult, string> = {
  criticalFailure: 'Critical Failure',
  failure: 'Failure',
  ordinary: 'Ordinary Success',
  good: 'Good Success',
  amazing: 'Amazing Success',
};

export function ResolveStep({ state, stepNumber, onChange }: ResolveStepProps) {
  const [pendingResult, setPendingResult] = useState<CheckResult>('ordinary');
  const [lastRoll, setLastRoll] = useState<string | null>(null);

  const fsA = computeForceStrength(state.sideA);
  const fsB = computeForceStrength(state.sideB);
  const { attacker, defender } = determineRoles(fsA, fsB);
  const atkSide = attacker === 'A' ? state.sideA : state.sideB;
  void defender;
  const atkFS = attacker === 'A' ? fsA : fsB;
  const defFS = defender === 'A' ? fsA : fsB;
  const stepMod = tacticalAdvantageStep(defFS, atkFS);
  const ratio = atkFS > 0 ? defFS / atkFS : 0;

  const aWithdraw = shouldWithdraw(state.sideA);
  const bWithdraw = shouldWithdraw(state.sideB);
  const battleOver = fsA <= 0 || fsB <= 0;

  const handleRoll = () => {
    const r = rollTacticsCheck(atkSide.tacticsScore, stepMod);
    setPendingResult(r.result);
    const die = r.situationDie === 0 ? '' : ` ${r.step >= 0 ? '+' : '-'} d${r.situationDie}(${r.situationRoll})`;
    setLastRoll(`d20(${r.d20})${die} = ${r.total} vs ${r.score} → ${RESULT_LABELS[r.result]}`);
  };

  const handleRunRound = () => {
    const { state: next } = applyRound(state, pendingResult);
    onChange(next);
    setLastRoll(null);
  };

  const handleReset = () => {
    // Reset stacks to initial strength (CS per unit × initial qty), clear rounds.
    const resetSide = (s: typeof state.sideA) => ({
      ...s,
      stacks: s.stacks.map((st) => ({ ...st, currentStrength: st.combatStrengthPerUnit * st.initialQuantity })),
      initialForceStrength: s.stacks.reduce((sum, st) => sum + st.combatStrengthPerUnit * st.initialQuantity, 0),
    });
    onChange({ ...state, sideA: resetSide(state.sideA), sideB: resetSide(state.sideB), rounds: [] });
    setLastRoll(null);
  };

  const dieSize = stepDieSize(stepMod);

  const sortedRounds = useMemo(() => [...state.rounds].reverse(), [state.rounds]);

  return (
    <Box>
      <StepHeader stepNumber={stepNumber} name="Resolve Battle" isRequired />

      {battleOver && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Battle concluded — {fsA <= 0 ? state.sideB.name : state.sideA.name} is victorious.
        </Alert>
      )}
      {(aWithdraw || bWithdraw) && !battleOver && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Withdraw threshold crossed:{' '}
          {[aWithdraw && state.sideA.name, bWithdraw && state.sideB.name].filter(Boolean).join(', ')}
          . An AI-controlled fleet would normally break off.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        {(['A', 'B'] as const).map((sid) => {
          const s = sid === 'A' ? state.sideA : state.sideB;
          const fs = sid === 'A' ? fsA : fsB;
          const role = sid === attacker ? 'Attacker' : 'Defender';
          const lostPct = s.initialForceStrength > 0 ? 1 - fs / s.initialForceStrength : 0;
          return (
            <Paper key={sid} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6">{s.name}</Typography>
                <Chip label={role} size="small" color={role === 'Attacker' ? 'primary' : 'default'} variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`FS: ${fs.toLocaleString()}`} color="primary" variant="outlined" />
                <Chip label={`Initial: ${s.initialForceStrength.toLocaleString()}`} variant="outlined" />
                <Chip label={`Lost: ${(lostPct * 100).toFixed(1)}%`} variant="outlined" color={lostPct >= s.withdrawThreshold ? 'warning' : 'default'} />
                <Chip label={`Tactics: ${s.tacticsScore}`} variant="outlined" />
              </Stack>
            </Paper>
          );
        })}
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
          <Chip label={`Ratio (def/atk): ${ratio.toFixed(2)}`} variant="outlined" />
          <Chip label={`Step modifier: +${stepMod} (${dieSize ? `d20 + d${dieSize}` : 'd20'})`} color="warning" variant="outlined" />
          <Chip label={`Attacker: ${atkSide.name}`} color="primary" variant="outlined" />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            select
            label="Tactics check result"
            value={pendingResult}
            onChange={(e) => setPendingResult(e.target.value as CheckResult)}
            sx={{ minWidth: 220 }}
            disabled={battleOver}
          >
            {(Object.keys(RESULT_LABELS) as CheckResult[]).map((k) => (
              <MenuItem key={k} value={k}>{RESULT_LABELS[k]}</MenuItem>
            ))}
          </TextField>
          <Button startIcon={<CasinoIcon />} onClick={handleRoll} disabled={battleOver}>
            Roll for {atkSide.name}
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunRound}
            disabled={battleOver || atkFS <= 0 || defFS <= 0}
          >
            Run Round {state.rounds.length + 1}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="warning" onClick={handleReset} disabled={state.rounds.length === 0}>
            Reset Battle
          </Button>
        </Stack>
        {lastRoll && (
          <Typography variant="body2" sx={{ mt: 1.5, fontFamily: 'monospace' }} color="text.secondary">
            {lastRoll}
          </Typography>
        )}
      </Paper>

      {state.rounds.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Battle Log</Typography>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Attacker</TableCell>
                  <TableCell>Defender</TableCell>
                  <TableCell align="right">Atk FS (before → after)</TableCell>
                  <TableCell align="right">Def FS (before → after)</TableCell>
                  <TableCell>Step</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRounds.map((r: RoundResult) => (
                  <TableRow key={r.round}>
                    <TableCell>{r.round}</TableCell>
                    <TableCell>{r.attackerSide === 'A' ? state.sideA.name : state.sideB.name}</TableCell>
                    <TableCell>{r.defenderSide === 'A' ? state.sideA.name : state.sideB.name}</TableCell>
                    <TableCell align="right">{r.attackerStrengthBefore.toFixed(0)} → {r.attackerStrengthAfter.toFixed(0)}</TableCell>
                    <TableCell align="right">{r.defenderStrengthBefore.toFixed(0)} → {r.defenderStrengthAfter.toFixed(0)}</TableCell>
                    <TableCell>+{r.stepModifier}</TableCell>
                    <TableCell>{RESULT_LABELS[r.checkResult]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
