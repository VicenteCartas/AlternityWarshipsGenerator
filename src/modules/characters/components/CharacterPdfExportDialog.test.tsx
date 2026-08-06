import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { CharacterPdfExportDialog } from './CharacterPdfExportDialog';

describe('CharacterPdfExportDialog', () => {
  it.each([
    ['NPC Profile', 'npc'],
    ['Player Character Sheet', 'pc'],
  ] as const)('exports %s using the %s format', async (buttonName, format) => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <CharacterPdfExportDialog open onClose={onClose} onExport={onExport} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'NPC Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Player Character Sheet' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: buttonName }));
    expect(onExport).toHaveBeenCalledWith(format);
    expect(onClose).toHaveBeenCalled();
  });
});