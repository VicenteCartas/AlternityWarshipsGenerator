import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

describe('KeyboardShortcutsDialog', () => {
  it('shows commands for the active tool', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <KeyboardShortcutsDialog open onClose={vi.fn()} context="characters" />
      </ThemeProvider>,
    );
    expect(screen.getByText('New Character')).toBeInTheDocument();
    expect(screen.getByText('Save Character As')).toBeInTheDocument();
    expect(screen.queryByText('Duplicate Design')).not.toBeInTheDocument();
  });
});