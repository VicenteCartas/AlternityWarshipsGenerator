import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import rulesJson from '../data/battleRules.json';
import type { BattleRules, BattleState, UnitStack } from '../types/battle';
import { ResultsStep } from './ResultsStep';

const rules = rulesJson as BattleRules;

function stack(id: string, currentStrength: number, overrides: Partial<UnitStack> = {}): UnitStack {
  return {
    id,
    name: id,
    combatStrengthPerUnit: 100,
    initialQuantity: 1,
    currentStrength,
    category: 'cruiser',
    domain: 'space',
    crossDomainFactor: null,
    specialization: 'none',
    theatreId: 'orbit',
    source: 'custom',
    ...overrides,
  };
}

function battle(casualtyMode: 'abstract' | 'tracked'): BattleState {
  return {
    scenarioName: 'Results Test',
    casualtyMode,
    sideA: {
      id: 'A',
      name: 'Alliance',
      tacticsSpaceScore: 12,
      tacticsGroundScore: 12,
      withdrawThreshold: 0.6,
      stacks: [stack('Cruiser Squadron', 150, { initialQuantity: 3 })],
    },
    sideB: {
      id: 'B',
      name: 'Exeat',
      tacticsSpaceScore: 12,
      tacticsGroundScore: 12,
      withdrawThreshold: 0.4,
      stacks: [stack('Fleet Carrier', 50, { category: 'carrier', priorityAsset: true })],
    },
    theatres: [{ id: 'orbit', name: 'High Orbit', kind: 'space', rounds: [] }],
    victoryConditions: [],
  };
}

function renderResults(state: BattleState) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <ResultsStep state={state} stepNumber={5} rules={rules} />
    </ThemeProvider>,
  );
}

describe('ResultsStep', () => {
  it('shows tracked stack casualties and a prominent withdrawal status', () => {
    renderResults(battle('tracked'));

    const cruiserRow = screen.getByRole('row', { name: /Cruiser Squadron Cruisers 3 2 1 1 300 150/i });
    expect(within(cruiserRow).getByText('2')).toBeInTheDocument();
    expect(within(cruiserRow).getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('EXEAT SHOULD WITHDRAW')).toBeInTheDocument();
    expect(screen.getByText(/Overall result unresolved/i)).toBeInTheDocument();
  });

  it('states that specific casualties remain unallocated in abstract mode', () => {
    renderResults(battle('abstract'));

    expect(screen.getAllByText(/Specific casualties unallocated/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unallocated').length).toBeGreaterThan(0);
  });
});
