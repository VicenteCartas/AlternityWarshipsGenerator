import { Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import { truncatedDescriptionSx } from '../../constants/tableStyles';

interface TruncatedDescriptionProps {
  text: string;
  maxLines?: number;
  maxWidth?: number | string;
  sx?: SxProps<Theme>;
}

/**
 * Typography component for displaying description text with truncation and tooltip
 */
export function TruncatedDescription({ 
  text, 
  maxLines = 2, 
  maxWidth,
  sx 
}: TruncatedDescriptionProps) {
  return (
    <Tooltip title={text} placement="left">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          ...truncatedDescriptionSx,
          WebkitLineClamp: maxLines,
          ...(maxWidth && { maxWidth }),
          ...sx,
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
}
