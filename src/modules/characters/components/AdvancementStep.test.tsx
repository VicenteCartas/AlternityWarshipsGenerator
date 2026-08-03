import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { normalizeAdvancementPlan } from '../services/advancementService';
import { validateCharacter } from '../services/characterValidationService';
import type { CharacterState } from '../types/characterState';
import { AdvancementStep } from './AdvancementStep';

function TestAdvancementStep() {
  const initial = createEmptyCharacter();
  initial.level = 3;
  initial.professionId = 'free-agent';
  initial.resistanceBonusAbility = 'dex';
  initial.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
  initial.skillPlan.nativeLanguage = 'English';
  initial.skillPlan.purchasedBroadSkillIds = ['stealth'];
  initial.startingFundsDieRolls = [8, 8, 8, 8, 8];
  initial.advancementPlan = normalizeAdvancementPlan(initial.advancementPlan, initial.level);
  const [state, setState] = useState<CharacterState>(initial);
  const validation = validateCharacter(state);
  return (
    <AdvancementStep
      state={state}
      validation={validation}
      onChange={(advancementPlan) => setState((current) => ({ ...current, advancementPlan }))}
    />
  );
}

describe('AdvancementStep', () => {
  it('records sequential skills, achievement benefits, credits, and granted equipment', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <TestAdvancementStep />
      </ThemeProvider>,
    );

    expect(screen.getByRole('tab', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Level 3' })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Specialty rank' }));
    await user.click(screen.getByRole('option', { name: /Sneak \(next rank 1\)/ }));
    await user.click(screen.getByRole('button', { name: 'Add Rank' }));
    expect(screen.getByText('Sneak: +1 rank')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Level 3' }));
    await user.click(screen.getByRole('combobox', { name: 'Achievement benefit' }));
    await user.click(screen.getByRole('option', { name: 'Action Check Increase' }));
    await user.click(screen.getByRole('button', { name: 'Add Benefit' }));
    expect(screen.getByText('Action Check Increase')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Credits Awarded'));
    await user.type(screen.getByLabelText('Credits Awarded'), '500');
    await user.click(screen.getByRole('combobox', { name: 'Acquired item' }));
    await user.click(screen.getByRole('option', { name: 'Bedroll' }));
    await user.click(screen.getByRole('button', { name: 'Add Acquisition' }));
    expect(screen.getByText('1x Bedroll | Granted / Found')).toBeInTheDocument();
  });
});
