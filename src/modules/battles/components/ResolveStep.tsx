import { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Paper, Chip, MenuItem, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, Alert, Divider, Tabs, Tab,
  Tooltip,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { StepHeader } from '@shared/components/StepHeader';
import { ConfirmDialog } from '@shared/components';
import type { BattleRules, BattleState, CheckResult, RoundResult, Theatre } from '../types/battle';
import { THEATRE_TACTICS_SKILL } from '../types/battle';
import {
  computeForceStrength, computeStartingForceStrength, determineRoles,
  tacticalAdvantageStep, applyRound, shouldWithdraw, resetBattle, tacticsScoreFor,
  stacksInTheatre,
} from '../services/battleResolutionService';
import { rollTacticsCheck, stepDieSize } from '../services/alternityRoll';
import {
  CHECK_RESULT_LABELS, formatCombatStrength, formatStepModifier, formatTacticsDice,
  getTheatreKindDescription, getTheatreKindLabel,
} from '../services/battleFormatters';

interface ResolveStepProps {
  state: BattleState;
  stepNumber: number;
  rules: BattleRules;
  onChange: (next: BattleState) => void;
}

export function ResolveStep({ state, stepNumber, rules, onChange }: ResolveStepProps) {
  const [activeTheatreId, setActiveTheatreId] = useState<string>(state.theatres[0]?.id ?? '');
  const [pendingResult, setPendingResult] = useState<CheckResult>('ordinary');
  const [lastRoll, setLastRoll] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const theatre: Theatre | undefined =
    state.theatres.find((t) => t.id === activeTheatreId) ?? state.theatres[0];

  const totalRounds = state.theatres.reduce((sum, t) => sum + t.rounds.length, 0);

  const sortedRounds = useMemo(
    () => (theatre ? [...theatre.rounds].reverse() : []),
    [theatre],
  );

  if (!theatre) {
    return (
      <Box>
        <StepHeader stepNumber={stepNumber} name="Resolve Battle" isRequired />
        <Alert severity="warning" sx={{ mt: 2 }}>
          This battle has no theatres. Add one on the Scenario step.
        </Alert>
      </Box>
    );
  }

  const fsA = computeForceStrength(state.sideA, theatre, rules);
  const fsB = computeForceStrength(state.sideB, theatre, rules);
  const { attacker, defender } = determineRoles(fsA, fsB);
  const atkSide = attacker === 'A' ? state.sideA : state.sideB;
  const atkFS = attacker === 'A' ? fsA : fsB;
  const defFS = defender === 'A' ? fsA : fsB;
  const stepMod = tacticalAdvantageStep(defFS, atkFS, rules);
  const ratio = atkFS > 0 ? defFS / atkFS : 0;
  const dieSize = stepDieSize(stepMod);
  const tacticsSkill = THEATRE_TACTICS_SKILL[theatre.kind];
  const attackerTactics = tacticsScoreFor(atkSide, theatre.kind);

  const aWithdraw = shouldWithdraw(state.sideA, theatre, rules);
  const bWithdraw = shouldWithdraw(state.sideB, theatre, rules);
  const theatreDecided = fsA <= 0 || fsB <= 0;
  const hasLegacyAdvantageRounds = theatre.rounds.some((r) => r.stepModifier > 0);
  const noContest =
    (fsA <= 0 && stacksInTheatre(state.sideA, theatre.id).length > 0) ||
    (fsB <= 0 && stacksInTheatre(state.sideB, theatre.id).length > 0);

  const handleRoll = () => {
    const r = rollTacticsCheck(attackerTactics, stepMod);
    setPendingResult(r.result);
    const die = r.situationDie === 0
      ? ''
      : ` ${r.step < 0 ? '-' : '+'} d${r.situationDie}(${r.situationRoll})`;
    setLastRoll(`d20(${r.d20})${die} = ${r.total} vs ${r.score} → ${CHECK_RESULT_LABELS[r.result]}`);
  };

  const handleRunRound = () => {
    const { state: next } = applyRound(state, theatre.id, pendingResult, rules);
    onChange(next);
    setLastRoll(null);
  };

  const handleReset = () => {
    onChange(resetBattle(state));
    setLastRoll(null);
    setResetOpen(false);
  };

  return (
    <Box>
      <StepHeader stepNumber={stepNumber} name="Resolve Battle" isRequired />

      {state.theatres.length > 1 && (
        <Tabs
          value={theatre.id}
          onChange={(_, v) => { setActiveTheatreId(v); setLastRoll(null); }}
          sx={{ mt: 1, borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
        >
          {state.theatres.map((t) => (
            <Tab key={t.id} value={t.id} label={`${t.name} (${t.rounds.length})`} />
          ))}
        </Tabs>
      )}

      <Alert severity="info" sx={{ mt: 2 }} icon={false}>
        <strong>{getTheatreKindLabel(theatre.kind)}</strong> — {getTheatreKindDescription(theatre.kind)}
        {' '}Resolved with Tactics–{tacticsSkill} tactics.
      </Alert>

      {hasLegacyAdvantageRounds && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          This log contains rounds resolved with the previous, reversed tactical-advantage sign.
          Reset the battle and resolve those rounds again to use the corrected bonus.
        </Alert>
      )}

      {theatreDecided && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {theatre.name} concluded — {fsA <= 0 ? state.sideB.name : state.sideA.name} holds the field.
        </Alert>
      )}
      {noContest && !aWithdraw && !bWithdraw && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          One side still has units committed here but none of them can engage in this theatre.
          They are targets rather than combatants; decide their fate yourself.
        </Alert>
      )}
      {(aWithdraw || bWithdraw) && !theatreDecided && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Withdraw threshold crossed:{' '}
          {[aWithdraw && state.sideA.name, bWithdraw && state.sideB.name].filter(Boolean).join(', ')}
          . A Gamemaster-controlled force would normally break off here.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        {(['A', 'B'] as const).map((sid) => {
          const s = sid === 'A' ? state.sideA : state.sideB;
          const fs = sid === 'A' ? fsA : fsB;
          const starting = computeStartingForceStrength(s, theatre, rules);
          const role = sid === attacker ? 'Attacker' : 'Defender';
          const lostPct = starting > 0 ? 1 - fs / starting : 0;
          return (
            <Paper key={sid} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6">{s.name}</Typography>
                <Chip label={role} size="small" color={role === 'Attacker' ? 'primary' : 'default'} variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`FS: ${formatCombatStrength(fs)}`} color="primary" variant="outlined" />
                <Chip label={`Starting: ${formatCombatStrength(starting)}`} variant="outlined" />
                <Chip
                  label={`Lost: ${(lostPct * 100).toFixed(1)}%`}
                  variant="outlined"
                  color={lostPct >= s.withdrawThreshold ? 'warning' : 'default'}
                />
                <Chip label={`Tactics: ${tacticsScoreFor(s, theatre.kind)}`} variant="outlined" />
              </Stack>
            </Paper>
          );
        })}
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
          <Chip label={`Tactical advantage (def/atk): ${ratio.toFixed(2)}`} variant="outlined" />
          <Tooltip title="The Externals prints this bracket as +5, but a positive Alternity step is a penalty. The app applies the printed magnitude as a -5 advantage bonus.">
            <Chip
              label={`Offensive advantage: ${formatStepModifier(stepMod)} (${formatTacticsDice(stepMod, dieSize)})`}
              color="success"
              variant="outlined"
            />
          </Tooltip>
          <Chip label={`Attacker: ${atkSide.name}`} color="primary" variant="outlined" />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            select
            label="Tactics check result"
            value={pendingResult}
            onChange={(e) => setPendingResult(e.target.value as CheckResult)}
            sx={{ minWidth: 220 }}
            disabled={theatreDecided}
          >
            {(Object.keys(CHECK_RESULT_LABELS) as CheckResult[]).map((k) => (
              <MenuItem key={k} value={k}>{CHECK_RESULT_LABELS[k]}</MenuItem>
            ))}
          </TextField>
          <Button startIcon={<CasinoIcon />} onClick={handleRoll} disabled={theatreDecided}>
            Roll for {atkSide.name}
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunRound}
            disabled={theatreDecided || atkFS <= 0 || defFS <= 0}
          >
            Run Round {theatre.rounds.length + 1}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="warning" onClick={() => setResetOpen(true)} disabled={totalRounds === 0}>
            Reset Battle
          </Button>
        </Stack>
        {lastRoll && (
          <Typography variant="body2" sx={{ mt: 1.5, fontFamily: 'monospace' }} color="text.secondary">
            {lastRoll}
          </Typography>
        )}
      </Paper>

      {theatre.rounds.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Battle Log — {theatre.name}</Typography>
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
                    <TableCell align="right">
                      {formatCombatStrength(r.attackerStrengthBefore)} → {formatCombatStrength(r.attackerStrengthAfter)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCombatStrength(r.defenderStrengthBefore)} → {formatCombatStrength(r.defenderStrengthAfter)}
                    </TableCell>
                    <TableCell>{formatStepModifier(r.stepModifier)}</TableCell>
                    <TableCell>{CHECK_RESULT_LABELS[r.checkResult]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <ConfirmDialog
        open={resetOpen}
        title="Reset battle?"
        message={`Discard all ${totalRounds} resolved round(s) across every theatre and restore both sides to their starting strength?`}
        confirmLabel="Reset"
        confirmColor="warning"
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </Box>
  );
}
