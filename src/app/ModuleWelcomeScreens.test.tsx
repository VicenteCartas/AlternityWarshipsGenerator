import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharactersWelcome } from '@characters/components/CharactersWelcome';
import { WarshipsWelcome } from '@warships/components/WarshipsWelcome';
import { BattlesWelcome } from '@battles/components/BattlesWelcome';
import { StarSystemGeneratorModule } from '@campaign/StarSystemGeneratorModule';
import { SectorGeneratorModule } from '@campaign/SectorGeneratorModule';
import { CivilizationBuilderModule } from '@campaign/CivilizationBuilderModule';
import { ArtifactDesignerModule } from '@campaign/ArtifactDesignerModule';
import { TravelModule } from '@travel/TravelModule';

const theme = createTheme();

function renderScreen(node: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
}

afterEach(cleanup);

describe('module welcome screens', () => {
  it.each([
    {
      name: 'Character Creator',
      primary: 'New Character',
      secondary: 'Open Character',
      node: (
        <CharactersWelcome
          onNewCharacter={vi.fn()}
          onOpenCharacter={vi.fn()}
          onOpenRecent={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Warships Generator',
      primary: 'New Design',
      secondary: 'Open Design',
      node: (
        <WarshipsWelcome
          onNewWarship={vi.fn()}
          onLoadWarship={vi.fn()}
          onOpenRecent={vi.fn()}
          onManageMods={vi.fn()}
          onOpenLibrary={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Battle Resolution',
      primary: 'New Battle',
      secondary: 'Open Battle',
      node: (
        <BattlesWelcome
          onNewBattle={vi.fn()}
          onOpenBattle={vi.fn()}
          onOpenRecent={vi.fn()}
          onOpenLibrary={vi.fn()}
          onManageMods={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Star System Generator',
      primary: 'New Star System',
      secondary: 'Open Star System',
      node: (
        <StarSystemGeneratorModule
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Star Sector Generator',
      primary: 'New Star Sector',
      secondary: 'Open Star Sector',
      node: (
        <SectorGeneratorModule
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Civilization Builder',
      primary: 'New Civilization',
      secondary: 'Open Civilization',
      node: (
        <CivilizationBuilderModule
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Travel Calculator',
      primary: 'New Trip',
      secondary: 'Open Trip',
      node: (
        <TravelModule
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
    {
      name: 'Alien Artifact Designer',
      primary: 'New Artifact',
      secondary: 'Open Artifact',
      node: (
        <ArtifactDesignerModule
          themeMode="light"
          onThemeModeChange={vi.fn()}
          onReturnToHub={vi.fn()}
        />
      ),
    },
  ])('uses the shared shell for $name', ({ name, primary, secondary, node }) => {
    renderScreen(node);

    expect(screen.getByRole('button', { name: 'Workshop Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: primary })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: secondary })).toHaveClass('MuiButton-text');
  });
});
