import { useState, type ReactNode } from 'react';
import {
  Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Stack, Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import type { CharacterPdfFormat } from '../services/characterPdfExportService';

interface CharacterPdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: CharacterPdfFormat) => Promise<void>;
}

const FORMATS: Array<{ format: CharacterPdfFormat; title: string; description: string; icon: ReactNode }> = [
  {
    format: 'npc',
    title: 'NPC Profile',
    description: 'Compact PHB-style character template for quick Gamemaster reference.',
    icon: <DescriptionOutlinedIcon color="primary" />,
  },
  {
    format: 'pc',
    title: 'Player Character Sheet',
    description: 'Full printable character sheet with skills, equipment, and any required continuation pages.',
    icon: <PrintOutlinedIcon color="primary" />,
  },
];

export function CharacterPdfExportDialog({ open, onClose, onExport }: CharacterPdfExportDialogProps) {
  const [exporting, setExporting] = useState<CharacterPdfFormat | null>(null);

  const choose = async (format: CharacterPdfFormat) => {
    setExporting(format);
    try {
      await onExport(format);
      onClose();
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={exporting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { m: 1, maxHeight: 'calc(100% - 16px)' } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
        <PictureAsPdfIcon color="primary" />
        Export Character PDF
      </DialogTitle>
      {exporting && <LinearProgress />}
      <DialogContent sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Choose an NPC profile or a full player character sheet. You will choose the PDF location next.
        </Typography>
        <Stack spacing={0.75}>
          {FORMATS.map((entry) => (
            <ButtonBase
              key={entry.format}
              disabled={exporting !== null}
              onClick={() => { void choose(entry.format); }}
              aria-label={entry.title}
              sx={{
                border: 1, borderColor: 'divider', borderRadius: 1, p: 1.25,
                display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: 1.5,
                textAlign: 'left', alignItems: 'start', '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {entry.icon}
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{entry.title}</Typography>
                <Typography variant="body2" color="text.secondary">{entry.description}</Typography>
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ py: 0.5 }}><Button onClick={onClose} disabled={exporting !== null}>Cancel</Button></DialogActions>
    </Dialog>
  );
}