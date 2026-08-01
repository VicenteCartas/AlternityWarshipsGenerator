import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import type { AbilityScores } from '../types/character';
import { AbilitiesStep } from './AbilitiesStep';

const invalidScores: AbilityScores = { str: 11, dex: 12, con: 10, int: 12, wil: 7, per: 7 };
const validScores: AbilityScores = { ...invalidScores, per: 8 };

describe('AbilitiesStep', () => {
  it('keeps one validation banner mounted while its status changes', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <AbilitiesStep
          scores={invalidScores}
          speciesId="human"
          errors={['Ability scores must total 60 points; currently 59.']}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );

    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Ability scores must total 60 points; currently 59.');

    rerender(
      <ThemeProvider theme={createTheme()}>
        <AbilitiesStep scores={validScores} speciesId="human" errors={[]} onChange={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('alert')).toBe(banner);
    expect(banner).toHaveTextContent('Ability scores use all 60 points.');
  });
});