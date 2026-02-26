import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { EditableDataGrid } from './EditableDataGrid';
import type { ColumnDef } from '../../services/modEditorSchemas';

// Mock formatters
vi.mock('../../services/formatters', () => ({
  ALL_TECH_TRACK_CODES: ['G', 'D', 'A', 'M', 'F'],
  getTechTrackName: (code: string) => `Track-${code}`,
}));

// Mock modValidationService
vi.mock('../../services/modValidationService', () => ({
  validateField: () => null,
}));

const theme = createTheme();

const testColumns: ColumnDef[] = [
  { key: 'id', label: 'ID', type: 'text', required: true, width: 100 },
  { key: 'name', label: 'Name', type: 'text', required: true, width: 200 },
  { key: 'value', label: 'Value', type: 'number', width: 80, min: 0 },
  { key: 'active', label: 'Active', type: 'boolean', width: 80 },
];

const testRows = [
  { id: 'item-1', name: 'First Item', value: 10, active: true },
  { id: 'item-2', name: 'Second Item', value: 20, active: false },
];

const defaultItem = { id: '', name: '', value: 0, active: false };

function renderGrid(overrides?: Partial<Parameters<typeof EditableDataGrid>[0]>) {
  const onChange = vi.fn();
  const props = {
    columns: testColumns,
    rows: testRows,
    onChange,
    defaultItem,
    ...overrides,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <EditableDataGrid {...props} />
      </ThemeProvider>
    ),
    onChange,
    props,
  };
}

describe('EditableDataGrid', () => {
  describe('rendering', () => {
    it('renders column headers', () => {
      renderGrid();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders row data', () => {
      renderGrid();
      expect(screen.getByText('item-1')).toBeInTheDocument();
      expect(screen.getByText('First Item')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('item-2')).toBeInTheDocument();
      expect(screen.getByText('Second Item')).toBeInTheDocument();
    });

    it('renders empty state when no rows', () => {
      renderGrid({ rows: [] });
      expect(screen.getByText(/0\s*items/i)).toBeInTheDocument();
    });

    it('renders Add Row button when not readOnly', () => {
      renderGrid();
      // The add button should exist (it has AddIcon)
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('row operations', () => {
    it('adds a new row when Add is clicked', async () => {
      const user = userEvent.setup();
      const { onChange } = renderGrid();
      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newRows = onChange.mock.calls[0][0];
      expect(newRows).toHaveLength(3);
      expect(newRows[2].id).toMatch(/^new-item-/);
    });

    it('deletes a row when delete is clicked', async () => {
      const user = userEvent.setup();
      const { onChange } = renderGrid();
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newRows = onChange.mock.calls[0][0];
      expect(newRows).toHaveLength(1);
      expect(newRows[0].id).toBe('item-2');
    });

    it('duplicates a row', async () => {
      const user = userEvent.setup();
      const { onChange } = renderGrid();
      const duplicateButtons = screen.getAllByRole('button', { name: /duplicate|copy/i });
      await user.click(duplicateButtons[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newRows = onChange.mock.calls[0][0];
      expect(newRows).toHaveLength(3);
      expect(newRows[1].name).toBe('First Item');
      expect(newRows[1].id).toContain('copy');
    });
  });

  describe('readOnly mode', () => {
    it('hides action buttons in readOnly mode', () => {
      renderGrid({ readOnly: true });
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('still renders row data in readOnly mode', () => {
      renderGrid({ readOnly: true });
      expect(screen.getByText('item-1')).toBeInTheDocument();
      expect(screen.getByText('First Item')).toBeInTheDocument();
    });
  });

  describe('disableAdd / disableDelete', () => {
    it('hides Add button when disableAdd is true', () => {
      renderGrid({ disableAdd: true });
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });

    it('hides delete buttons when disableDelete is true', () => {
      renderGrid({ disableDelete: true });
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });
});
