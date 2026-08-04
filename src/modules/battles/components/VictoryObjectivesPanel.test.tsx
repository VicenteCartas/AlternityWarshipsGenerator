import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import rulesJson from '../data/battleRules.json';
import type { BattleRules, BattleState, UnitStack, VictoryCondition } from '../types/battle';
import { TheatreObjectivesPanel } from './TheatreObjectivesPanel';
import { VictoryObjectivesPanel } from './VictoryObjectivesPanel';

const rules = rulesJson as BattleRules;

function stack(overrides: Partial<UnitStack> = {}): UnitStack {
  return {
    id: 'carrier-1',
    name: 'Fleet Carrier',
    combatStrengthPerUnit: 500,
    initialQuantity: 1,
    currentStrength: 0,
    category: 'carrier',
    domain: 'space',
    crossDomainFactor: null,
    specialization: 'none',
    theatreId: 'orbit',
    source: 'custom',
    priorityAsset: true,
    ...overrides,
  };
}

function objective(): VictoryCondition {
  return {
    id: 'objective-1',
    name: 'Destroy the carrier',
    beneficiarySideId: 'A',
    targetSideId: 'B',
    theatreId: 'orbit',
    kind: 'priorityAssetsDestroyed',
    categories: [],
    stackIds: [],
    thresholdPct: 0.25,
    minimumSurvivingQuantity: 1,
  };
}

function battle(withObjective = false): BattleState {
  return {
    scenarioName: 'Relief of Tendril',
    sideA: {
      id: 'A',
      name: 'Alliance',
      tacticsSpaceScore: 12,
      tacticsGroundScore: 12,
      stacks: [stack({ id: 'alliance-1', name: 'Alliance Escort', currentStrength: 100, priorityAsset: false })],
      withdrawThreshold: 0.4,
    },
    sideB: {
      id: 'B',
      name: 'Exeat',
      tacticsSpaceScore: 12,
      tacticsGroundScore: 12,
      stacks: [stack()],
      withdrawThreshold: 0.6,
    },
    theatres: [{ id: 'orbit', name: 'High Orbit', kind: 'space', rounds: [] }],
    victoryConditions: withObjective ? [objective()] : [],
  };
}

function renderWithTheme(node: React.ReactNode) {
  return render(<ThemeProvider theme={createTheme()}>{node}</ThemeProvider>);
}

describe('VictoryObjectivesPanel', () => {
  it('creates an asymmetric objective for the selected beneficiary', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<VictoryObjectivesPanel state={battle()} rules={rules} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add for Exeat' }));

    const next = onChange.mock.calls[0][0] as BattleState;
    expect(next.victoryConditions).toHaveLength(1);
    expect(next.victoryConditions?.[0]).toMatchObject({
      beneficiarySideId: 'B',
      targetSideId: 'A',
      theatreId: 'orbit',
      kind: 'priorityAssetsDestroyed',
    });
  });
});

describe('TheatreObjectivesPanel', () => {
  it('marks an achieved objective and records continue fighting', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const state = battle(true);
    renderWithTheme(
      <TheatreObjectivesPanel
        state={state}
        theatre={state.theatres[0]}
        rules={rules}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText('Objective achieved').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Continue Fighting' }));

    const next = onChange.mock.calls[0][0] as BattleState;
    expect(next.theatres[0].continuedObjectiveIds).toEqual(['objective-1']);
    expect(next.theatres[0].conclusion).toBeUndefined();
  });

  it('concludes the theatre for the objective beneficiary', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const state = battle(true);
    renderWithTheme(
      <TheatreObjectivesPanel
        state={state}
        theatre={state.theatres[0]}
        rules={rules}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Conclude Theatre' }));

    const next = onChange.mock.calls[0][0] as BattleState;
    expect(next.theatres[0].conclusion).toEqual({
      winnerSideId: 'A',
      reason: 'objective',
      conditionId: 'objective-1',
      round: 0,
    });
  });
});
