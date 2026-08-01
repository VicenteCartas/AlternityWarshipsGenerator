import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { AboutDialog } from './AboutDialog';

describe('AboutDialog', () => {
  it('uses the current repository and issue-report URLs without duplicating help documentation', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <AboutDialog open onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('link', { name: 'Project on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/VicenteCartas/AlternityWarshipsGenerator',
    );
    expect(screen.getByRole('link', { name: 'Report an Issue' })).toHaveAttribute(
      'href',
      'https://github.com/VicenteCartas/AlternityWarshipsGenerator/issues/new',
    );
    expect(screen.queryByRole('link', { name: 'Modding Guide' })).not.toBeInTheDocument();
  });
});