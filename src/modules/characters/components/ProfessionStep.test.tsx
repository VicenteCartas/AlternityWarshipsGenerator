import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import {
  getAllCharacterSourcePacks,
  getAllProfessions,
} from '../services/characterDataService';
import type {
  ProfessionDefinition,
  PsionicPurchasePlan,
  ResistanceAbilityId,
  SkillPurchasePlan,
} from '../types/character';
import type { ProfessionBenefitChoices } from '../types/characterState';
import { ProfessionStep } from './ProfessionStep';

const modProfession: ProfessionDefinition = {
  ...getAllProfessions()[0],
  id: 'pathfinder',
  name: 'Pathfinder',
  _source: 'Outer Rim Careers',
  requirements: { dex: 8, wil: 8 },
  actionCheckBonus: 4,
  optional: false,
  benefitEffectIds: ['frontier-training'],
};

function TestProfessionStep() {
  const [selectedProfessionId, setSelectedProfessionId] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<ProfessionBenefitChoices>({});
  const [resistanceBonusAbility, setResistanceBonusAbility] = useState<ResistanceAbilityId>();
  const [skillPlan, setSkillPlan] = useState<SkillPurchasePlan>({
    nativeLanguage: 'Galactic Standard',
    cashedInFreeBroadSkillIds: [],
    purchasedBroadSkillIds: [],
    specialtySkills: [],
    additionalDiscountProfessionIds: [],
  });
  const [psionicPlan, setPsionicPlan] = useState<PsionicPurchasePlan>({
    accessPath: 'none',
    purchasedBroadSkillIds: [],
    specialtySkills: [],
  });

  return (
    <ProfessionStep
      selectedProfessionId={selectedProfessionId}
      abilityScores={{ str: 10, dex: 10, con: 10, int: 10, wil: 10, per: 10 }}
      benefits={benefits}
      resistanceBonusAbility={resistanceBonusAbility}
      skillPlan={skillPlan}
      psionicPlan={psionicPlan}
      errors={[]}
      onSelect={setSelectedProfessionId}
      onBenefitsChange={setBenefits}
      onResistanceBonusChange={setResistanceBonusAbility}
      onSkillPlanChange={setSkillPlan}
      onPsionicPlanChange={setPsionicPlan}
      professionDefinitions={[...getAllProfessions(), modProfession]}
      sourcePackDefinitions={getAllCharacterSourcePacks()}
    />
  );
}

function renderStep() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <TestProfessionStep />
    </ThemeProvider>,
  );
}

describe('ProfessionStep', () => {
  it('shows selected profession configuration above a comparison table', async () => {
    const user = userEvent.setup();
    renderStep();
    const table = screen.getByRole('table', { name: 'Profession comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('Select a profession from the table to configure its starting benefits.')).toBeInTheDocument();
    await user.click(within(table).getByRole('row', { name: 'Select Free Agent' }));
    expect(screen.getByRole('heading', { name: 'Free Agent' })).toBeInTheDocument();
    expect(screen.getByLabelText('Resistance Bonus')).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Select Free Agent' })).toHaveAttribute('aria-selected', 'true');
  });

  it('searches and selects a mod profession', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.type(screen.getByLabelText('Search professions'), 'pathfinder');
    const table = screen.getByRole('table', { name: 'Profession comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.click(within(table).getByRole('row', { name: 'Select Pathfinder' }));
    expect(screen.getByRole('heading', { name: 'Pathfinder' })).toBeInTheDocument();
    expect(screen.getAllByText('Frontier Training')).toHaveLength(2);
    expect(screen.getAllByText('Mod').length).toBeGreaterThan(0);
  });

  it('filters professions by book or mod source', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByLabelText('Source'));
    await user.click(screen.getByRole('option', { name: 'Outer Rim Careers (Mod)' }));
    const table = screen.getByRole('table', { name: 'Profession comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByRole('row', { name: 'Select Pathfinder' })).toBeInTheDocument();
  });

  it('sorts professions by Action Check bonus', async () => {
    const user = userEvent.setup();
    renderStep();
    const table = screen.getByRole('table', { name: 'Profession comparison' });
    await user.click(within(table).getByRole('button', { name: 'Action Check' }));
    await user.click(within(table).getByRole('button', { name: 'Action Check' }));
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Pathfinder');
    expect(rows[1]).toHaveTextContent('+4');
  });
});
