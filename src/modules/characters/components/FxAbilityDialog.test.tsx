import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { FxAbilityDialog } from './FxAbilityDialog';

describe('FxAbilityDialog', () => {
  it('designs a Super Power specialty with a live GMG cost review', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <FxAbilityDialog open editingDesign={null} defaultDiscipline="super-power" onSave={onSave} onCancel={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Ability Name/), { target: { value: 'Strength of the Behemoth' } });
    fireEvent.change(screen.getByLabelText(/Effect Description/), { target: { value: 'Increase Strength while active.' } });
    await user.click(screen.getByRole('combobox', { name: 'Associated Ability' }));
    await user.click(screen.getByRole('option', { name: 'CON' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('combobox', { name: 'FX characteristic' }));
    await user.click(screen.getByRole('option', { name: 'Ability Score boost' }));
    await user.click(screen.getByRole('combobox', { name: 'FX characteristic value' }));
    await user.click(screen.getByRole('option', { name: '+3 (10 SP)' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(screen.getByLabelText('Limitation'), { target: { value: 'Cold causes a +1 penalty.' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('good quality')).toBeInTheDocument();
    expect(screen.getByText('9 SP at rank 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Ability' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Strength of the Behemoth',
      discipline: 'super-power',
      ability: 'con',
    }));
  });
});