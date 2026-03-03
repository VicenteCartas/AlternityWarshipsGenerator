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
  LinearProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { PdfExportOptions } from '../services/pdfExportService';

export type { PdfExportOptions };

const defaultOptions: PdfExportOptions = {
  includeCombat: true,
  includeDamageDiagram: true,
  includeDetailedSystems: false,
};

interface PdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => void | Promise<void>;
}

export function PdfExportDialog({
  open,
  onClose,
  onExport,
}: PdfExportDialogProps) {
  const [options, setOptions] = useState<PdfExportOptions>(defaultOptions);
  const [exporting, setExporting] = useState(false);

  const handleChange = (key: keyof PdfExportOptions) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({
      ...prev,
      [key]: event.target.checked,
    }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(options);
    } finally {
      setExporting(false);
    }
    onClose();
  };

  const handleSelectAll = () => {
    setOptions({
      includeCombat: true,
      includeDamageDiagram: true,
      includeDetailedSystems: true,
    });
  };

  const handleSelectNone = () => {
    setOptions({
      includeCombat: false,
      includeDamageDiagram: false,
      includeDetailedSystems: false,
    });
  };

  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PictureAsPdfIcon color="primary" />
        Export to PDF
      </DialogTitle>
      {exporting && <LinearProgress />}
      <DialogContent>
        {exporting ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Generating PDF…
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a few seconds.
            </Typography>
          </Box>
        ) : (
        <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure export options.
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
                label="Lore & Identity (name, image, metadata, lore, notes)"
              />
              <FormControlLabel
                control={<Checkbox checked disabled />}
                label="Systems Detail (overview stats, systems summary table)"
              />
              <FormControlLabel
                sx={{ ml: 3 }}
                control={
                  <Checkbox
                    checked={options.includeDetailedSystems}
                    onChange={handleChange('includeDetailedSystems')}
                    size="small"
                  />
                }
                label="Include detailed component list"
              />

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Optional Sections (each starts on a new page)
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeCombat}
                    onChange={handleChange('includeCombat')}
                  />
                }
                label="Combat Sheet (weapons, fire arcs, sensors, ordnance, armor, damage tracks, defenses)"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeDamageDiagram}
                    onChange={handleChange('includeDamageDiagram')}
                  />
                }
                label="Damage Zones (hit location table, zone layout with all systems)"
              />
            </FormGroup>
        </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          startIcon={<PictureAsPdfIcon />}
          disabled={exporting}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
