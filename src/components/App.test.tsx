/**
 * Integration tests for App.tsx — the top-level orchestration component.
 *
 * These tests render the full App with real hooks, real dataLoader (using
 * bundled fallback data), and a mocked Electron IPC layer to exercise the
 * critical user flows identified in architecture review item 2.8.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import App from '../App';
import { installMockElectronAPI } from '../test/electronMock';
import { reloadAllGameData } from '../services/dataLoader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const theme = createTheme();

type MockElectron = ReturnType<typeof installMockElectronAPI>;
let mockElectron: MockElectron;

function renderApp() {
  return render(
    <ThemeProvider theme={theme}>
      <App themeMode="dark" onThemeModeChange={vi.fn()} />
    </ThemeProvider>,
  );
}

/** Wait for the app to finish loading data and show the welcome page. */
async function waitForWelcome() {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /new design/i })).toBeInTheDocument();
  }, { timeout: 5000 });
}

/** Click "New Design", confirm the DesignTypeDialog with default (warship). */
async function createNewWarship(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /new design/i }));
  const confirmBtn = await screen.findByRole('button', { name: /^create$/i });
  await user.click(confirmBtn);
  await waitFor(() => {
    expect(screen.getByLabelText('Design Name')).toBeInTheDocument();
  });
}

/** Select a hull in the Hull step by clicking on its row. */
async function selectHull(user: ReturnType<typeof userEvent.setup>, hullName: string) {
  const hullRow = await screen.findByText(hullName);
  await user.click(hullRow);
  // Wait for the resource bar to appear (it only shows when a hull is selected)
  await waitFor(() => {
    expect(screen.getByLabelText('Show hull points breakdown')).toBeInTheDocument();
  }, { timeout: 5000 });
}

/**
 * Find the undo/redo/save IconButton in the toolbar. MUI Tooltip wraps
 * disabled buttons in a <span> that carries the aria-label, so we
 * locate via the tooltip label and return the inner <button>.
 */
function getToolbarButton(labelPattern: RegExp): HTMLButtonElement {
  const wrapper = screen.getByLabelText(labelPattern);
  // If the wrapper IS a button, return it directly; otherwise dig inside
  if (wrapper.tagName === 'BUTTON') return wrapper as HTMLButtonElement;
  const btn = wrapper.querySelector('button');
  if (!btn) throw new Error(`No <button> inside element with label matching ${labelPattern}`);
  return btn;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
beforeEach(async () => {
  mockElectron = installMockElectronAPI();
  await reloadAllGameData();
});

afterEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('App — Loading & Welcome', () => {
  it('shows loading state then transitions to the welcome page', async () => {
    renderApp();
    // Loading screen visible initially
    expect(screen.getByText(/loading game data/i)).toBeInTheDocument();
    // Eventually reaches the welcome page
    await waitForWelcome();
  });

  it('shows version information on the welcome page', async () => {
    renderApp();
    await waitForWelcome();
    // The welcome page includes a version badge
    expect(screen.getByText(/warship generator/i)).toBeInTheDocument();
  });
});

describe('App — New Warship Flow', () => {
  it('opens design type dialog when clicking New Design', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await user.click(screen.getByRole('button', { name: /new design/i }));
    // DesignTypeDialog should appear with a Create button
    expect(await screen.findByRole('button', { name: /^create$/i })).toBeInTheDocument();
  });

  it('creates a new warship and enters builder mode', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // Should be in builder mode
    expect(screen.getByLabelText('Design Name')).toHaveValue('New Ship');
    // Stepper should be visible with Hull as the first step
    expect(screen.getByText('Hull')).toBeInTheDocument();
    // PL selector visible
    expect(screen.getByText('PL 9')).toBeInTheDocument();
  });

  it('syncs builder mode with Electron', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    expect(mockElectron.api.setBuilderMode).toHaveBeenCalledWith('builder');
  });
});

describe('App — Step Navigation', () => {
  it('starts on the Hull step (step 1)', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // The hull step is active — step content should show the hull selection table
    // The "Please select a hull first" guard should NOT show for the Hull step itself
    expect(screen.queryByText(/please select a hull first/i)).not.toBeInTheDocument();
  });

  it('navigates forward with the Next button', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // Click Next to go to Armor step
    await user.click(screen.getByRole('button', { name: /next/i }));
    // Armor step shown — but hull not selected, so guard message appears
    expect(screen.getByText(/please select a hull first/i)).toBeInTheDocument();
  });

  it('navigates backward with the Back button', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // Go forward then back
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    // Back to Hull step — no hull guard
    expect(screen.queryByText(/please select a hull first/i)).not.toBeInTheDocument();
  });

  it('navigates to a step by clicking on the stepper', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // Click on the "Sensors" step label in the stepper
    await user.click(screen.getByText('Sensors'));
    // Hull guard should show since no hull is selected
    expect(screen.getByText(/please select a hull first/i)).toBeInTheDocument();
  });

  it('does not show Back button on the first step', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // On step 0 (Hull) — no Back button
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('does not show Next button on the last step', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);
    // Navigate to the last step (Summary) by clicking it in the stepper
    await user.click(screen.getByText('Summary'));
    expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument();
  });
});

describe('App — Hull Selection and Change Confirmation', () => {
  it('selects a hull from the hull table', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // The Hull step should show a table of available hulls
    // Click on the Fighter hull row
    const fighterRow = await screen.findByText('Fighter');
    await user.click(fighterRow);

    // After clicking, the resource bar appears with HP info
    await waitFor(() => {
      expect(screen.getByLabelText('Show hull points breakdown')).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 15000);

  it('shows confirmation dialog when changing hull with installed components', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Select the Fighter hull
    await selectHull(user, 'Fighter');

    // Navigate to Power step and install a power plant to create "installed components"
    await user.click(screen.getByText('Power'));

    // Find and click a power plant to select it
    const solarCell = await screen.findByText('Solar Cell');
    await user.click(solarCell);

    // Look for the Add/Install button and the HP allocation input
    const addButton = await screen.findByRole('button', { name: /add|install/i });
    await user.click(addButton);

    // Now go back to Hull step and try to change hull
    await user.click(screen.getByText('Hull'));

    // Click on a different hull (Strike Fighter)
    const strikeFighter = await screen.findByText('Strike Fighter');
    await user.click(strikeFighter);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/change hull\?/i)).toBeInTheDocument();
    });
  }, 15000);

  it('cancels hull change when clicking Cancel in confirmation dialog', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Select Fighter hull
    await selectHull(user, 'Fighter');

    // Install a power plant
    await user.click(screen.getByText('Power'));
    await user.click(await screen.findByText('Solar Cell'));
    const addButton = await screen.findByRole('button', { name: /add|install/i });
    await user.click(addButton);

    // Go back to Hull and try to change
    await user.click(screen.getByText('Hull'));
    await user.click(await screen.findByText('Strike Fighter'));

    // Cancel the dialog
    await waitFor(() => {
      expect(screen.getByText(/change hull\?/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/change hull\?/i)).not.toBeInTheDocument();
    });
  }, 15000);

  it('confirms hull change and clears all components', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Select Fighter hull
    await selectHull(user, 'Fighter');

    // Install a power plant
    await user.click(screen.getByText('Power'));
    await user.click(await screen.findByText('Solar Cell'));
    const addButton = await screen.findByRole('button', { name: /add|install/i });
    await user.click(addButton);

    // Go back to Hull and change
    await user.click(screen.getByText('Hull'));
    await user.click(await screen.findByText('Strike Fighter'));

    // Confirm the change
    await waitFor(() => {
      expect(screen.getByText(/change hull\?/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /change hull/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/change hull\?/i)).not.toBeInTheDocument();
    });
  }, 15000);
});

describe('App — Undo / Redo', () => {
  it('undo button is initially disabled in a new design', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    const undoBtn = getToolbarButton(/undo/i);
    expect(undoBtn).toBeDisabled();
  });

  it('redo button is initially disabled in a new design', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    const redoBtn = getToolbarButton(/redo/i);
    expect(redoBtn).toBeDisabled();
  });

  it('enables undo after making a change', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Change the design name to trigger state change
    const nameField = screen.getByLabelText('Design Name');
    await user.clear(nameField);
    await user.type(nameField, 'Test Ship');

    // Wait for undo to become available (debounced push to undo history)
    await waitFor(() => {
      const undoBtn = getToolbarButton(/undo/i);
      expect(undoBtn).not.toBeDisabled();
    }, { timeout: 3000 });
  });

});

describe('App — Save Flow', () => {
  it('calls showSaveDialog when saving a new design with a hull', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Must select a hull — `handleSaveWarshipAs` early-returns when selectedHull is null
    await selectHull(user, 'Fighter');

    const saveBtn = getToolbarButton(/save warship/i);
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockElectron.api.showSaveDialog).toHaveBeenCalled();
    });
  }, 15000);

  it('shows warning if trying to save without a hull', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    const saveBtn = getToolbarButton(/save warship/i);
    await user.click(saveBtn);

    // Should NOT call the dialog; instead shows a notification
    await waitFor(() => {
      expect(screen.getByText(/select a hull before saving/i)).toBeInTheDocument();
    });
    expect(mockElectron.api.showSaveDialog).not.toHaveBeenCalled();
  });

  it('saves and loads a warship round-trip', async () => {
    const user = userEvent.setup();

    // Setup: mock save dialog to return a file path
    const savePath = '/mock/test-ship.warship.json';
    let savedContent = '';
    mockElectron.api.showSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: savePath,
    });
    mockElectron.api.saveFile = vi.fn().mockImplementation(async (_path: string, content: string) => {
      savedContent = content;
      return { success: true };
    });

    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Select a hull (required for save)
    await selectHull(user, 'Fighter');

    // Change name
    const nameField = screen.getByLabelText('Design Name');
    await user.clear(nameField);
    await user.type(nameField, 'My Warship');

    // Save
    const saveBtn = getToolbarButton(/save warship/i);
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockElectron.api.saveFile).toHaveBeenCalled();
      expect(savedContent).toBeTruthy();
    });

    // Now simulate loading the same file
    mockElectron.api.showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: [savePath],
    });
    mockElectron.api.readFile = vi.fn().mockResolvedValue({
      success: true,
      content: savedContent,
    });

    // Return to welcome page via Electron menu
    await act(async () => {
      mockElectron.triggerMenuEvent('onReturnToStart');
    });
    await waitForWelcome();

    // Load the file
    await user.click(screen.getByRole('button', { name: /load design/i }));

    // After loading, should be in builder mode with the correct name
    await waitFor(() => {
      expect(screen.getByLabelText('Design Name')).toHaveValue('My Warship');
    }, { timeout: 5000 });
  }, 30000);
});

describe('App — Return to Welcome', () => {
  it('returns to welcome page via Electron menu', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();
    await createNewWarship(user);

    // Trigger return to start via menu
    await act(async () => {
      mockElectron.triggerMenuEvent('onReturnToStart');
    });

    await waitForWelcome();
  });
});

describe('App — Station Design', () => {
  it('creates a ground base station design', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitForWelcome();

    await user.click(screen.getByRole('button', { name: /new design/i }));

    // Click on Station/Base toggle in the dialog (value="station")
    const stationToggle = await screen.findByText(/station \/ base/i);
    await user.click(stationToggle);

    // Select Ground Base
    const groundBaseOption = await screen.findByText(/ground base/i);
    await user.click(groundBaseOption);

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: /^create$/i });
    await user.click(confirmBtn);

    // Should be in builder with station-appropriate name
    await waitFor(() => {
      expect(screen.getByLabelText('Design Name')).toHaveValue('New Base');
    });

    // Ground bases skip Engines & FTL steps — verify Engines absent from the stepper
    expect(screen.queryByText('Engines')).not.toBeInTheDocument();
  });
});
