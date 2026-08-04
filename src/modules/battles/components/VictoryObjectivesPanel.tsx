import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type {
  BattleRules,
  BattleState,
  BattleUnitCategory,
  SideId,
  UnitStack,
  VictoryCondition,
  VictoryConditionKind,
} from '../types/battle';
import {
  createVictoryCondition,
  evaluateVictoryCondition,
  VICTORY_CONDITION_LABELS,
} from '../services/battleOutcomeService';
import {
  getUnitCategoryLabel,
  GROUND_CATEGORY_ORDER,
  SPACE_CATEGORY_ORDER,
} from '../services/battleFormatters';

interface VictoryObjectivesPanelProps {
  state: BattleState;
  rules: BattleRules;
  onChange: (next: BattleState) => void;
}

const CONDITION_KINDS = Object.keys(VICTORY_CONDITION_LABELS) as VictoryConditionKind[];
const ALL_CATEGORIES: BattleUnitCategory[] = [
  ...SPACE_CATEGORY_ORDER,
  'systemDefense',
  ...GROUND_CATEGORY_ORDER,
  'custom',
];

function sideName(state: BattleState, sideId: SideId): string {
  return sideId === 'A' ? state.sideA.name : state.sideB.name;
}

function selectableStacks(state: BattleState, objective: VictoryCondition): UnitStack[] {
  const sideId = objective.kind === 'preserveStacks'
    ? objective.beneficiarySideId
    : objective.targetSideId;
  const side = sideId === 'A' ? state.sideA : state.sideB;
  return side.stacks.filter((stack) => (
    objective.theatreId === null || stack.theatreId === objective.theatreId
  ));
}

export function VictoryObjectivesPanel({ state, rules, onChange }: VictoryObjectivesPanelProps) {
  const objectives = state.victoryConditions || [];

  const setObjectives = (next: VictoryCondition[]) => {
    onChange({ ...state, victoryConditions: next });
  };

  const updateObjective = (id: string, patch: Partial<VictoryCondition>) => {
    setObjectives(objectives.map((objective) => (
      objective.id === id ? { ...objective, ...patch } : objective
    )));
  };

  const addObjective = (beneficiarySideId: SideId) => {
    setObjectives([
      ...objectives,
      createVictoryCondition(beneficiarySideId, state.theatres[0]?.id ?? null),
    ]);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">Victory Objectives</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {(['A', 'B'] as const).map((sideId) => (
            <Button
              key={sideId}
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => addObjective(sideId)}
            >
              Add for {sideName(state, sideId)}
            </Button>
          ))}
        </Stack>
      </Stack>

      {objectives.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No scenario-specific victory objectives.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {objectives.map((objective) => {
            const evaluation = evaluateVictoryCondition(state, objective, rules);
            const stackOptions = selectableStacks(state, objective);
            const usesCategories = objective.kind === 'categoriesDestroyed'
              || objective.kind === 'categoryStrengthBelow';
            const usesStacks = objective.kind === 'stacksDestroyed'
              || objective.kind === 'preserveStacks';
            const statusLabel = evaluation.achieved
              ? 'Objective achieved'
              : evaluation.currentlySatisfied
                ? 'Currently satisfied'
                : evaluation.available
                  ? 'In progress'
                  : 'Needs matching forces';
            const statusColor = evaluation.achieved
              ? 'success'
              : evaluation.currentlySatisfied
                ? 'info'
                : evaluation.available
                  ? 'default'
                  : 'warning';

            return (
              <Paper key={objective.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr))' },
                      gap: 2,
                      flexGrow: 1,
                      minWidth: 0,
                    }}
                  >
                    <TextField
                      label="Objective name"
                      size="small"
                      value={objective.name}
                      onChange={(event) => updateObjective(objective.id, { name: event.target.value })}
                    />
                    <TextField
                      select
                      label="Achieved by"
                      size="small"
                      value={objective.beneficiarySideId}
                      onChange={(event) => {
                        const beneficiarySideId = event.target.value as SideId;
                        updateObjective(objective.id, {
                          beneficiarySideId,
                          targetSideId: beneficiarySideId === 'A' ? 'B' : 'A',
                          stackIds: [],
                        });
                      }}
                    >
                      <MenuItem value="A">{state.sideA.name}</MenuItem>
                      <MenuItem value="B">{state.sideB.name}</MenuItem>
                    </TextField>
                    <TextField
                      select
                      label="Scope"
                      size="small"
                      value={objective.theatreId ?? 'all'}
                      onChange={(event) => updateObjective(objective.id, {
                        theatreId: event.target.value === 'all' ? null : event.target.value,
                        stackIds: [],
                      })}
                    >
                      <MenuItem value="all">Whole battle</MenuItem>
                      {state.theatres.map((theatre) => (
                        <MenuItem key={theatre.id} value={theatre.id}>{theatre.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Condition"
                      size="small"
                      value={objective.kind}
                      onChange={(event) => {
                        const kind = event.target.value as VictoryConditionKind;
                        const oldDefaultName = VICTORY_CONDITION_LABELS[objective.kind];
                        updateObjective(objective.id, {
                          kind,
                          name: objective.name === oldDefaultName
                            ? VICTORY_CONDITION_LABELS[kind]
                            : objective.name,
                        });
                      }}
                    >
                      {CONDITION_KINDS.map((kind) => (
                        <MenuItem key={kind} value={kind}>{VICTORY_CONDITION_LABELS[kind]}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Tooltip title="Remove objective">
                    <IconButton
                      aria-label={`Remove ${objective.name}`}
                      size="small"
                      onClick={() => setObjectives(objectives.filter((item) => item.id !== objective.id))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {usesCategories && (
                  <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                    <InputLabel id={`${objective.id}-categories-label`}>Categories</InputLabel>
                    <Select
                      labelId={`${objective.id}-categories-label`}
                      multiple
                      value={objective.categories}
                      onChange={(event) => updateObjective(objective.id, {
                        categories: event.target.value as BattleUnitCategory[],
                      })}
                      input={<OutlinedInput label="Categories" />}
                      renderValue={(selected) => selected.map(getUnitCategoryLabel).join(', ')}
                    >
                      {ALL_CATEGORIES.map((category) => (
                        <MenuItem key={category} value={category}>
                          <Checkbox checked={objective.categories.includes(category)} />
                          <ListItemText primary={getUnitCategoryLabel(category)} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {usesStacks && (
                  <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                    <InputLabel id={`${objective.id}-stacks-label`}>Named units</InputLabel>
                    <Select
                      labelId={`${objective.id}-stacks-label`}
                      multiple
                      value={objective.stackIds}
                      onChange={(event) => updateObjective(objective.id, {
                        stackIds: event.target.value as string[],
                      })}
                      input={<OutlinedInput label="Named units" />}
                      renderValue={(selected) => selected
                        .map((id) => stackOptions.find((stack) => stack.id === id)?.name ?? id)
                        .join(', ')}
                    >
                      {stackOptions.map((stack) => (
                        <MenuItem key={stack.id} value={stack.id}>
                          <Checkbox checked={objective.stackIds.includes(stack.id)} />
                          <ListItemText
                            primary={stack.name}
                            secondary={`${getUnitCategoryLabel(stack.category)} · ${sideName(state, objective.kind === 'preserveStacks' ? objective.beneficiarySideId : objective.targetSideId)}`}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {objective.kind === 'categoryStrengthBelow' && (
                  <TextField
                    label="Maximum remaining strength (%)"
                    type="number"
                    size="small"
                    value={Math.round(objective.thresholdPct * 100)}
                    onChange={(event) => updateObjective(objective.id, {
                      thresholdPct: Math.max(0, Math.min(100, Number(event.target.value) || 0)) / 100,
                    })}
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    sx={{ mt: 2, width: 280 }}
                  />
                )}

                {objective.kind === 'preserveStacks' && (
                  <TextField
                    label="Minimum surviving quantity"
                    type="number"
                    size="small"
                    value={objective.minimumSurvivingQuantity}
                    onChange={(event) => updateObjective(objective.id, {
                      minimumSurvivingQuantity: Math.max(1, Math.trunc(Number(event.target.value) || 1)),
                    })}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ mt: 2, width: 280 }}
                  />
                )}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  sx={{ mt: 2 }}
                >
                  <Chip label={statusLabel} size="small" color={statusColor} variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    {evaluation.detail}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
