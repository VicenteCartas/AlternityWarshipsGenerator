import { Stack, TextField, Box } from '@mui/material';
import { StepHeader } from '@shared/components/StepHeader';
import type { BattleState } from '../types/battle';

interface ScenarioStepProps {
  state: BattleState;
  onChange: (next: BattleState) => void;
}

export function ScenarioStep({ state, onChange }: ScenarioStepProps) {
  return (
    <Box>
      <StepHeader stepNumber={1} name="Scenario" isRequired />
      <Stack spacing={2} sx={{ maxWidth: 600, mt: 2 }}>
        <TextField
          label="Scenario name"
          value={state.scenarioName}
          onChange={(e) => onChange({ ...state, scenarioName: e.target.value })}
          fullWidth
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="Side A name"
            value={state.sideA.name}
            onChange={(e) => onChange({ ...state, sideA: { ...state.sideA, name: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Tactics (Space) score"
            type="number"
            value={state.sideA.tacticsScore}
            onChange={(e) => onChange({ ...state, sideA: { ...state.sideA, tacticsScore: Math.max(0, parseInt(e.target.value) || 0) } })}
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, max: 24 } }}
          />
          <TextField
            label="Withdraw at % loss"
            type="number"
            value={Math.round(state.sideA.withdrawThreshold * 100)}
            onChange={(e) => onChange({ ...state, sideA: { ...state.sideA, withdrawThreshold: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 } })}
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, max: 100 } }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Side B name"
            value={state.sideB.name}
            onChange={(e) => onChange({ ...state, sideB: { ...state.sideB, name: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Tactics (Space) score"
            type="number"
            value={state.sideB.tacticsScore}
            onChange={(e) => onChange({ ...state, sideB: { ...state.sideB, tacticsScore: Math.max(0, parseInt(e.target.value) || 0) } })}
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, max: 24 } }}
          />
          <TextField
            label="Withdraw at % loss"
            type="number"
            value={Math.round(state.sideB.withdrawThreshold * 100)}
            onChange={(e) => onChange({ ...state, sideB: { ...state.sideB, withdrawThreshold: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 } })}
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, max: 100 } }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
