import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { describe, expect, it, vi } from 'vitest';
import {
  ModuleWelcomeAction,
  ModuleWelcomeSection,
  ModuleWelcomeShell,
} from './ModuleWelcome';

function renderWelcome(onHome = vi.fn(), onNew = vi.fn()) {
  return {
    onHome,
    onNew,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <ModuleWelcomeShell
          title="Character Creator"
          description="Build and advance heroes"
          icon={<PersonAddAlt1Icon />}
          onReturnToHub={onHome}
        >
          <ModuleWelcomeSection label="Start">
            <ModuleWelcomeAction label="New Character" icon={<AddIcon />} onClick={onNew} primary />
            <ModuleWelcomeAction label="Open Character" icon={<FolderOpenIcon />} />
          </ModuleWelcomeSection>
          <ModuleWelcomeSection label="Planned">
            <ModuleWelcomeAction label="Character Library" icon={<FolderOpenIcon />} disabled />
          </ModuleWelcomeSection>
        </ModuleWelcomeShell>
      </ThemeProvider>,
    ),
  };
}

describe('ModuleWelcome', () => {
  it('renders one consistent module header and action hierarchy', () => {
    renderWelcome();

    expect(screen.getByRole('button', { name: 'Workshop Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Character Creator' })).toBeInTheDocument();
    expect(screen.getByText('Build and advance heroes')).toBeInTheDocument();
    expect(screen.getByText(/^v\d/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Character' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Open Character' })).toHaveClass('MuiButton-text');
    expect(screen.getByRole('button', { name: 'Character Library' })).toBeDisabled();
  });

  it('forwards navigation and primary actions', async () => {
    const user = userEvent.setup();
    const { onHome, onNew } = renderWelcome();

    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    await user.click(screen.getByRole('button', { name: 'New Character' }));

    expect(onHome).toHaveBeenCalledOnce();
    expect(onNew).toHaveBeenCalledOnce();
  });
});
