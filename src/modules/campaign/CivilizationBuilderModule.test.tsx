import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CivilizationBuilderModule } from './CivilizationBuilderModule';
import { installMockElectronAPI } from '@shared/test/electronMock';

describe('CivilizationBuilderModule', () => {
  it('shows live GMG level constraints and authored worksheet fields', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    electron.api.showCampaignSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/civilization.civilization.json' });
    render(<CivilizationBuilderModule themeMode="dark" onThemeModeChange={vi.fn()} onReturnToHub={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Civilization Builder' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New Civilization' }));
    expect(screen.getByRole('heading', { name: 'CL 4: Nation' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Progress Level'));
    await user.click(screen.getByRole('option', { name: 'PL 4' }));
    await user.click(screen.getByLabelText('Civilization Level'));
    await user.click(screen.getByRole('option', { name: 'CL 8: Megapolitan World' }));
    expect(screen.getByText('Megapolitan World requires at least Progress Level 6.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Economy' }));
    await user.type(screen.getByLabelText('Exports and supply'), 'Fusion catalysts');
    expect(screen.getByLabelText('Exports and supply')).toHaveValue('Fusion catalysts');

    await user.type(screen.getByLabelText('Search commodities'), 'Stardrive');
    expect(screen.getByText('Stardrive units')).toBeInTheDocument();
    expect(screen.getByText('Restricted')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Export Stardrive units' }));
    expect(screen.getByText('1 export')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Cities & Towns' }));
    await user.click(screen.getByRole('button', { name: 'Add City/Town' }));
    await user.clear(screen.getByLabelText('Location name'));
    await user.type(screen.getByLabelText('Location name'), 'Port Meridian');
    await user.type(screen.getByLabelText('Where do the heroes sleep?'), 'Dockside hostels');
    expect(screen.getByLabelText('Where do the heroes sleep?')).toHaveValue('Dockside hostels');
    await user.click(screen.getByRole('button', { name: 'Duplicate location' }));
    expect(screen.getAllByText('Port Meridian Copy')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Stations & Installations' }));
    await user.click(screen.getByRole('button', { name: 'Add Station/Installation' }));
    await user.click(screen.getByRole('checkbox', { name: 'Power generation and distribution' }));
    expect(screen.getByText('1 facility selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export location PDF' }));
    expect(electron.api.savePdfFile).toHaveBeenCalledOnce();

    await user.click(screen.getByLabelText('Society'));
    await user.click(screen.getByRole('option', { name: 'Mixed' }));
    expect(screen.getByLabelText('Human Civilization Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Alien Civilization Level')).toBeInTheDocument();

    await act(async () => { electron.triggerMenuEvent('onReturnToStart'); });
    expect(screen.getByRole('heading', { name: 'Discard unsaved civilization changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Discard unsaved civilization changes?' })).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(screen.getByRole('heading', { name: 'Discard unsaved civilization changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Discard unsaved civilization changes?' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(electron.api.saveFile).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(electron.api.savePdfFile).toHaveBeenCalledTimes(2);
  });
});