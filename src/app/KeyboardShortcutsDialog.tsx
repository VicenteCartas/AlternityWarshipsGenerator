import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'File',
    shortcuts: [
      { keys: 'Ctrl+N', description: 'New Design' },
      { keys: 'Ctrl+O', description: 'Load Design' },
      { keys: 'Ctrl+S', description: 'Save Design' },
      { keys: 'Ctrl+Shift+S', description: 'Save Design As' },
      { keys: 'Ctrl+Shift+D', description: 'Duplicate Design' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: 'Ctrl+Z', description: 'Undo' },
      { keys: 'Ctrl+Y', description: 'Redo' },
      { keys: 'Ctrl+Shift+Z', description: 'Redo (alternate)' },
    ],
  },
  {
    title: 'Damage Zones',
    shortcuts: [
      { keys: '1–9, A', description: 'Select zone by number (A = 10)' },
      { keys: 'Ctrl+A', description: 'Select all systems' },
      { keys: 'Esc', description: 'Deselect zone' },
    ],
  },
];

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ position: 'relative', pt: 3 }}>
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

        <Typography variant="h5" component="div" fontWeight="bold" sx={{ mb: 2 }}>
          Keyboard Shortcuts
        </Typography>

        {SHORTCUT_GROUPS.map((group, gi) => (
          <Box key={group.title}>
            {gi > 0 && <Divider sx={{ my: 1.5 }} />}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              {group.title}
            </Typography>
            <Table size="small">
              <TableBody>
                {group.shortcuts.map((shortcut) => (
                  <TableRow key={shortcut.keys} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ pl: 0, width: '45%' }}>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'action.selected',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.8rem',
                        }}
                      >
                        {shortcut.keys}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ pr: 0 }}>
                      <Typography variant="body2">{shortcut.description}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
