import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { DocumentWelcomeActions } from './DocumentWelcomeActions';

afterEach(() => {
  Reflect.deleteProperty(window, 'electronAPI');
});

describe('DocumentWelcomeActions', () => {
  it('renders standardized New/Open actions and filtered recent documents', async () => {
    const user = userEvent.setup();
    const electron = installMockElectronAPI();
    electron.api.getRecentFiles = vi.fn().mockResolvedValue([
      'C:\\Documents\\Scout.character.json',
      'C:\\Documents\\Cruiser.warship.json',
    ]);
    const onNew = vi.fn();
    const onOpen = vi.fn();
    const onOpenRecent = vi.fn();

    render(
      <ThemeProvider theme={createTheme()}>
        <DocumentWelcomeActions
          kind="character"
          onNew={onNew}
          onOpen={onOpen}
          onOpenRecent={onOpenRecent}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'New Character' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Open Character' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Scout\.character\.json/ })).toBeInTheDocument();
    expect(screen.queryByText('Cruiser.warship.json')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Character' }));
    await user.click(screen.getByRole('button', { name: 'Open Character' }));
    await user.click(screen.getByRole('button', { name: /Scout\.character\.json/ }));

    expect(onNew).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledOnce();
    await waitFor(() => expect(onOpenRecent).toHaveBeenCalledWith('C:\\Documents\\Scout.character.json'));
  });
});
