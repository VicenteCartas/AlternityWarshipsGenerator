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

export interface PdfExportOptions {
  includeDefenses: boolean;
  includeDamageZones: boolean;
  includeCombat: boolean;
  includeFireDiagram: boolean;
  includeNotes: boolean;
  includeShipDescription: boolean;
}

const defaultOptions: PdfExportOptions = {
  includeDefenses: true,
  includeDamageZones: true,
  includeCombat: true,
  includeFireDiagram: true,
  includeNotes: true,
  includeShipDescription: true,
};

interface PdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => void;
  hasImage: boolean;
  hasLore: boolean;
}

export function PdfExportDialog({
  open,
  onClose,
  onExport,
  hasImage,
  hasLore,
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
      includeDefenses: true,
      includeDamageZones: true,
      includeCombat: true,
      includeFireDiagram: true,
      includeNotes: true,
      includeShipDescription: true,
    });
  };

  const handleSelectNone = () => {
    setOptions({
      includeDefenses: false,
      includeDamageZones: false,
      includeCombat: false,
      includeFireDiagram: false,
      includeNotes: false,
      includeShipDescription: false,
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
          Select which sections to include in the PDF export:
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
            Ship Stats (always included)
          </Typography>
          <FormControlLabel
            control={<Checkbox checked disabled />}
            label="Hull & Basic Stats"
          />
          
          <Divider sx={{ my: 1.5 }} />
          
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Optional Sections
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeDefenses}
                onChange={handleChange('includeDefenses')}
              />
            }
            label="Defenses (Armor, Shields, ECM)"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeDamageZones}
                onChange={handleChange('includeDamageZones')}
              />
            }
            label="Damage Zones & Hit Location Chart"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeCombat}
                onChange={handleChange('includeCombat')}
              />
            }
            label="Combat (Sensors, Weapons, C4)"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeFireDiagram}
                onChange={handleChange('includeFireDiagram')}
              />
            }
            label="Fire Diagram"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeNotes}
                onChange={handleChange('includeNotes')}
              />
            }
            label="Notes Section (blank lines)"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeShipDescription}
                onChange={handleChange('includeShipDescription')}
                disabled={!hasImage && !hasLore}
              />
            }
            label={
              <Box>
                Ship Description
                {!hasImage && !hasLore && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    No image or lore added
                  </Typography>
                )}
              </Box>
            }
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
