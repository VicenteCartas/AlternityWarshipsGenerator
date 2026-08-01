import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { CharacterPdfExportDialog } from './CharacterPdfExportDialog';

describe('CharacterPdfExportDialog', () => {
  it.each([
    ['Printable Character Sheet', 'sheet'],
    ['Detailed Character Report', 'report'],
  ] as const)('exports %s using the %s format', async (buttonName, format) => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <CharacterPdfExportDialog open onClose={onClose} onExport={onExport} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'Printable Character Sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detailed Character Report' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: buttonName }));
    expect(onExport).toHaveBeenCalledWith(format);
    expect(onClose).toHaveBeenCalled();
  });
});