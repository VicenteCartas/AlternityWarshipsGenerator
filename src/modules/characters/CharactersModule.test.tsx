import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import CharactersModule from './CharactersModule';
import { installMockElectronAPI } from '@shared/test/electronMock';

function renderModule() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <CharactersModule themeMode="light" onThemeModeChange={vi.fn()} onReturnToHub={vi.fn()} />
    </ThemeProvider>,
  );
}

function renderBuilder() {
  const result = renderModule();
  fireEvent.click(screen.getByRole('button', { name: 'New Character' }));
  return result;
}

describe('CharactersModule', () => {
  it('starts on a Character Creator menu with current and planned actions', () => {
    renderModule();
    expect(screen.getByRole('heading', { name: 'Character Creator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Character' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Open Character' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Character Library/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sources & Mods/ })).toBeDisabled();
  });

  it('reports contextual modes and protects native return-to-start navigation', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    renderModule();
    await waitFor(() => expect(electron.api.setBuilderMode).toHaveBeenCalledWith('characters-welcome'));

    act(() => electron.triggerMenuEvent('onNewCharacter'));
    const heroName = await screen.findByLabelText(/hero name/i);
    await waitFor(() => expect(electron.api.setBuilderMode).toHaveBeenCalledWith('characters-builder'));
    fireEvent.change(heroName, { target: { value: 'Jordan Kade' } });

    act(() => electron.triggerMenuEvent('onReturnToStart'));
    expect(screen.getByRole('heading', { name: 'Discard unsaved character changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('heading', { name: 'Character Creator' })).toBeInTheDocument();
  });

  it('uses arrow navigation and required/optional status icons in the stepper', () => {
    renderBuilder();
    expect(screen.getByRole('button', { name: 'Scroll steps left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll steps right' })).toBeInTheDocument();
    expect(screen.getByLabelText('Identity required incomplete')).toBeInTheDocument();
    expect(screen.getByLabelText('Perks & Flaws optional incomplete')).toBeInTheDocument();
    expect(screen.getByLabelText('Species complete')).toBeInTheDocument();
  });

  it('opens the PDF format chooser from the toolbar and native menu', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    renderBuilder();
    await user.click(screen.getByRole('button', { name: 'Export Character PDF' }));
    expect(screen.getByRole('heading', { name: 'Export Character PDF' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(electron.api.onExportCharacterPdf).toHaveBeenCalled());
    act(() => electron.triggerMenuEvent('onExportCharacterPdf'));
    expect(screen.getByRole('heading', { name: 'Export Character PDF' })).toBeInTheDocument();
  });

  it('edits identity and navigates with string-based steps', async () => {
    const user = userEvent.setup();
    renderBuilder();
    expect(screen.getByText(/character creator/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/hero name/i), { target: { value: 'Jordan Kade' } });
    expect(screen.getByLabelText(/hero name/i)).toHaveValue('Jordan Kade');
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('heading', { name: 'Species' })).toBeInTheDocument();
  });

  it('creates advancement levels from the Identity target level', async () => {
    const user = userEvent.setup();
    renderBuilder();
    fireEvent.change(screen.getByLabelText('Target Level'), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Advancement (Required)' }));
    expect(screen.getByRole('heading', { name: 'Advancement' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Level 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Level 3' })).toBeInTheDocument();
  });

  it('undoes and redoes complete character snapshots', async () => {
    const user = userEvent.setup();
    renderBuilder();
    const heroName = screen.getByLabelText(/hero name/i);
    fireEvent.change(heroName, { target: { value: 'Jordan Kade' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled(), { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(heroName).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(heroName).toHaveValue('Jordan Kade');
  });

  it('selects a profession and shows live ability validation', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Profession'));
    await user.click(screen.getByRole('row', { name: 'Select Free Agent' }));
    await user.click(screen.getByText('Abilities'));
    expect(screen.getByText('60 / 60')).toBeInTheDocument();
    expect(screen.getByText(/Free Agent requires DEX 11/i)).toBeInTheDocument();
  });

  it('captures the Free Agent resistance benefit', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Profession'));
    await user.click(screen.getByRole('row', { name: 'Select Free Agent' }));
    await user.click(screen.getByLabelText('Resistance Bonus'));
    await user.click(screen.getByRole('option', { name: 'DEX' }));
    expect(screen.queryByText('Free Agent requires a resistance bonus Ability.')).not.toBeInTheDocument();
  });

  it('purchases a broad skill and specialty rank with live point totals', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Skills'));
    await user.click(screen.getByRole('tab', { name: 'DEX' }));
    await user.click(screen.getByRole('checkbox', { name: 'Purchase Stealth' }));
    await user.click(screen.getByRole('combobox', { name: 'Sneak rank' }));
    await user.click(screen.getByRole('option', { name: '1' }));
    expect(screen.getByText('38 points remaining')).toBeInTheDocument();
  });

  it('applies official optional skill rules and confirms repricing existing purchases', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Skills'));
    await user.click(screen.getByRole('switch', { name: /Optional Rules 2A and 2B/ }));
    expect(screen.getByText('65 points remaining')).toBeInTheDocument();
    expect(screen.getByText('0/7 broad skills')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'DEX' }));
    await user.click(screen.getByRole('checkbox', { name: 'Purchase Stealth' }));
    await user.click(screen.getByRole('switch', { name: /Optional Rule 2C/ }));
    expect(screen.getByRole('heading', { name: 'Change skill rules?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change Rules' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change skill rules?' })).not.toBeInTheDocument());
    expect(screen.getByRole('switch', { name: /Optional Rule 2C/ })).toBeChecked();
  });

  it('selects a perk and flaw and updates the shared skill-point adjustment', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Perks & Flaws'));
    await user.click(screen.getByRole('checkbox', { name: 'Select Ambidextrous' }));
    await user.click(screen.getByRole('tab', { name: 'Flaws' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Bad Luck' }));
    expect(screen.getByText('+2 skill points')).toBeInTheDocument();
  });

  it('creates a talent and purchases a psionic specialty from the shared budget', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Psionics'));
    await user.click(screen.getByLabelText('Access Path'));
    await user.click(screen.getByRole('option', { name: 'Talent' }));
    await user.click(screen.getByRole('checkbox', { name: 'Purchase Extrasensory Perception (ESP)' }));
    await user.click(screen.getByRole('combobox', { name: 'Empathy rank' }));
    await user.click(screen.getByRole('option', { name: '1' }));
    expect(screen.getByText('5 energy')).toBeInTheDocument();
    expect(screen.getByText('42 skill points remaining')).toBeInTheDocument();
  });

  it('builds a balanced Mutant Human mutation package', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Species'));
    await user.click(screen.getByRole('row', { name: 'Select Mutant Human' }));
    await user.click(screen.getByRole('button', { name: 'Mutations (Required)' }));
    fireEvent.change(screen.getByLabelText('Advantage Budget'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Drawback Budget'), { target: { value: '1' } });
    await user.click(screen.getByRole('checkbox', { name: 'Select Improved Constitution' }));
    await user.click(screen.getByRole('tab', { name: 'Drawbacks' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Light Sensitivity' }));
    expect(screen.getByText('1/1 advantage points')).toBeInTheDocument();
    expect(screen.getByText('1/1 drawback points')).toBeInTheDocument();
  });

  it('installs cybergear and updates tolerance and training', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Cybergear'));
    await user.click(screen.getByRole('checkbox', { name: 'Install Body Plating' }));
    expect(screen.getByText('2/10 tolerance')).toBeInTheDocument();
    expect(screen.getByText('Cybergear training: 10 skill points')).toBeInTheDocument();
    expect(screen.getByText('1500 credits')).toBeInTheDocument();
  });

  it('calculates starting funds and purchases noncombat equipment', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByText('Profession'));
    await user.click(screen.getByRole('row', { name: 'Select Free Agent' }));
    await user.click(screen.getByText('Equipment'));
    const rolls = ['8', '7', '6', '5', '4'];
    for (let index = 0; index < rolls.length; index += 1) {
      fireEvent.change(screen.getByLabelText(`Funds Die ${index + 1}`), { target: { value: rolls[index] } });
    }
    expect(screen.getByText('3000 starting credits')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search equipment'), { target: { value: 'Bedroll' } });
    await user.click(screen.getByRole('checkbox', { name: 'Buy Bedroll' }));
    expect(screen.getByText('2975 credits remaining')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Weapons & Armor' }));
    fireEvent.change(screen.getByLabelText('Search combat gear'), { target: { value: 'Combat knife' } });
    await user.click(screen.getByRole('checkbox', { name: 'Buy Combat knife' }));
    expect(screen.getByText('2940 credits remaining')).toBeInTheDocument();
  });
});