import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StarSystemGeneratorModule } from './StarSystemGeneratorModule';
import { installMockElectronAPI } from '@shared/test/electronMock';

describe('StarSystemGeneratorModule', () => {
  it('generates a chosen star configuration and returns to the hub', async () => {
    const user = userEvent.setup();
    const onReturnToHub = vi.fn();
    const electron = installMockElectronAPI();
    electron.api.showCampaignSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/system.system.json' });
    render(<StarSystemGeneratorModule themeMode="dark" onThemeModeChange={vi.fn()} onReturnToHub={onReturnToHub} />);

    expect(screen.getByRole('heading', { name: 'Star System Generator' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Stars'));
    await user.click(screen.getByRole('option', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByText('1 star')).toBeInTheDocument();
    expect(screen.getByLabelText('Generated orbit diagram')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(electron.api.saveFile).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Science-informed' }));
    await user.clear(screen.getByLabelText('Seed'));
    await user.type(screen.getByLabelText('Seed'), 'Test Seed');
    await user.click(screen.getByLabelText('Life frequency'));
    await user.click(screen.getByRole('option', { name: 'None' }));
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByText('Science-informed', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Seed: Test Seed')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mass' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'GMG' })).toBeInTheDocument();
    expect(screen.getByText('GMG game translation')).toBeInTheDocument();
    expect(screen.getByText(/^G\d\/R\d\/A\d\/P\d\/H\d$/)).toBeInTheDocument();
    expect(screen.getAllByText('none').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(electron.api.saveFile).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(electron.api.savePdfFile).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(onReturnToHub).toHaveBeenCalledOnce();
  });
});