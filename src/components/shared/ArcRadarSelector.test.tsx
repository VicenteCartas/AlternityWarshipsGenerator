import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { ArcRadarSelector } from './ArcRadarSelector';
import type { FiringArc } from '../../types/weapon';

// Mock createSectorPath from utilities
vi.mock('../../services/utilities', () => ({
  createSectorPath: () => 'M0,0 L1,1 Z',
}));

const theme = createTheme();

function renderSelector(overrides?: Partial<Parameters<typeof ArcRadarSelector>[0]>) {
  const onArcToggle = vi.fn();
  const props = {
    selectedArcs: [] as FiringArc[],
    onArcToggle,
    showZeroArcs: false,
    maxStandardArcs: 4,
    maxZeroArcs: 0,
    ...overrides,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <ArcRadarSelector {...props} />
      </ThemeProvider>
    ),
    onArcToggle,
  };
}

describe('ArcRadarSelector', () => {
  describe('standard arcs', () => {
    it('renders all four standard arc sectors', () => {
      renderSelector();
      expect(screen.getByRole('checkbox', { name: /Fwd arc/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Stbd arc/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Aft arc/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Port arc/ })).toBeInTheDocument();
    });

    it('marks selected arcs as checked', () => {
      renderSelector({ selectedArcs: ['forward', 'aft'] });
      expect(screen.getByRole('checkbox', { name: /Fwd arc/ })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: /Aft arc/ })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: /Stbd arc/ })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('checkbox', { name: /Port arc/ })).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onArcToggle with arc name and isZeroArc=false on click', async () => {
      const user = userEvent.setup();
      const { onArcToggle } = renderSelector();
      await user.click(screen.getByRole('checkbox', { name: /Fwd arc/ }));
      expect(onArcToggle).toHaveBeenCalledWith('forward', false);
    });

    it('calls onArcToggle for each arc', async () => {
      const user = userEvent.setup();
      const { onArcToggle } = renderSelector();
      await user.click(screen.getByRole('checkbox', { name: /Stbd arc/ }));
      expect(onArcToggle).toHaveBeenCalledWith('starboard', false);
      await user.click(screen.getByRole('checkbox', { name: /Aft arc/ }));
      expect(onArcToggle).toHaveBeenCalledWith('aft', false);
      await user.click(screen.getByRole('checkbox', { name: /Port arc/ }));
      expect(onArcToggle).toHaveBeenCalledWith('port', false);
    });
  });

  describe('zero arcs', () => {
    it('does not render zero arcs when showZeroArcs is false', () => {
      renderSelector({ showZeroArcs: false });
      expect(screen.queryByRole('checkbox', { name: /Zero-range/ })).not.toBeInTheDocument();
    });

    it('renders zero arc sectors when showZeroArcs is true', () => {
      renderSelector({ showZeroArcs: true, maxZeroArcs: 4 });
      expect(screen.getByRole('checkbox', { name: /Zero-range forward/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Zero-range starboard/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Zero-range aft/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Zero-range port/ })).toBeInTheDocument();
    });

    it('zero arcs are disabled when corresponding standard arc is not selected', () => {
      renderSelector({ showZeroArcs: true, maxZeroArcs: 4, selectedArcs: ['forward'] });
      // Forward zero-arc should be enabled (forward is selected)
      expect(screen.getByRole('checkbox', { name: /Zero-range forward/ })).toHaveAttribute('aria-disabled', 'false');
      // Others should be disabled
      expect(screen.getByRole('checkbox', { name: /Zero-range starboard/ })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('checkbox', { name: /Zero-range aft/ })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('checkbox', { name: /Zero-range port/ })).toHaveAttribute('aria-disabled', 'true');
    });

    it('calls onArcToggle with isZeroArc=true for zero arcs', async () => {
      const user = userEvent.setup();
      const { onArcToggle } = renderSelector({
        showZeroArcs: true,
        maxZeroArcs: 4,
        selectedArcs: ['forward'],
      });
      await user.click(screen.getByRole('checkbox', { name: /Zero-range forward/ }));
      expect(onArcToggle).toHaveBeenCalledWith('zero-forward', true);
    });

    it('does not fire onArcToggle for disabled zero arcs', async () => {
      const user = userEvent.setup();
      const { onArcToggle } = renderSelector({
        showZeroArcs: true,
        maxZeroArcs: 4,
        selectedArcs: [], // no standard arcs selected
      });
      await user.click(screen.getByRole('checkbox', { name: /Zero-range forward/ }));
      expect(onArcToggle).not.toHaveBeenCalled();
    });

    it('all zero arcs disabled when disableZeroArcs is true', () => {
      renderSelector({
        showZeroArcs: true,
        maxZeroArcs: 4,
        disableZeroArcs: true,
        selectedArcs: ['forward', 'aft', 'port', 'starboard'],
      });
      expect(screen.getByRole('checkbox', { name: /Zero-range forward/ })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('checkbox', { name: /Zero-range starboard/ })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('legend', () => {
    it('shows Standard legend', () => {
      renderSelector();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('shows Zero legend only when showZeroArcs is true', () => {
      renderSelector({ showZeroArcs: false });
      expect(screen.queryByText('Zero')).not.toBeInTheDocument();
    });

    it('shows Zero legend when showZeroArcs is true', () => {
      renderSelector({ showZeroArcs: true, maxZeroArcs: 4 });
      expect(screen.getByText('Zero')).toBeInTheDocument();
    });
  });

  describe('arc count display', () => {
    it('shows max arc counts in header', () => {
      renderSelector({ maxStandardArcs: 3, showZeroArcs: true, maxZeroArcs: 2 });
      expect(screen.getByText(/Std: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Zero: 2/)).toBeInTheDocument();
    });

    it('shows "all" for maxZeroArcs of 4', () => {
      renderSelector({ showZeroArcs: true, maxZeroArcs: 4 });
      expect(screen.getByText(/Zero: all/)).toBeInTheDocument();
    });
  });
});
