import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface WorkshopHomeBarProps {
  onReturnToHub: () => void;
}

/** Consistent suite-level navigation shown above every top-level tool. */
export function WorkshopHomeBar({ onReturnToHub }: WorkshopHomeBarProps) {
  return (
    <Box
      component="nav"
      aria-label="Workshop navigation"
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Box sx={{ px: { xs: 1, sm: 2 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onReturnToHub} sx={{ my: 1 }}>
          Workshop Home
        </Button>
      </Box>
    </Box>
  );
}
