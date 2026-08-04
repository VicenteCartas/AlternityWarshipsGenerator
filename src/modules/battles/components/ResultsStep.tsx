import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { StepHeader } from '@shared/components/StepHeader';
import type { BattleRules, BattleState, SideId } from '../types/battle';
import {
  summarizeBattleResults,
  type ObjectiveResultStatus,
  type SideTheatreResult,
  type TheatreResultSummary,
} from '../services/battleResultsService';
import { formatCombatStrength, getUnitCategoryLabel } from '../services/battleFormatters';

interface ResultsStepProps {
  state: BattleState;
  stepNumber: number;
  rules: BattleRules;
}

const OBJECTIVE_STATUS_LABELS: Record<ObjectiveResultStatus, string> = {
  achieved: 'Achieved',
  failed: 'Failed',
  satisfied: 'Currently satisfied',
  inProgress: 'In progress',
  unavailable: 'Not available',
};

function objectiveColor(status: ObjectiveResultStatus): 'success' | 'error' | 'info' | 'default' | 'warning' {
  if (status === 'achieved') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'satisfied') return 'info';
  if (status === 'unavailable') return 'warning';
  return 'default';
}

function casualtyCount(value: number | null): string {
  return value === null ? 'Unallocated' : String(value);
}

function sideName(state: BattleState, sideId: SideId): string {
  return sideId === 'A' ? state.sideA.name : state.sideB.name;
}

function outcomeLabel(state: BattleState, result: TheatreResultSummary): string {
  if (result.winnerSideId) {
    const suffix = result.status === 'forcesEliminated' ? ' (forces eliminated)' : '';
    return `Winner: ${sideName(state, result.winnerSideId)}${suffix}`;
  }
  if (result.status === 'concluded') return 'Concluded without a winner';
  if (result.status === 'forcesEliminated') return 'Both forces eliminated';
  return 'Unresolved';
}

function SideResults({
  state,
  result,
  casualtiesAllocated,
}: {
  state: BattleState;
  result: SideTheatreResult;
  casualtiesAllocated: boolean;
}) {
  const side = result.sideId === 'A' ? state.sideA : state.sideB;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography variant="h6">{side.name}</Typography>
        <Chip
          size="small"
          variant="outlined"
          color="primary"
          label={`FS ${formatCombatStrength(result.startingForceStrength)} → ${formatCombatStrength(result.remainingForceStrength)}`}
        />
        <Chip
          size="small"
          variant="outlined"
          color={result.shouldWithdraw ? 'warning' : 'default'}
          label={`${(result.lossFraction * 100).toFixed(1)}% lost`}
        />
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>By Category</Typography>
      <Paper variant="outlined" sx={{ overflowX: 'auto', mb: 2 }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Starting</TableCell>
              <TableCell align="right">Surviving</TableCell>
              <TableCell align="right">Damaged</TableCell>
              <TableCell align="right">Destroyed</TableCell>
              <TableCell align="right">Starting CS</TableCell>
              <TableCell align="right">Remaining CS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.categories.map((category) => (
              <TableRow key={category.category}>
                <TableCell>{getUnitCategoryLabel(category.category)}</TableCell>
                <TableCell align="right">{category.initialQuantity}</TableCell>
                <TableCell align="right">{casualtyCount(category.survivingQuantity)}</TableCell>
                <TableCell align="right">{casualtyCount(category.damagedQuantity)}</TableCell>
                <TableCell align="right">{casualtyCount(category.destroyedQuantity)}</TableCell>
                <TableCell align="right">{formatCombatStrength(category.startingStrength)}</TableCell>
                <TableCell align="right">{formatCombatStrength(category.remainingStrength)}</TableCell>
              </TableRow>
            ))}
            {result.categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No units committed.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>By Unit Stack</Typography>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Unit</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Starting</TableCell>
              <TableCell align="right">Surviving</TableCell>
              <TableCell align="right">Damaged</TableCell>
              <TableCell align="right">Destroyed</TableCell>
              <TableCell align="right">Starting CS</TableCell>
              <TableCell align="right">Remaining CS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.stacks.map((stack) => (
              <TableRow key={stack.stackId}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{stack.name}</span>
                    {stack.priorityAsset && <Chip size="small" label="Priority" color="warning" variant="outlined" />}
                  </Stack>
                </TableCell>
                <TableCell>{getUnitCategoryLabel(stack.category)}</TableCell>
                <TableCell align="right">{stack.initialQuantity}</TableCell>
                <TableCell align="right">{casualtyCount(stack.survivingQuantity)}</TableCell>
                <TableCell align="right">{casualtyCount(stack.damagedQuantity)}</TableCell>
                <TableCell align="right">{casualtyCount(stack.destroyedQuantity)}</TableCell>
                <TableCell align="right">{formatCombatStrength(stack.startingStrength)}</TableCell>
                <TableCell align="right">{formatCombatStrength(stack.remainingStrength)}</TableCell>
              </TableRow>
            ))}
            {result.stacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">No units committed.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {!casualtiesAllocated && result.stacks.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Specific casualties unallocated; remaining CS is the abstract proportional total.
        </Typography>
      )}
    </Box>
  );
}

export function ResultsStep({ state, stepNumber, rules }: ResultsStepProps) {
  const summary = summarizeBattleResults(state, rules);
  const [activeTheatreId, setActiveTheatreId] = useState(state.theatres[0]?.id ?? '');
  const result = summary.theatres.find((entry) => entry.theatre.id === activeTheatreId)
    ?? summary.theatres[0];

  if (!result) {
    return (
      <Box>
        <StepHeader stepNumber={stepNumber} name="Results" />
        <Alert severity="warning" sx={{ mt: 2 }}>No theatres are available.</Alert>
      </Box>
    );
  }

  const withdrawingSides = [
    result.sideA.shouldWithdraw ? state.sideA : null,
    result.sideB.shouldWithdraw ? state.sideB : null,
  ].filter((side): side is BattleState['sideA'] => side !== null);

  return (
    <Box>
      <StepHeader stepNumber={stepNumber} name="Results" />

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{summary.overallLabel}</Typography>
          <Chip label={`${summary.winsBySide.A} ${state.sideA.name} win(s)`} color="primary" variant="outlined" />
          <Chip label={`${summary.winsBySide.B} ${state.sideB.name} win(s)`} color="primary" variant="outlined" />
          <Chip
            label={`${summary.unresolvedTheatres} unresolved`}
            color={summary.unresolvedTheatres > 0 ? 'warning' : 'success'}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {summary.casualtiesPending && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Results are provisional: specific casualty allocations are still awaiting confirmation.
        </Alert>
      )}
      {!summary.casualtiesAllocated && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Specific casualties unallocated. This engagement used abstract totals, so survivor,
          damaged, and destroyed unit counts are intentionally not assigned.
        </Alert>
      )}

      {summary.objectiveResults.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>All Objectives</Typography>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Objective</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.objectiveResults.map((objective) => (
                  <TableRow key={objective.condition.id}>
                    <TableCell>{objective.condition.name}</TableCell>
                    <TableCell>{sideName(state, objective.condition.beneficiarySideId)}</TableCell>
                    <TableCell>
                      {objective.condition.theatreId === null
                        ? 'Whole battle'
                        : state.theatres.find((theatre) => theatre.id === objective.condition.theatreId)?.name ?? 'Missing theatre'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={objectiveColor(objective.status)}
                        label={OBJECTIVE_STATUS_LABELS[objective.status]}
                      />
                    </TableCell>
                    <TableCell>{objective.evaluation.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {state.theatres.length > 1 && (
        <Tabs
          value={result.theatre.id}
          onChange={(_, value) => setActiveTheatreId(value)}
          variant="scrollable"
          sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {summary.theatres.map((entry) => (
            <Tab key={entry.theatre.id} value={entry.theatre.id} label={entry.theatre.name} />
          ))}
        </Tabs>
      )}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        <Typography variant="h5">{result.theatre.name}</Typography>
        <Chip
          label={outcomeLabel(state, result)}
          color={result.winnerSideId ? 'success' : result.status === 'unresolved' ? 'warning' : 'default'}
          variant="outlined"
        />
        <Chip label={`${result.theatre.rounds.length} round(s)`} variant="outlined" />
        {result.casualtiesPending && <Chip label="Casualties pending" color="error" variant="outlined" />}
      </Stack>

      {withdrawingSides.map((side) => (
        <Alert
          key={side.id}
          severity="warning"
          sx={{ mt: 2, border: 2, borderColor: 'warning.main' }}
        >
          <Typography variant="h6" component="div">{side.name.toUpperCase()} SHOULD WITHDRAW</Typography>
          <Typography variant="body2">The configured loss threshold has been crossed in {result.theatre.name}.</Typography>
        </Alert>
      ))}

      {result.objectives.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          {result.objectives.map((objective) => (
            <Chip
              key={objective.condition.id}
              label={`${objective.condition.name}: ${OBJECTIVE_STATUS_LABELS[objective.status]}`}
              color={objectiveColor(objective.status)}
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gap: 3,
          mt: 3,
        }}
      >
        <SideResults state={state} result={result.sideA} casualtiesAllocated={summary.casualtiesAllocated} />
        <SideResults state={state} result={result.sideB} casualtiesAllocated={summary.casualtiesAllocated} />
      </Box>
    </Box>
  );
}
