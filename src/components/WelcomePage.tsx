import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExtensionIcon from '@mui/icons-material/Extension';
import DescriptionIcon from '@mui/icons-material/Description';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { APP_VERSION } from '../constants/version';

interface WelcomePageProps {
  onNewWarship: () => void;
  onLoadWarship: () => void;
  onManageMods: () => void;
  onLoadFile?: (filePath: string) => void;
}

// What's new items for recent versions
const WHATS_NEW: { version: string; items: { label: string; type: 'feature' | 'fix' | 'improvement' }[] }[] = [
  {
    version: '0.2.5',
    items: [
      { label: 'Mod support — create, import, and manage custom data mods', type: 'feature' },
      { label: 'Multiple armor layers support (via mods)', type: 'feature' },
      { label: 'Expandable support systems like launchers', type: 'feature' },
      { label: 'Improved fuel tank naming and descriptions', type: 'improvement' },
      { label: 'Artificial gravity tech requirement fix', type: 'fix' },
    ],
  },
  {
    version: '0.2.4',
    items: [
      { label: 'Tech track filtering now supports multi-track components', type: 'fix' },
      { label: 'View Data Files from the View menu', type: 'feature' },
      { label: 'Crew and troops are now separate categories', type: 'improvement' },
      { label: 'Reviewed all Add/Edit forms and installed system lists', type: 'improvement' },
      { label: 'PDF: troops, passengers, detailed systems list', type: 'improvement' },
    ],
  },
];

const chipColor = (type: string) => {
  switch (type) {
    case 'feature': return 'primary';
    case 'fix': return 'error';
    case 'improvement': return 'success';
    default: return 'default';
  }
};

export function WelcomePage({ onNewWarship, onLoadWarship, onManageMods, onLoadFile }: WelcomePageProps) {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    if (window.electronAPI?.getRecentFiles) {
      window.electronAPI.getRecentFiles().then((files) => {
        setRecentFiles(files || []);
      }).catch(() => {
        setRecentFiles([]);
      });
    }
  }, []);

  const getFileName = (filePath: string) => {
    const separator = filePath.includes('\\') ? '\\' : '/';
    const name = filePath.split(separator).pop() || filePath;
    return name.replace(/\.warship\.json$/i, '');
  };

  const getFileDirectory = (filePath: string) => {
    const separator = filePath.includes('\\') ? '\\' : '/';
    const parts = filePath.split(separator);
    parts.pop();
    return parts.slice(-2).join(separator);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 4,
      }}
    >
      <Box sx={{ display: 'flex', gap: 3, maxWidth: 900, width: '100%', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Left column: Logo + Actions + Recent Files */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            minWidth: 340,
            maxWidth: 420,
            flex: 1,
          }}
        >
          <Box
            component="img"
            src="./logo.png"
            alt="Alternity Warship Generator"
            sx={{ width: 64, height: 64, mb: 1.5 }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Alternity Warship Generator
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Design and build starships for the Alternity RPG system
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={onNewWarship}
              fullWidth
              disableRipple
              sx={{ py: 1.25 }}
            >
              New Design
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<FolderOpenIcon />}
              onClick={onLoadWarship}
              fullWidth
              sx={{ py: 1.25 }}
            >
              Load Design
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<ExtensionIcon />}
              onClick={onManageMods}
              fullWidth
              sx={{ py: 1.25 }}
            >
              Manage Mods
            </Button>
          </Stack>

          {/* Recent Files */}
          {recentFiles.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, px: 1 }}>
                Recent Designs
              </Typography>
              <List dense disablePadding>
                {recentFiles.slice(0, 5).map((filePath) => (
                  <ListItemButton
                    key={filePath}
                    onClick={() => onLoadFile?.(filePath)}
                    sx={{ borderRadius: 1, py: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DescriptionIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={getFileName(filePath)}
                      secondary={getFileDirectory(filePath)}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true, color: 'text.secondary' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )}
        </Paper>

        {/* Right column: What's New */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            minWidth: 300,
            maxWidth: 420,
            flex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <NewReleasesIcon color="primary" />
            <Typography variant="h6">
              What&apos;s New
            </Typography>
            <Chip label={`v${APP_VERSION}`} size="small" color="primary" variant="outlined" />
          </Box>

          {WHATS_NEW.map((release) => (
            <Box key={release.version} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Version {release.version}
              </Typography>
              <List dense disablePadding>
                {release.items.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.25, px: 1 }}>
                    <Chip
                      label={item.type === 'improvement' ? 'improv.' : item.type}
                      size="small"
                      color={chipColor(item.type) as 'primary' | 'error' | 'success' | 'default'}
                      sx={{ fontSize: '0.6rem', height: 18, minWidth: 56, mt: 0.25 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </List>
              {release !== WHATS_NEW[WHATS_NEW.length - 1] && <Divider sx={{ mt: 1.5 }} />}
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
}
