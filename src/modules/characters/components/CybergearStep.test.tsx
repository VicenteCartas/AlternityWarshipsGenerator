import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterValidationResult } from '../types/characterState';
import { CybergearStep } from './CybergearStep';

const validation = {
  skills: {
    availableSkillPoints: 60,
  },
  remainingSkillPoints: 50,
  cybergear: {
    usedTolerance: 2,
    cyberTolerance: 10,
    remainingTolerance: 8,
    trainingSkillPointCost: 10,
    equipmentCost: 1500,
    totalMass: 20,
    requiresAcceptanceCheck: false,
    errors: [],
  },
} as unknown as CharacterValidationResult;

describe('CybergearStep', () => {
  it('explains the one-time skill-point charge and identifies exempt gear', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <CybergearStep
          speciesId="human"
          selections={[{ gearId: 'body-plating', quality: 'ordinary', quantity: 1 }]}
          progressLevel={7}
          validation={validation}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    await user.hover(screen.getByText('Cybergear training: 10 skill points'));
    expect(await screen.findByText(/one-time deduction from the hero's normal skill-point pool/i)).toBeInTheDocument();
    expect(screen.getAllByText('No training cost').length).toBeGreaterThan(0);
    expect(screen.getByText('60 skill points available')).toBeInTheDocument();
    expect(screen.getByText('50 skill points remaining')).toBeInTheDocument();
  });

  it('identifies Mechalus intrinsic cybertech before catalog purchases', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <CybergearStep
          speciesId="mechalus"
          selections={[]}
          progressLevel={6}
          validation={validation}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/intrinsic Good nanocomputer, two neural data slots/i)).toBeInTheDocument();
    expect(screen.getByText(/circuitry functioning as a reflex device/i)).toBeInTheDocument();
  });

  it('defaults to the character PL and supports all or multiple exact levels', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <CybergearStep
          speciesId="human"
          selections={[]}
          progressLevel={6}
          validation={validation}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    const progressLevels = screen.getByRole('combobox', { name: 'Progress Levels' });
    expect(progressLevels).toHaveTextContent('PL 6');
    expect(screen.getByRole('checkbox', { name: 'Install Body Plating' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Install CF Skinweave' })).not.toBeInTheDocument();

    await user.click(progressLevels);
    await user.click(screen.getByRole('option', { name: 'All PLs' }));
    await user.keyboard('{Escape}');
    expect(progressLevels).toHaveTextContent('All PLs');
    expect(screen.getByRole('checkbox', { name: 'Install Body Plating' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Install CF Skinweave' })).toBeInTheDocument();

    await user.click(progressLevels);
    await user.click(screen.getByRole('option', { name: 'PL 6' }));
    await user.click(screen.getByRole('option', { name: 'PL 7' }));
    await user.keyboard('{Escape}');
    expect(progressLevels).toHaveTextContent('PL 6, PL 7');

    await user.click(progressLevels);
    await user.click(screen.getByRole('option', { name: 'PL 6' }));
    await user.keyboard('{Escape}');
    expect(progressLevels).toHaveTextContent('PL 7');
    expect(screen.queryByRole('checkbox', { name: 'Install Body Plating' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Install CF Skinweave' })).toBeInTheDocument();
  });
});