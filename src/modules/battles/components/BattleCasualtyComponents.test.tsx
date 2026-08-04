import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import rulesJson from '../data/battleRules.json';
import type {
  BattleRules,
  BattleState,
  PendingCasualtyAllocation,
  RoundResult,
  UnitStack,
} from '../types/battle';
import { CasualtyAllocationPanel } from './CasualtyAllocationPanel';
import { ForcesStep } from './ForcesStep';
import { ResolveStep } from './ResolveStep';
import { ScenarioStep } from './ScenarioStep';

const rules = rulesJson as BattleRules;

function stack(id: string, name: string, currentStrength = 100): UnitStack {
  return {
    id,
    name,
    combatStrengthPerUnit: 100,
    initialQuantity: 1,
    currentStrength,
    category: 'escort',
    domain: 'space',
    crossDomainFactor: null,
    specialization: 'none',
    theatreId: 'orbit',
    source: 'custom',
  };
}

function pending(): PendingCasualtyAllocation {
  return {
    theatreId: 'orbit',
    round: 1,
    targetEffectiveLoss: { A: 50, B: 50 },
    allocations: {
      A: [{ stackId: 'a-1', strengthLoss: 50 }],
      B: [{ stackId: 'b-1', strengthLoss: 50 }],
    },
  };
}

function round(): RoundResult {
  return {
    round: 1,
    attackerSide: 'A',
    defenderSide: 'B',
    attackerStrengthBefore: 100,
    defenderStrengthBefore: 100,
    ratio: 1,
    stepModifier: -1,
    checkResult: 'ordinary',
    attackerLossPct: 0.15,
    defenderLossPct: 0.15,
    attackerStrengthAfter: 85,
    defenderStrengthAfter: 85,
  };
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  return {
    scenarioName: 'Casualty Test',
    casualtyMode: 'abstract',
    sideA: {
      id: 'A', name: 'Alliance', tacticsSpaceScore: 12, tacticsGroundScore: 12,
      withdrawThreshold: 0.4, stacks: [stack('a-1', 'Alliance Escort')],
    },
    sideB: {
      id: 'B', name: 'Exeat', tacticsSpaceScore: 12, tacticsGroundScore: 12,
      withdrawThreshold: 0.4, stacks: [stack('b-1', 'Exeat Escort')],
    },
    theatres: [{ id: 'orbit', name: 'High Orbit', kind: 'space', rounds: [] }],
    pendingCasualties: [],
    victoryConditions: [],
    ...overrides,
  };
}

function renderWithTheme(node: React.ReactNode) {
  return render(<ThemeProvider theme={createTheme()}>{node}</ThemeProvider>);
}

describe('tracked casualty setup', () => {
  it('selects tracked casualties from Scenario', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<ScenarioStep state={battle()} rules={rules} onChange={onChange} />);

    await user.click(screen.getByLabelText('Casualty tracking'));
    await user.click(screen.getByRole('option', { name: 'Track specific units' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      casualtyMode: 'tracked',
      pendingCasualties: [],
    }));
  });

  it('marks an individual stack as a priority asset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <ForcesStep state={battle()} side="A" stepNumber={2} rules={rules} onChange={onChange} />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Alliance Escort priority asset' }));

    const next = onChange.mock.calls[0][0] as BattleState;
    expect(next.sideA.stacks[0].priorityAsset).toBe(true);
  });
});

describe('tracked casualty resolution', () => {
  it('applies edited allocations to specific stacks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const allocation = pending();
    const state = battle({ casualtyMode: 'tracked', pendingCasualties: [allocation] });
    renderWithTheme(
      <CasualtyAllocationPanel
        state={state}
        theatre={state.theatres[0]}
        pending={allocation}
        rules={rules}
        onChange={onChange}
      />,
    );

    const allianceLoss = screen.getByRole('spinbutton', { name: 'Alliance Alliance Escort CS lost' });
    await user.clear(allianceLoss);
    await user.type(allianceLoss, '100');
    await user.click(screen.getByRole('button', { name: 'Apply Allocated Losses' }));

    const next = onChange.mock.calls[0][0] as BattleState;
    expect(next.sideA.stacks[0].currentStrength).toBe(0);
    expect(next.sideB.stacks[0].currentStrength).toBe(50);
    expect(next.pendingCasualties).toEqual([]);
  });

  it('locks the next round and shows a prominent withdrawal heading while allocation is pending', () => {
    const allocation = pending();
    const state = battle({
      casualtyMode: 'tracked',
      sideB: {
        ...battle().sideB,
        stacks: [stack('b-1', 'Exeat Escort', 50)],
      },
      theatres: [{ id: 'orbit', name: 'High Orbit', kind: 'space', rounds: [round()] }],
      pendingCasualties: [allocation],
    });
    renderWithTheme(
      <ResolveStep state={state} stepNumber={4} rules={rules} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Run Round 2' })).toBeDisabled();
    expect(screen.getByText(/Exeat\s+SHOULD WITHDRAW/)).toBeInTheDocument();
    expect(screen.getByText('Allocate Round 1 Losses')).toBeInTheDocument();
  });
});
