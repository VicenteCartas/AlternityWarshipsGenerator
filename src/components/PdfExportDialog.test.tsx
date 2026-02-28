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
    onExportCombatRef: vi.fn(),
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
  it('renders title and two sheet-type buttons', () => {
    renderDialog();
    expect(screen.getByText('Export to PDF')).toBeInTheDocument();
    expect(screen.getByText('Full Ship Sheet')).toBeInTheDocument();
    expect(screen.getByText('Combat Reference')).toBeInTheDocument();
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

  describe('Combat Reference mode', () => {
    it('switches to combat mode and shows description', async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByText('Combat Reference'));

      // Should show combat description, not checkboxes
      expect(screen.getByText(/compact/)).toBeInTheDocument();
      expect(screen.queryByText('Select All')).not.toBeInTheDocument();
    });

    it('Export button calls onExportCombatRef and closes', async () => {
      const user = userEvent.setup();
      const { onExportCombatRef, onExport, onClose } = renderDialog();
      await user.click(screen.getByText('Combat Reference'));
      await user.click(screen.getByText('Export Combat Ref'));
      expect(onExportCombatRef).toHaveBeenCalled();
      expect(onExport).not.toHaveBeenCalled();
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
