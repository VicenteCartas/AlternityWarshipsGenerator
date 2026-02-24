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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExtensionIcon from '@mui/icons-material/Extension';
import DescriptionIcon from '@mui/icons-material/Description';
import { APP_VERSION } from '../constants/version';

interface WelcomePageProps {
  onNewWarship: () => void;
  onLoadWarship: () => void;
  onManageMods: () => void;
  onLoadFile?: (filePath: string) => void;
}

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
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 700,
          width: '100%',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="./logo.png"
            alt="Alternity Warship Generator"
            sx={{ width: 64, height: 64, mb: 1.5 }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Alternity Warship Generator
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Design and build starships for the Alternity RPG system — v{APP_VERSION}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Content: Actions + Recent Designs side by side */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Actions */}
          <Stack spacing={1.5} sx={{ minWidth: 220 }}>
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

          {/* Recent Designs */}
          {recentFiles.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, px: 1 }}>
                  Recent Designs
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {recentFiles.slice(0, 10).map((filePath) => (
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
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
