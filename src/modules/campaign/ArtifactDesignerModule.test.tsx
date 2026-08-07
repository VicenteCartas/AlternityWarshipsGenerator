import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { ArtifactDesignerModule } from './ArtifactDesignerModule';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ArtifactDesignerModule', () => {
  it('generates, edits, saves, exports, and protects an alien artifact', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    electron.api.showCampaignSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: '/mock/gate.artifact.json',
    });
    render(
      <ArtifactDesignerModule
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        onReturnToHub={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Alien Artifact Designer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New Artifact' }));
    expect(screen.getByLabelText('Artifact name')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Artifact name'));
    await user.type(screen.getByLabelText('Artifact name'), 'Gate of Glass');
    await user.click(screen.getByRole('button', { name: 'Generate Artifact' }));
    expect(screen.getByText('Design valid')).toBeInTheDocument();

    const lockForm = screen.getByRole('button', { name: 'Lock form' });
    await user.click(lockForm);
    expect(screen.getByRole('button', { name: 'Unlock form' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll form' })).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Story & Summary' }));
    await user.type(screen.getByLabelText('Creator or civilization'), 'Unknown precursors');
    await user.type(screen.getByLabelText('Campaign hooks'), 'A rival team has the activation key.');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(electron.api.saveFile).toHaveBeenCalledOnce());
    const savedContent = vi.mocked(electron.api.saveFile).mock.calls[0][1] as string;
    expect(savedContent).toContain('Gate of Glass');
    expect(savedContent).toContain('Unknown precursors');

    await user.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(electron.api.savePdfFile).toHaveBeenCalledOnce();

    await user.type(screen.getByLabelText('Notes'), 'Unsaved note');
    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(screen.getByRole('heading', { name: 'Discard unsaved artifact changes?' })).toBeInTheDocument();
  });

  it('rolls perk and flaw packages and explains package entry generation', async () => {
    const user = userEvent.setup();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    random.mockReturnValueOnce(0.99).mockReturnValueOnce(0.25);
    render(
      <ArtifactDesignerModule
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        onReturnToHub={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'New Artifact' }));

    await user.click(screen.getByRole('button', { name: 'Roll d8' }));
    expect(screen.getByRole('combobox', { name: 'Balance package (d8)' })).toHaveTextContent('Roll 8');

    await user.click(screen.getByRole('combobox', { name: 'Acquisition' }));
    await user.click(screen.getByRole('option', { name: 'Alien Artifact flaw' }));
    await user.click(screen.getByRole('button', { name: 'Roll d8' }));
    expect(screen.getByRole('combobox', { name: 'Balance package (d8)' })).toHaveTextContent('Roll 3');

    await user.click(screen.getByRole('tab', { name: /Powers/ }));
    expect(screen.getByText(/Replaces the current power list with random powers matching balance roll 3/)).toBeInTheDocument();
    expect(screen.getByText(/A secondary purpose is rolled from G52 first/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roll Package Powers' }));
    expect(screen.getByRole('tab', { name: 'Powers (2)' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Drawbacks/ }));
    expect(screen.getByText(/random G56 entries matching balance roll 3: 2 Moderate/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roll Package Drawbacks' }));
    expect(screen.getByRole('tab', { name: 'Drawbacks (2)' })).toBeInTheDocument();
    expect(screen.getByText('Design valid')).toBeInTheDocument();
  });
});
