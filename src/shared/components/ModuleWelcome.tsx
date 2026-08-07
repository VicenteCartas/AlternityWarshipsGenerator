import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { APP_VERSION } from '@shared/constants/version';
import { WorkshopHomeBar } from './WorkshopHomeBar';

interface ModuleWelcomeShellProps {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  onReturnToHub?: () => void;
  children: ReactNode;
  iconBackground?: string;
}

interface ModuleWelcomeSectionProps {
  label?: string;
  children: ReactNode;
}

interface ModuleWelcomeActionProps {
  label: string;
  description?: string;
  icon: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export function ModuleWelcomeShell({
  title,
  description,
  icon,
  onReturnToHub,
  children,
  iconBackground = 'primary.main',
}: ModuleWelcomeShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {onReturnToHub && <WorkshopHomeBar onReturnToHub={onReturnToHub} />}

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: iconBackground,
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" component="h1">{title}</Typography>
                <Typography variant="body2" color="text.secondary">{description}</Typography>
              </Box>
            </Stack>
            <Chip label={`v${APP_VERSION}`} size="small" variant="outlined" sx={{ ml: { sm: 'auto' } }} />
          </Stack>

          {children}
        </Stack>
      </Container>
    </Box>
  );
}

export function ModuleWelcomeSection({ label, children }: ModuleWelcomeSectionProps) {
  return (
    <Box>
      {label && <Typography variant="overline" color="text.secondary">{label}</Typography>}
      <Paper variant="outlined" sx={{ mt: label ? 0.5 : 0, overflow: 'hidden' }}>
        <Stack divider={<Divider flexItem />}>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}

export function ModuleWelcomeAction({
  label,
  description,
  icon,
  onClick,
  primary = false,
  disabled = false,
}: ModuleWelcomeActionProps) {
  return (
    <Button
      variant={primary ? 'contained' : 'text'}
      color={primary ? 'primary' : 'inherit'}
      startIcon={icon}
      onClick={onClick}
      disabled={disabled}
      disableElevation
      sx={{
        justifyContent: 'flex-start',
        borderRadius: 0,
        px: 3,
        py: 2.25,
        fontSize: '1rem',
        textAlign: 'left',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="span" sx={{ display: 'block', fontSize: 'inherit' }}>
          {label}
        </Typography>
        {description && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Button>
  );
}
