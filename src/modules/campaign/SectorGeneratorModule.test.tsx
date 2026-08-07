import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { SectorGeneratorModule } from './SectorGeneratorModule';

describe('SectorGeneratorModule', () => {
  it('distinguishes a new random seed from regeneration with the entered seed', () => {
    installMockElectronAPI();
    render(
      <SectorGeneratorModule
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        onReturnToHub={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'New Star Sector' }));
    const seed = screen.getByLabelText('Seed');
    fireEvent.click(screen.getByRole('button', { name: 'Generate with New Seed' }));
    expect((seed as HTMLInputElement).value).toMatch(/^Sector [0-9A-F]{8}$/);

    fireEvent.change(seed, { target: { value: 'Orion Reach' } });
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate from Seed' }));
    expect(seed).toHaveValue('Orion Reach');
  });

  it('generates, edits, develops, saves, exports, and protects a star sector', async () => {
    const electron = installMockElectronAPI();
    electron.api.showCampaignSaveDialog = vi.fn().mockImplementation(async (kind: string) => ({
      canceled: false,
      filePath: kind === 'system' ? '/mock/developed.system.json' : '/mock/orion.sector.json',
    }));
    render(
      <SectorGeneratorModule
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        onReturnToHub={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Star Sector Generator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New Star Sector' }));
    expect(screen.getByLabelText('Interactive star sector map')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Science-informed' }));
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: 'Orion Reach' } });
    fireEvent.change(screen.getByLabelText('Mapped systems'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate from Seed' }));
    expect(screen.getByText('12 mapped')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((entry) => entry.textContent)).toEqual([
      'Map',
      'Factions & Borders (3)',
      'Systems (12)',
      'Spatial Features (4)',
      'Gazetteer (8)',
    ]);

    const firstSystem = screen.getAllByRole('button', { name: /^Select / })[0];
    fireEvent.click(firstSystem);
    fireEvent.click(screen.getByRole('button', { name: 'Lock system' }));
    expect(screen.getByRole('button', { name: 'Reroll Map Entry' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Detailed System' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Stars');
    expect(screen.getByRole('dialog')).toHaveTextContent('Planets');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Detailed system available:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export .system.json' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export .system.json' }));
    await waitFor(() => expect(electron.api.showCampaignSaveDialog)
      .toHaveBeenCalledWith('system', expect.stringMatching(/\.system\.json$/)));

    const selectedSystemName = firstSystem.getAttribute('aria-label')!.replace('Select ', '');
    fireEvent.click(screen.getByRole('tab', { name: /Systems/ }));
    expect(screen.getByText('Detailed')).toBeInTheDocument();
    expect(screen.getByText('Preserves generated detailed systems.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild Routes & Ownership' }));
    expect(screen.getByText('Detailed')).toBeInTheDocument();
    const detailedRow = screen.getByRole('row', { name: new RegExp(selectedSystemName) });
    expect(within(detailedRow).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      `View detailed system for ${selectedSystemName}`,
      `Show coordinates and details for ${selectedSystemName}`,
      `Remove ${selectedSystemName}`,
    ]);
    fireEvent.click(screen.getByRole('button', { name: `Show coordinates and details for ${selectedSystemName}` }));
    expect(screen.getByLabelText('X')).toBeInTheDocument();
    expect(screen.getByLabelText('Y')).toBeInTheDocument();
    expect(screen.getByLabelText('Z')).toBeInTheDocument();
    expect(screen.getByLabelText('Importance')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Factions & Borders/ }));
    expect(screen.getByRole('button', { name: 'Regenerate Factions & Borders' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate Spatial Features' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Faction name')).toHaveLength(3);
    expect(screen.getByText('Locked')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Show details for / })[0]);
    expect(screen.getByLabelText('Government')).toBeInTheDocument();
    expect(screen.getByLabelText('Goal')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Spatial Features/ }));
    expect(screen.getByRole('button', { name: 'Regenerate Spatial Features' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: /kind$/ })).toHaveLength(4);
    const firstFeatureExpander = screen.getAllByRole('button', { name: /^Show description for / })[0];
    fireEvent.click(firstFeatureExpander);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Gazetteer/ }));
    fireEvent.change(screen.getByLabelText('Sector overview'), { target: { value: 'A disputed frontier cluster.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(electron.api.saveFile).toHaveBeenCalledWith(
      '/mock/orion.sector.json',
      expect.stringContaining('A disputed frontier cluster.'),
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    await waitFor(() => expect(electron.api.savePdfFile).toHaveBeenCalledOnce());

    fireEvent.change(screen.getByLabelText('Sector overview'), { target: { value: 'A disputed frontier cluster. Unsaved sector note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(screen.getByRole('heading', { name: 'Discard unsaved sector changes?' })).toBeInTheDocument();
  });
});
