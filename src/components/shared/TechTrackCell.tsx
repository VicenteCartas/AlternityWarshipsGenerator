import { TableCell, Tooltip, Typography } from '@mui/material';
import type { TechTrack } from '../../types/common';
import { getTechTrackName } from '../../services/formatters';

interface TechTrackCellProps {
  techTracks: TechTrack[];
  align?: 'left' | 'center' | 'right';
}

/**
 * Table cell component for displaying tech tracks with tooltip showing full names
 */
export function TechTrackCell({ techTracks, align = 'left' }: TechTrackCellProps) {
  return (
    <TableCell align={align}>
      {techTracks.length > 0 ? (
        <Tooltip title={techTracks.map(getTechTrackName).join(', ')}>
          <Typography variant="caption">{techTracks.join(', ')}</Typography>
        </Tooltip>
      ) : (
        <Typography variant="caption" color="text.secondary">-</Typography>
      )}
    </TableCell>
  );
}
