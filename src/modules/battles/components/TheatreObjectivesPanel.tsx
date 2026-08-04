import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { BattleRules, BattleState, Theatre } from '../types/battle';
import {
  concludeTheatre,
  evaluateVictoryCondition,
} from '../services/battleOutcomeService';

interface TheatreObjectivesPanelProps {
  state: BattleState;
  theatre: Theatre;
  rules: BattleRules;
  onChange: (next: BattleState) => void;
}

export function TheatreObjectivesPanel({
  state,
  theatre,
  rules,
  onChange,
}: TheatreObjectivesPanelProps) {
  const objectives = (state.victoryConditions || []).filter((objective) => (
    objective.theatreId === null || objective.theatreId === theatre.id
  ));

  if (objectives.length === 0) return null;

  const continueFighting = (conditionId: string) => {
    onChange({
      ...state,
      theatres: state.theatres.map((entry) => entry.id === theatre.id
        ? {
            ...entry,
            continuedObjectiveIds: [...new Set([
              ...(entry.continuedObjectiveIds || []),
              conditionId,
            ])],
          }
        : entry),
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Victory Objectives</Typography>
      <Stack spacing={1.5}>
        {objectives.map((objective) => {
          const evaluation = evaluateVictoryCondition(state, objective, rules);
          const continued = (theatre.continuedObjectiveIds || []).includes(objective.id);
          const beneficiary = objective.beneficiarySideId === 'A' ? state.sideA : state.sideB;
          const statusLabel = evaluation.achieved
            ? 'Objective achieved'
            : evaluation.currentlySatisfied
              ? 'Currently satisfied'
              : evaluation.available
                ? 'In progress'
                : 'Not available';
          const statusColor = evaluation.achieved
            ? 'success'
            : evaluation.currentlySatisfied
              ? 'info'
              : evaluation.available
                ? 'default'
                : 'warning';

          return (
            <Box key={objective.id}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'center' }}
              >
                <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
                  {objective.name}
                </Typography>
                <Chip
                  size="small"
                  label={beneficiary.name}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={statusLabel}
                  color={statusColor}
                  variant="outlined"
                />
                {continued && <Chip size="small" label="Combat continued" variant="outlined" />}
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {evaluation.detail}
                </Typography>
              </Stack>

              {evaluation.achieved && !continued && !theatre.conclusion && (
                <Alert
                  severity="success"
                  sx={{ mt: 1, '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    alignItems={{ md: 'center' }}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      <strong>Objective Achieved:</strong> {objective.name}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => onChange(concludeTheatre(
                        state,
                        theatre.id,
                        objective.beneficiarySideId,
                        'objective',
                        objective.id,
                      ))}
                    >
                      Conclude Theatre
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => continueFighting(objective.id)}
                    >
                      Continue Fighting
                    </Button>
                  </Stack>
                </Alert>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
