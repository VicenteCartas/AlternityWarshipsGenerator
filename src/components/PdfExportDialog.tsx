import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { PdfExportOptions } from '../services/pdfExportService';

export type { PdfExportOptions };

const defaultOptions: PdfExportOptions = {
  includeDamageDiagram: true,
  includeDefenses: true,
  includeOffense: true,
};

interface PdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => void;
}

export function PdfExportDialog({
  open,
  onClose,
  onExport,
}: PdfExportDialogProps) {
  const [options, setOptions] = useState<PdfExportOptions>(defaultOptions);

  const handleChange = (key: keyof PdfExportOptions) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({
      ...prev,
      [key]: event.target.checked,
    }));
  };

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  const handleSelectAll = () => {
    setOptions({
      includeDamageDiagram: true,
      includeDefenses: true,
      includeOffense: true,
    });
  };

  const handleSelectNone = () => {
    setOptions({
      includeDamageDiagram: false,
      includeDefenses: false,
      includeOffense: false,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PictureAsPdfIcon color="primary" />
        Export to PDF
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select which sections to include in the PDF export.
          Ship Information is always included.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button size="small" variant="outlined" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" variant="outlined" onClick={handleSelectNone}>
            Select None
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <FormGroup>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Always Included
          </Typography>
          <FormControlLabel
            control={<Checkbox checked disabled />}
            label="Ship Information (overview, systems summary, lore, notes, image)"
          />

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Optional Sections (each starts on a new page)
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeDamageDiagram}
                onChange={handleChange('includeDamageDiagram')}
              />
            }
            label="Damage Diagram (hit location table, zone layout with all systems)"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeDefenses}
                onChange={handleChange('includeDefenses')}
              />
            }
            label="Defenses (damage tracks, armor, active defenses)"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeOffense}
                onChange={handleChange('includeOffense')}
              />
            }
            label="Weapons (fire arcs, sensors, weapons, ordnance)"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          startIcon={<PictureAsPdfIcon />}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
