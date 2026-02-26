/**
 * Shared table styling constants for consistent UI across all components
 */

/**
 * Header cell styling for data tables
 * Use: <TableCell sx={headerCellSx}>
 */
export const headerCellSx = {
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
} as const;

/**
 * Standardized column widths for common columns across all selection tables.
 * Use these to ensure consistent column sizing for columns with the same title.
 */
export const columnWidths = {
  name: 150,
  pl: 50,
  tech: 60,
  powerPerHp: 90,
  baseCost: 90,
  costPerHp: 90,
  minSize: 80,
  fuel: 60,
  cost: 80,
  hp: 60,
  description: undefined, // flex fill
} as const;

/**
 * Styling for a sticky first column in horizontally-scrollable tables.
 * Apply to the first <TableCell> in each header and body row.
 * Requires the parent Table to NOT use tableLayout: 'fixed'.
 */
export const stickyFirstColumnHeaderSx = {
  position: 'sticky',
  left: 0,
  zIndex: 3, // above other header cells (zIndex 2 by default for header)
  bgcolor: 'background.paper',
} as const;

export const stickyFirstColumnCellSx = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  // Layer semi-transparent hover/selected color on top of opaque paper background
  // using CSS gradient trick, so the result matches regular (non-sticky) cells exactly.
  'tr:hover &': {
    background: (theme: Record<string, any>) =>
      `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover}), linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper})`,
  },
  'tr.Mui-selected &, tr.Mui-selected:hover &': {
    background: (theme: Record<string, any>) =>
      `linear-gradient(${theme.palette.action.selected}, ${theme.palette.action.selected}), linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper})`,
  },
} as const;

/**
 * Styling for a TableContainer with always-visible horizontal scrollbar.
 */
export const scrollableTableContainerSx = {
  overflowX: 'auto',
  '&::-webkit-scrollbar': {
    height: 8,
  },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: 'action.disabled',
    borderRadius: 4,
  },
  '&::-webkit-scrollbar-track': {
    bgcolor: 'action.hover',
  },
} as const;

/**
 * Selectable row styling for data tables
 * Use: <TableRow sx={selectableRowSx} selected={isSelected}>
 */
export const selectableRowSx = {
  cursor: 'pointer',
  '&.Mui-selected': {
    backgroundColor: 'action.selected',
  },
  '&.Mui-selected:hover': {
    backgroundColor: 'action.selected',
  },
} as const;

/**
 * Description text with truncation styling
 * Use: <Typography sx={truncatedDescriptionSx}>
 */
export const truncatedDescriptionSx = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.3,
} as const;

/**
 * Configuration/add form Paper styling — distinct visual treatment
 * to separate config forms from adjacent selection tables.
 * Use: <Paper variant="outlined" sx={configFormSx}>
 */
export const configFormSx = {
  p: 2,
  mb: 2,
  borderColor: 'primary.main',
  borderWidth: 2,
  bgcolor: 'action.hover',
} as const;
