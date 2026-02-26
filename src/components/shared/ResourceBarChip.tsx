import { Box, Popover, Typography, Divider, Tooltip, useTheme, alpha } from '@mui/material';
import { useState, useRef, type MouseEvent, type ReactNode } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { formatCost } from '../../services/formatters';

/** One segment in the stacked bar */
export interface BarSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** One row in the popover breakdown legend */
export interface BreakdownRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface ResourceBarChipProps {
  /** Text label displayed centered on the bar, e.g. "HP: 12 / 45" */
  label: string;
  /** Colored segments for the popover bar and tooltips */
  segments: BarSegment[];
  /** Maximum capacity — bar fills relative to this. If omitted, bar fills fully (proportional mode). */
  capacity?: number;
  /** Whether the resource is over budget */
  isOverBudget?: boolean;
  /** Popover title */
  popoverTitle: string;
  /** Breakdown rows for the popover legend (omit for custom popover content) */
  breakdownRows?: BreakdownRow[];
  /** Format values as cost */
  isCost?: boolean;
  /** Unit suffix for values (e.g. "HP", "PP"). Ignored when isCost is true. */
  unit?: string;
  /** Total line label/value at bottom of popover */
  totalLabel?: string;
  totalValue?: number;
  /** Optional extra content rendered inside the popover (e.g. power scenario checkboxes) */
  popoverExtra?: ReactNode;
  /** Optional tooltip wrapping the bar-chip */
  tooltip?: string;
  /** Accessible label for the bar */
  ariaLabel: string;
}

/**
 * A clickable bar-shaped indicator that replaces the traditional Chip for resource display.
 * Shows a stacked horizontal bar with text overlay and opens a popover with detailed breakdown.
 */
export function ResourceBarChip({
  label,
  segments,
  capacity,
  isOverBudget = false,
  popoverTitle,
  breakdownRows,
  isCost = false,
  unit = '',
  totalLabel,
  totalValue,
  popoverExtra,
  tooltip,
  ariaLabel,
}: ResourceBarChipProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);
  const open = Boolean(anchorEl);

  const totalUsed = segments.reduce((sum, s) => sum + s.value, 0);
  const barMax = capacity != null ? Math.max(totalUsed, capacity) : totalUsed;
  const fmt = (v: number) => isCost ? formatCost(v) : `${v}${unit ? ` ${unit}` : ''}`;

  // Chip bar: single fill color based on status
  const fillColor = isOverBudget
    ? theme.palette.error.main
    : isCost
      ? theme.palette.info.main   // neutral blue for cost (no budget limit)
      : theme.palette.success.main;
  const fillPct = capacity != null && capacity > 0
    ? Math.min((totalUsed / capacity) * 100, 100)
    : 100; // cost mode: always full
  const trackColor = alpha(fillColor, 0.15);
  const borderColor = isOverBudget
    ? theme.palette.error.main
    : theme.palette.divider;

  const barElement = (
    <Box
      ref={barRef}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setAnchorEl(barRef.current);
        }
      }}
      sx={{
        position: 'relative',
        height: 24,
        minWidth: 140,
        maxWidth: 200,
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        bgcolor: trackColor,
        border: '1px solid',
        borderColor,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 1,
        },
      }}
    >
      {/* Single-color fill bar */}
      <Box
        sx={{
          width: `${fillPct}%`,
          height: '100%',
          bgcolor: alpha(fillColor, 0.55),
          transition: 'width 0.3s ease',
        }}
      />

      {/* Centered text label */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '0.7rem',
          color: theme.palette.text.primary,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      {/* Arrow pinned right */}
      <ArrowDropDownIcon
        sx={{
          position: 'absolute',
          right: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
          opacity: 0.5,
          color: theme.palette.text.primary,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );

  return (
    <>
      {/* Bar-chip, optionally wrapped in tooltip */}
      {tooltip ? <Tooltip title={tooltip}>{barElement}</Tooltip> : barElement}

      {/* Popover with bar + legend breakdown */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 260, maxWidth: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            {popoverTitle}
          </Typography>

          {/* Popover stacked bar */}
          <Box
            sx={{
              width: '100%',
              height: 14,
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              border: '1px solid',
              borderColor: isOverBudget ? 'error.main' : 'divider',
              mb: 1.5,
            }}
          >
            {segments.map((seg) => {
              if (seg.value <= 0 || barMax === 0) return null;
              const widthPct = (seg.value / barMax) * 100;
              return (
                <Tooltip key={seg.key} title={`${seg.label}: ${fmt(seg.value)}`} arrow placement="top">
                  <Box
                    sx={{
                      width: `${widthPct}%`,
                      height: '100%',
                      bgcolor: seg.color,
                      minWidth: widthPct > 0 ? 2 : 0,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          {/* Legend rows with color dots */}
          {(breakdownRows || []).map((row) => (
            <Typography
              key={row.key}
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 0.15,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '2px',
                    bgcolor: row.color,
                    flexShrink: 0,
                  }}
                />
                <span>{row.label}</span>
              </Box>
              <span>{fmt(row.value)}</span>
            </Typography>
          ))}

          {/* Extra content (e.g. power scenario checkboxes) */}
          {popoverExtra}

          {/* Total line */}
          {totalLabel != null && totalValue != null && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant="body2"
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                }}
              >
                <span>{totalLabel}</span>
                <span>{fmt(totalValue)}</span>
              </Typography>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
