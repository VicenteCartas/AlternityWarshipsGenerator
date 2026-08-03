import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import type { CharacterIdentity } from '../types/characterState';
import { IdentityStep } from './IdentityStep';

function TestIdentityStep() {
  const empty = createEmptyCharacter();
  const [identity, setIdentity] = useState<CharacterIdentity>(empty.identity);
  return (
    <IdentityStep
      identity={identity}
      progressLevel={6}
      targetLevel={1}
      onIdentityChange={setIdentity}
      onProgressLevelChange={() => undefined}
      onTargetLevelChange={() => undefined}
    />
  );
}

describe('IdentityStep', () => {
  it('selects suggested attributes and stores two traits independently', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <TestIdentityStep />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('combobox', { name: 'Motivation' }));
    await user.click(screen.getByRole('option', { name: 'Duty' }));
    await user.click(screen.getByRole('combobox', { name: 'Moral Attitude' }));
    await user.click(screen.getByRole('option', { name: 'Ethical' }));
    await user.click(screen.getByRole('combobox', { name: 'Character Trait 1' }));
    await user.click(screen.getByRole('option', { name: 'Curious' }));
    await user.click(screen.getByRole('combobox', { name: 'Character Trait 2' }));
    await user.click(screen.getByRole('option', { name: 'Patient' }));

    expect(screen.getByRole('combobox', { name: 'Motivation' })).toHaveValue('Duty');
    expect(screen.getByRole('combobox', { name: 'Moral Attitude' })).toHaveValue('Ethical');
    expect(screen.getByRole('combobox', { name: 'Character Trait 1' })).toHaveValue('Curious');
    expect(screen.getByRole('combobox', { name: 'Character Trait 2' })).toHaveValue('Patient');
  });

  it('preserves custom punctuation instead of consuming commas', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <TestIdentityStep />
      </ThemeProvider>,
    );

    await user.type(screen.getByRole('combobox', { name: 'Character Trait 1' }), 'Calm, deliberate');
    expect(screen.getByRole('combobox', { name: 'Character Trait 1' })).toHaveValue('Calm, deliberate');
  });
});