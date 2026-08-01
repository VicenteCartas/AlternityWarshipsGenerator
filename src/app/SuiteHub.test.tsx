import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { SuiteHub } from './SuiteHub';

describe('SuiteHub', () => {
  it('groups tools by task and opens the selected tool', async () => {
    const user = userEvent.setup();
    const openCharacters = vi.fn();
    const openWarships = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <SuiteHub
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onOpenCharacters={openCharacters}
          onOpenWarships={openWarships}
          onOpenTravel={vi.fn()}
          onOpenBattles={vi.fn()}
          onShowAbout={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Choose a tool' })).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Run a campaign')).toBeInTheDocument();
    await user.click(screen.getByText('Character Creator'));
    await user.click(screen.getByText('Warships Generator'));
    expect(openCharacters).toHaveBeenCalledOnce();
    expect(openWarships).toHaveBeenCalledOnce();
  });
});