import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@shared/services/dataLoader', () => ({
  loadAllGameData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./SuiteHub', () => ({
  SuiteHub: ({ onOpenCivilizations }: { onOpenCivilizations: () => void }) => (
    <button onClick={onOpenCivilizations}>Open Civilization Builder</button>
  ),
}));

vi.mock('@campaign/CivilizationBuilderModule', () => ({
  default: ({ onReturnToHub }: { onReturnToHub: () => void }) => (
    <main>
      <h1>Civilization Builder Tool</h1>
      <button onClick={onReturnToHub}>Workshop Home</button>
    </main>
  ),
}));

vi.mock('@warships/WarshipsModule', () => ({ default: () => null }));
vi.mock('@battles/BattlesModule', () => ({ default: () => null }));
vi.mock('@travel/TravelModule', () => ({ default: () => null }));
vi.mock('@characters/CharactersModule', () => ({ default: () => null }));
vi.mock('@campaign/StarSystemGeneratorModule', () => ({ default: () => null }));
vi.mock('./AboutDialog', () => ({ AboutDialog: () => null }));
vi.mock('./KeyboardShortcutsDialog', () => ({ KeyboardShortcutsDialog: () => null }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App tool navigation', () => {
  it('scrolls to the top when entering a tool and returning home', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(<App themeMode="dark" onThemeModeChange={vi.fn()} />);

    const openCivilizations = await screen.findByRole('button', { name: 'Open Civilization Builder' });
    scrollTo.mockClear();

    await user.click(openCivilizations);
    expect(await screen.findByRole('heading', { name: 'Civilization Builder Tool' })).toBeInTheDocument();
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }));

    scrollTo.mockClear();
    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(await screen.findByRole('button', { name: 'Open Civilization Builder' })).toBeInTheDocument();
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }));
  });
});
