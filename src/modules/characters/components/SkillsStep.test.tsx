import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import type { SkillPurchasePlan } from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { SkillsStep } from './SkillsStep';

const validation = {
  skills: {
    valid: true,
    errors: [],
    baseSkillPoints: 45,
    speciesSkillPointBonus: 5,
    cashedInSkillPoints: 0,
    availableSkillPoints: 50,
    spentSkillPoints: 0,
    remainingSkillPoints: 50,
    purchasedBroadSkillCount: 0,
    maxPurchasedBroadSkills: 6,
    retainedFreeBroadSkillIds: [
      'athletics', 'vehicle-operation', 'stamina', 'knowledge', 'awareness', 'interaction',
    ],
    trainedBroadSkillIds: [
      'athletics', 'vehicle-operation', 'stamina', 'knowledge', 'awareness', 'interaction',
    ],
    skillDiscountProfessionIds: [],
    costs: [],
  },
} as unknown as CharacterValidationResult;

function TestSkillsStep() {
  const [plan, setPlan] = useState<SkillPurchasePlan>({
    nativeLanguage: 'Galactic Standard',
    cashedInFreeBroadSkillIds: [],
    purchasedBroadSkillIds: [],
    specialtySkills: [],
    additionalDiscountProfessionIds: [],
  });
  return (
    <SkillsStep
      speciesId="human"
      plan={plan}
      validation={validation}
      onChange={setPlan}
    />
  );
}

function renderStep() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <TestSkillsStep />
    </ThemeProvider>,
  );
}

describe('SkillsStep', () => {
  it('starts with specialty rows collapsed and toggles one broad skill', async () => {
    const user = userEvent.setup();
    renderStep();
    expect(screen.queryByRole('combobox', { name: 'Combat armor rank' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Armor Operation specialties' }));
    expect(screen.getByRole('combobox', { name: 'Combat armor rank' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Collapse Armor Operation specialties' }));
    expect(screen.queryByRole('combobox', { name: 'Combat armor rank' })).not.toBeInTheDocument();
  });

  it('expands and collapses every broad skill in the current Ability', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByRole('button', { name: 'Expand all broad skills' }));
    expect(screen.getByRole('combobox', { name: 'Combat armor rank' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Climb rank' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Collapse all broad skills' }));
    expect(screen.queryByRole('combobox', { name: 'Combat armor rank' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Climb rank' })).not.toBeInTheDocument();
  });

  it('automatically reveals only matching specialties during search', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.type(screen.getByLabelText('Search skills'), 'powered armor');
    expect(screen.getByRole('combobox', { name: 'Powered armor rank' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Combat armor rank' })).not.toBeInTheDocument();
  });

  it('shows rank-benefit milestones and details only for skills that have them', async () => {
    const user = userEvent.setup();
    renderStep();
    expect(within(screen.getByRole('row', { name: /Armor Operation/ })).getByText('2 with rank benefits')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Armor Operation specialties' }));
    expect(screen.queryByRole('button', { name: 'View Climb rank benefits' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View Combat armor rank benefits' }));
    expect(screen.getByRole('heading', { name: 'Combat armor rank benefits' })).toBeInTheDocument();
    expect(screen.getByText('Rank 7')).toBeInTheDocument();
    expect(screen.getByText('Shaking off stuns')).toBeInTheDocument();
  });

  it('finds specialty skills by rank-benefit text', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByRole('tab', { name: 'DEX' }));
    await user.type(screen.getByLabelText('Search skills'), 'quick draw');
    expect(screen.getByRole('button', { name: 'View Pistol rank benefits' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Rifle rank benefits' })).not.toBeInTheDocument();
  });

  it('adds, edits, and removes separate language purchases', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByRole('tab', { name: 'INT' }));
    await user.click(screen.getByRole('button', { name: 'Expand Knowledge specialties' }));

    await user.click(screen.getByRole('combobox', { name: 'Language rank' }));
    await user.click(screen.getByRole('option', { name: '2' }));
    expect(screen.getByRole('combobox', { name: 'Language rank' })).toHaveTextContent('2');
    await user.type(screen.getByRole('textbox', { name: 'Language specialization' }), 'English');
    await user.click(screen.getByRole('button', { name: 'Add another Language specialization' }));

    expect(screen.getByRole('combobox', { name: 'Language rank 2' })).toHaveTextContent('1');
    await user.type(screen.getByRole('textbox', { name: 'Language specialization 2' }), 'Spanish');
    expect(screen.getByText('Additional language')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Language specialization 2' }));
    expect(screen.queryByRole('textbox', { name: 'Language specialization 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Language specialization' })).toHaveValue('English');
  });
});
