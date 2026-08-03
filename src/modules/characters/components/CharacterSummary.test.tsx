import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from '../services/characterValidationService';
import { CharacterSummary } from './CharacterSummary';

describe('CharacterSummary', () => {
  it('presents the complete character across all five views', async () => {
    const user = userEvent.setup();
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.identity.playerName = 'Morgan';
    state.identity.hair = 'Black';
    state.identity.eyes = 'Green';
    state.identity.background = 'Frontier scout';
    state.identity.notes = 'Owes Captain Vale a favor.';
    state.professionId = 'free-agent';
    state.resistanceBonusAbility = 'dex';
    state.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    state.skillPlan.nativeLanguage = 'English';
    state.skillPlan.purchasedBroadSkillIds = ['stealth'];
    state.skillPlan.specialtySkills = [{ skillId: 'sneak', rank: 1 }];
    state.skillRules.specialtySkillCosts = 'optional-2c';
    state.startingFundsDieRolls = [8, 7, 6, 5, 4];
    state.weaponSelections = [{ weaponId: 'combat-knife', quantity: 1, spareClips: 0 }];
    state.armorSelections = [{ armorId: 'battle-jacket', quantity: 1 }];
    const validation = validateCharacter(state);

    render(
      <ThemeProvider theme={createTheme()}>
        <CharacterSummary state={state} validation={validation} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Jordan Kade' })).toBeInTheDocument();
    expect(screen.getByText('Black / Green')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Skills' }));
    expect(screen.getByText('Native: English (rank 3)')).toBeInTheDocument();
    expect(screen.getByText('Language (English)')).toBeInTheDocument();
    expect(screen.getByText('Sneak')).toBeInTheDocument();
    expect(screen.getByText('Starting Skills: Standard PHB')).toBeInTheDocument();
    expect(screen.getByText('Specialty Costs: Official Optional Rule 2C')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Combat' }));
    expect(screen.getByText('Combat knife')).toBeInTheDocument();
    expect(screen.getByText('Battle jacket')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Gear' }));
    expect(screen.getByText('3000 starting credits')).toBeInTheDocument();
    expect(screen.getByText('1465 remaining')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Options & Notes' }));
    expect(screen.getByText(/\+1 DEX resistance/)).toBeInTheDocument();
    expect(screen.getByText('Frontier scout')).toBeInTheDocument();
    expect(screen.getByText('Owes Captain Vale a favor.')).toBeInTheDocument();
  });
});