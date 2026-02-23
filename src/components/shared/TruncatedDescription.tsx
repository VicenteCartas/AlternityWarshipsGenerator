import { Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import { truncatedDescriptionSx } from '../../constants/tableStyles';

interface TruncatedDescriptionProps {
  text: string;
  /** Override tooltip text (defaults to `text`). Useful when tooltip should show extra info like notes. */
  tooltipText?: string;
  maxLines?: number;
  maxWidth?: number | string;
  sx?: SxProps<Theme>;
}

/**
 * Typography component for displaying description text with truncation and tooltip
 */
export function TruncatedDescription({ 
  text, 
  tooltipText,
  maxLines = 2, 
  maxWidth,
  sx 
}: TruncatedDescriptionProps) {
  return (
    <Tooltip title={tooltipText ?? text} placement="left">
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
