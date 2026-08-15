import { useState } from 'react';
import {
  Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Paper, Stack, Typography,
} from '@mui/material';
import { getAllCharacterSourcePacks } from '../services/characterDataService';

interface CharacterSourcesDialogProps {
  open: boolean;
  selectedSourcePackIds: string[];
  onApply: (sourcePackIds: string[]) => void;
  onCancel: () => void;
}

export function CharacterSourcesDialog({
  open,
  selectedSourcePackIds,
  onApply,
  onCancel,
}: CharacterSourcesDialogProps) {
  const sourcePacks = getAllCharacterSourcePacks();
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSourcePackIds);

  const toggleSource = (sourcePackId: string, checked: boolean) => {
    setSelectedIds((current) => checked
      ? [...new Set([...current, sourcePackId])]
      : current.filter((id) => id !== sourcePackId));
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Rules Sources</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="info">
            Choose official books and rule sections for this character. User-created mods are managed separately.
          </Alert>
          {sourcePacks.map((sourcePack) => {
            const implemented = sourcePack.status === 'implemented';
            const checked = sourcePack.required || selectedIds.includes(sourcePack.id);
            return (
              <Paper key={sourcePack.id} variant="outlined" sx={{ p: 1.5 }}>
                <FormControlLabel
                  disabled={sourcePack.required || !implemented}
                  control={(
                    <Checkbox
                      checked={checked}
                      onChange={(event) => toggleSource(sourcePack.id, event.target.checked)}
                    />
                  )}
                  label={(
                    <Stack spacing={0.5}>
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={600}>{sourcePack.name}</Typography>
                        {sourcePack.required && <Chip label="Required" size="small" variant="outlined" />}
                        {!implemented && <Chip label="Planned" size="small" variant="outlined" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {sourcePack.sections.map((section) => section.toUpperCase()).join(', ')}
                      </Typography>
                    </Stack>
                  )}
                  sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
                />
              </Paper>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onApply(sourcePacks
            .filter((sourcePack) => sourcePack.required || selectedIds.includes(sourcePack.id))
            .map((sourcePack) => sourcePack.id))}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}