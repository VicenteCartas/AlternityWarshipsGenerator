import { Typography, Chip, Box } from '@mui/material';

interface StepHeaderProps {
  stepNumber: number;
  name: string;
  isRequired?: boolean;
}

export function StepHeader({ stepNumber, name, isRequired }: StepHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Typography variant="h6">
        Step {stepNumber}: {name}
      </Typography>
      {isRequired !== undefined && (
        <Chip
          label={isRequired ? 'Required' : 'Optional'}
          size="small"
          variant="outlined"
          color={isRequired ? 'warning' : 'default'}
          sx={{ fontWeight: 500, fontSize: '0.7rem', height: 22 }}
        />
      )}
    </Box>
  );
}
