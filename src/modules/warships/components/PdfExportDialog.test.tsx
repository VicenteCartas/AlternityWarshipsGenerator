import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { PdfExportDialog } from './PdfExportDialog';

const theme = createTheme();

function renderDialog(overrides?: Partial<Parameters<typeof PdfExportDialog>[0]>) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onExport: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <PdfExportDialog {...props} />
      </ThemeProvider>
    ),
    ...props,
  };
}

describe('PdfExportDialog', () => {
  it('renders title', () => {
    renderDialog();
    expect(screen.getByText('Export to PDF')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Export to PDF')).not.toBeInTheDocument();
  });

  describe('Full Ship Sheet mode (default)', () => {
    it('shows checkbox options', () => {
      renderDialog();
      expect(screen.getByLabelText(/Combat Sheet/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Damage Zones/)).toBeInTheDocument();
      expect(screen.getByLabelText(/detailed component list/)).toBeInTheDocument();
    });

    it('checkboxes default to expected states', () => {
      renderDialog();
      expect(screen.getByLabelText(/Combat Sheet/)).toBeChecked();
      expect(screen.getByLabelText(/Damage Zones/)).toBeChecked();
      expect(screen.getByLabelText(/detailed component list/)).not.toBeChecked();
    });

    it('Select None unchecks all optional sections', async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByText('Select None'));

      expect(screen.getByLabelText(/Combat Sheet/)).not.toBeChecked();
      expect(screen.getByLabelText(/Damage Zones/)).not.toBeChecked();
      expect(screen.getByLabelText(/detailed component list/)).not.toBeChecked();
    });

    it('Select All checks all sections', async () => {
      const user = userEvent.setup();
      renderDialog();
      // First uncheck all, then check all
      await user.click(screen.getByText('Select None'));
      await user.click(screen.getByText('Select All'));

      expect(screen.getByLabelText(/Combat Sheet/)).toBeChecked();
      expect(screen.getByLabelText(/Damage Zones/)).toBeChecked();
      expect(screen.getByLabelText(/detailed component list/)).toBeChecked();
    });

    it('toggling a checkbox updates its state', async () => {
      const user = userEvent.setup();
      renderDialog();
      const combatSheet = screen.getByLabelText(/Combat Sheet/);
      expect(combatSheet).toBeChecked();
      await user.click(combatSheet);
      expect(combatSheet).not.toBeChecked();
    });

    it('Export button calls onExport with options and closes', async () => {
      const user = userEvent.setup();
      const { onExport, onClose } = renderDialog();
      await user.click(screen.getByText('Export'));
      expect(onExport).toHaveBeenCalledWith({
        includeCombat: true,
        includeDamageDiagram: true,
        includeDetailedSystems: false,
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('Cancel button calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
