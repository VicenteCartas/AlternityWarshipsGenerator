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
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { PdfExportOptions } from '../services/pdfExportService';

export type { PdfExportOptions };

export type PdfSheetType = 'full' | 'combat';

const defaultOptions: PdfExportOptions = {
  includeCombat: true,
  includeDamageDiagram: true,
  includeDetailedSystems: false,
};

interface PdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => void | Promise<void>;
  onExportCombatRef: () => void | Promise<void>;
}

export function PdfExportDialog({
  open,
  onClose,
  onExport,
  onExportCombatRef,
}: PdfExportDialogProps) {
  const [options, setOptions] = useState<PdfExportOptions>(defaultOptions);
  const [sheetType, setSheetType] = useState<PdfSheetType>('full');
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
      if (sheetType === 'combat') {
        await onExportCombatRef();
      } else {
        await onExport(options);
      }
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
          Choose a sheet type and configure export options.
        </Typography>

        <ToggleButtonGroup
          value={sheetType}
          exclusive
          onChange={(_e, val) => { if (val) setSheetType(val); }}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="full">
            <DescriptionIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Full Ship Sheet
          </ToggleButton>
          <ToggleButton value="combat">
            <SummarizeIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Combat Reference
          </ToggleButton>
        </ToggleButtonGroup>

        {sheetType === 'full' ? (
          <>
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
        ) : (
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              A compact <strong>1-page</strong> handout for the game table with:
            </Typography>
            <Typography variant="body2" component="div">
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                <li>Key stats (toughness, target mod, acceleration)</li>
                <li>Weapons table with fire control and arcs</li>
                <li>Ordnance designs and sensor stats</li>
                <li>Armor protection values</li>
                <li>Active defenses</li>
                <li>Damage track checkboxes</li>
                <li>Hit location table</li>
                <li>Fire arcs diagram</li>
              </ul>
            </Typography>
          </Box>
        )}
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
          {sheetType === 'combat' ? 'Export Combat Ref' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
