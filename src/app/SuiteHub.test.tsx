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
    const openStarSystems = vi.fn();
    const openCivilizations = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <SuiteHub
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onOpenCharacters={openCharacters}
          onOpenWarships={openWarships}
          onOpenTravel={vi.fn()}
          onOpenBattles={vi.fn()}
          onOpenStarSystems={openStarSystems}
          onOpenCivilizations={openCivilizations}
          onShowAbout={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Choose a tool' })).toBeInTheDocument();
    const createSection = screen.getByText('Create');
    const settingSection = screen.getByText('Build a setting');
    expect(createSection).toBeInTheDocument();
    expect(settingSection).toBeInTheDocument();
    expect(createSection.compareDocumentPosition(settingSection) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByText('Run a campaign')).toBeInTheDocument();
    await user.click(screen.getByText('Character Creator'));
    await user.click(screen.getByText('Warships Generator'));
    await user.click(screen.getByText('Star System Generator'));
    await user.click(screen.getByText('Civilization Builder'));
    expect(openCharacters).toHaveBeenCalledOnce();
    expect(openWarships).toHaveBeenCalledOnce();
    expect(openStarSystems).toHaveBeenCalledOnce();
    expect(openCivilizations).toHaveBeenCalledOnce();
  });
});