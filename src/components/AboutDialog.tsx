import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import BugReportIcon from '@mui/icons-material/BugReport';
import { APP_VERSION, APP_NAME, GITHUB_URL, GITHUB_ISSUES_URL } from '../constants/version';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ position: 'relative', pt: 3 }}>
        {/* Close button aligned with logo */}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ 
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          {/* Logo */}
          <Box
            component="img"
            src="./logo.png"
            alt="Alternity Warship Generator Logo"
            sx={{ width: 96, height: 96 }}
          />
          
          {/* Name and Version */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" component="div" fontWeight="bold">
              {APP_NAME}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Version {APP_VERSION}
            </Typography>
          </Box>
          
          <Divider sx={{ width: '100%', my: 1 }} />
          
          {/* Links */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <GitHubIcon fontSize="small" />
              Project on GitHub
            </Link>
            <Link
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BugReportIcon fontSize="small" />
              Report an Issue
            </Link>
          </Box>
          
          <Divider sx={{ width: '100%', my: 1 }} />
          
          {/* Copyright / Attribution */}
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Based on the Alternity Warships sourcebook by Richard Baker.
            <br />
            Alternity is a trademark of Wizards of the Coast.
            <br />
            <br />
            Released under the MIT License.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
