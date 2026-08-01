import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterValidationResult } from '../types/characterState';
import { LoadoutStep } from './LoadoutStep';

vi.mock('../services/characterDataService', () => ({
  getAllCharacterSourcePacks: () => [{ id: 'phb', name: "Player's Handbook" }],
  getAllEquipment: () => [
    {
      id: 'bedroll', name: 'Bedroll', sourcePackId: 'phb', category: 'miscellaneous',
      progressLevel: 4, mass: 3, costMode: 'fixed', cost: 25, effectIds: [],
    },
    {
      id: 'mod-toolkit', name: 'Frontier Toolkit', sourcePackId: 'phb', _source: 'Outer Rim Gear',
      category: 'miscellaneous', progressLevel: 6, mass: 2, costMode: 'fixed', cost: 100, effectIds: [],
    },
  ],
  getEquipmentById: (id: string) => id === 'bedroll'
    ? {
        id: 'bedroll', name: 'Bedroll', sourcePackId: 'phb', category: 'miscellaneous',
        progressLevel: 4, mass: 3, costMode: 'fixed', cost: 25, effectIds: [],
      }
    : {
        id: 'mod-toolkit', name: 'Frontier Toolkit', sourcePackId: 'phb', _source: 'Outer Rim Gear',
        category: 'miscellaneous', progressLevel: 6, mass: 2, costMode: 'fixed', cost: 100, effectIds: [],
      },
  getAllWeapons: () => [
    {
      id: 'combat-knife', name: 'Combat knife', sourcePackId: 'phb', category: 'melee',
      progressLevel: 4, skillId: 'blade', accuracy: 0, mode: null, range: 'Personal',
      damageType: 'LI', damage: 'd4w', actions: 1, clipSize: null, clipCost: null,
      concealment: '+1', mass: 0.5, availability: 'any', cost: 35,
    },
    {
      id: 'frontier-saber', name: 'Frontier saber', sourcePackId: 'phb', _source: 'Outer Rim Gear',
      category: 'melee', progressLevel: 6, skillId: 'blade', accuracy: 0, mode: null,
      range: 'Personal', damageType: 'LI', damage: 'd6w', actions: 1, clipSize: null,
      clipCost: null, concealment: '+1', mass: 1, availability: 'common', cost: 200,
    },
  ],
  getAllArmor: () => [
    {
      id: 'hide-armor', name: 'Hide armor', sourcePackId: 'phb', progressLevel: 0,
      skillId: 'armor-operation', actionCheckPenalty: 1, toughness: 'ordinary',
      lowImpact: 'd6-3', highImpact: 'd4-3', energy: 'd6-4', mass: 10, cost: 100,
    },
    {
      id: 'frontier-armor', name: 'Frontier armor', sourcePackId: 'phb', _source: 'Outer Rim Gear',
      progressLevel: 6, skillId: 'combat-armor', actionCheckPenalty: 1, toughness: 'ordinary',
      lowImpact: 'd6', highImpact: 'd4', energy: 'd4', mass: 8, cost: 1200,
    },
  ],
}));

const validation = {
  options: {},
  startingFunds: { valid: false, totalFunds: 0, dieSize: 6, errors: ['Starting funds require exactly 5 die results.'] },
  equipment: { errors: [], totalCost: 0, totalMass: 0 },
  cybergear: { equipmentCost: 0, totalMass: 0 },
  combatGear: { errors: [], warnings: [], totalCost: 0, totalMass: 0, armorActionCheckPenalty: 0 },
  remainingFunds: 0,
} as unknown as CharacterValidationResult;

describe('LoadoutStep', () => {
  it('exposes every equipment category and renders the Armor catalogue', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <LoadoutStep
          equipmentSelections={[]}
          weaponSelections={[]}
          armorSelections={[]}
          dieRolls={[]}
          progressLevel={6}
          validation={validation}
          onEquipmentSelectionsChange={vi.fn()}
          onWeaponSelectionsChange={vi.fn()}
          onArmorSelectionsChange={vi.fn()}
          onDieRollsChange={vi.fn()}
          onWealthDegreeChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    for (const category of ['All', 'Sensors', 'Misc', 'Survival', 'Services', 'Computers']) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${category}$`) })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('tab', { name: /^Weapons & Armor$/ }));
    for (const category of ['Melee', 'Ranged', 'Heavy', 'Armor']) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${category}$`) })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('tab', { name: /^Armor$/ }));
    expect(screen.getByRole('columnheader', { name: /^Armor$/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Buy Hide armor' })).toBeInTheDocument();
  });

  it('gates new purchases until starting credits are established', async () => {
    const user = userEvent.setup();
    const props = {
      equipmentSelections: [],
      weaponSelections: [],
      armorSelections: [],
      dieRolls: [],
      progressLevel: 6,
      validation,
      onEquipmentSelectionsChange: vi.fn(),
      onWeaponSelectionsChange: vi.fn(),
      onArmorSelectionsChange: vi.fn(),
      onDieRollsChange: vi.fn(),
      onWealthDegreeChange: vi.fn(),
    };
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <LoadoutStep {...props} />
      </ThemeProvider>,
    );

    expect(screen.getByText(/roll all five starting-funds dice/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Buy Bedroll' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: /^Weapons & Armor$/ }));
    expect(screen.getByRole('checkbox', { name: 'Buy Combat knife' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: /^Armor$/ }));
    expect(screen.getByRole('checkbox', { name: 'Buy Hide armor' })).toBeDisabled();

    const readyValidation = {
      ...validation,
      startingFunds: { valid: true, totalFunds: 2300, dieSize: 6, errors: [] },
      remainingFunds: 2300,
    } as unknown as CharacterValidationResult;
    rerender(
      <ThemeProvider theme={createTheme()}>
        <LoadoutStep {...props} validation={readyValidation} dieRolls={[3, 5, 4, 5, 6]} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('checkbox', { name: 'Buy Hide armor' })).toBeEnabled();
  });

  it('allows a pre-existing selection to be removed before funds are ready', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <LoadoutStep
          equipmentSelections={[{ equipmentId: 'bedroll', quantity: 1 }]}
          weaponSelections={[]}
          armorSelections={[]}
          dieRolls={[]}
          progressLevel={6}
          validation={validation}
          onEquipmentSelectionsChange={vi.fn()}
          onWeaponSelectionsChange={vi.fn()}
          onArmorSelectionsChange={vi.fn()}
          onDieRollsChange={vi.fn()}
          onWealthDegreeChange={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('checkbox', { name: 'Buy Bedroll' })).toBeEnabled();
  });

  it('filters base and mod equipment sources while keeping one page scrollbar', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <LoadoutStep
          equipmentSelections={[]}
          weaponSelections={[]}
          armorSelections={[]}
          dieRolls={[]}
          progressLevel={6}
          validation={validation}
          onEquipmentSelectionsChange={vi.fn()}
          onWeaponSelectionsChange={vi.fn()}
          onArmorSelectionsChange={vi.fn()}
          onDieRollsChange={vi.fn()}
          onWealthDegreeChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Source' }));
    await user.click(screen.getByRole('option', { name: 'Outer Rim Gear (Mod)' }));
    expect(screen.getByRole('checkbox', { name: 'Buy Frontier Toolkit' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Buy Bedroll' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Weapons & Armor$/ }));
    await user.click(screen.getByRole('combobox', { name: 'Source' }));
    await user.click(screen.getByRole('option', { name: 'Outer Rim Gear (Mod)' }));
    expect(screen.getByRole('checkbox', { name: 'Buy Frontier saber' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Buy Combat knife' })).not.toBeInTheDocument();
  });
});