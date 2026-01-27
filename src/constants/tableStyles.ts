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
