import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from '../services/characterValidationService';
import type { CharacterState } from '../types/characterState';
import { FxStep } from './FxStep';

afterEach(() => {
  Reflect.deleteProperty(window, 'electronAPI');
});

function TestFxStep({ advanced = false }: { advanced?: boolean }) {
  const [state, setState] = useState<CharacterState>(() => {
    const character = createEmptyCharacter();
    character.selectedSourcePackIds.push('gmg-fx');
    if (advanced) {
      character.level = 2;
      character.fxPlan = {
        campaignTone: 'heroic',
        broadSkill: 'arcane',
        designs: [{
          id: 'saved-augury', name: 'Saved Augury', discipline: 'arcane', category: 'augur', ability: 'wil',
          description: 'Reveals general information.', characteristics: [{ characteristicId: 'knowledge', choiceId: 'cost-3' }], trappings: {},
        }],
        abilityPurchases: [],
        faithPurchases: [],
      };
      character.advancementPlan.levels = [{
        level: 2, broadSkills: [], specialtySkills: [{ domain: 'fx', skillId: 'saved-augury' }],
        benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0,
        creditsAwarded: 0, acquisitions: [], notes: '',
      }];
    }
    return character;
  });
  const validation = validateCharacter(state);
  return <FxStep plan={state.fxPlan} validation={validation} onChange={(fxPlan) => setState({ ...state, fxPlan })} />;
}

describe('FxStep', () => {
  it('selects campaign tone, enforces one FX broad skill, and buys Faith specialties', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider theme={createTheme()}><TestFxStep /></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: /^Heroic campaign tone$/ }));
    await user.click(screen.getByRole('button', { name: /Faith broad skill/ }));
    expect(screen.getByText('18 skill points spent')).toBeInTheDocument();
    expect(screen.getByText('10/20 FX energy')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Ordinary-quality miracles rank' }));
    await user.click(screen.getByRole('option', { name: '1' }));
    expect(screen.getByText('23 skill points spent')).toBeInTheDocument();
  });

  it('protects designs purchased only during advancement', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider theme={createTheme()}><TestFxStep advanced /></ThemeProvider>);

    expect(screen.getByRole('button', { name: 'Delete Saved Augury' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Faith broad skill/ }));
    expect(screen.getByRole('heading', { name: 'Change FX broad skill?' })).toBeInTheDocument();
  });

  it('confirms campaign-tone changes after FX has been acquired', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider theme={createTheme()}><TestFxStep advanced /></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: /^Realistic campaign tone$/ }));
    expect(screen.getByRole('heading', { name: 'Change FX campaign tone?' })).toBeInTheDocument();
  });

  it('exports designed abilities through the dedicated native dialog', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    electron.api.showFxAbilitySaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: String.raw`C:\Exports\saved.fx-ability.json`,
    });
    render(<ThemeProvider theme={createTheme()}><TestFxStep advanced /></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: 'Export FX abilities' }));

    await waitFor(() => expect(electron.api.saveFile).toHaveBeenCalledWith(
      String.raw`C:\Exports\saved.fx-ability.json`,
      expect.stringContaining('"sourcePackId": "gmg-fx"'),
    ));
  });
});