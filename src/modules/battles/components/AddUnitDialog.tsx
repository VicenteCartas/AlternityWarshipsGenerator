import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tabs, Tab, Box, Table, TableHead, TableBody, TableRow, TableCell, Chip,
  TextField, Stack, MenuItem, Typography, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { TabPanel } from '@shared/components';
import externalShipsData from '../data/external-ships.json';
import type { ExternalShip, ShipCategory, UnitStack } from '../types/battle';

const externalShips = externalShipsData.ships as ExternalShip[];

const categoryOrder: ShipCategory[] = [
  'fighter', 'cutter', 'destroyer', 'escort', 'cruiser',
  'carrier', 'battleship', 'dreadnought', 'fortress', 'monitor', 'cathedral',
];

const categoryLabel: Record<ShipCategory, string> = {
  fighter: 'Fighters',
  cutter: 'Cutters / Scouts',
  destroyer: 'Destroyers',
  escort: 'Escorts',
  cruiser: 'Cruisers',
  carrier: 'Carriers',
  battleship: 'Battleships',
  dreadnought: 'Dreadnoughts',
  fortress: 'Fortress Ships',
  monitor: 'Monitors',
  cathedral: 'Cathedral Ships',
  custom: 'Custom',
};

interface AddUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (stack: UnitStack) => void;
}

export function AddUnitDialog({ open, onClose, onAdd }: AddUnitDialogProps) {
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extQty, setExtQty] = useState(1);

  // Custom-unit fields
  const [customName, setCustomName] = useState('');
  const [customCS, setCustomCS] = useState(100);
  const [customQty, setCustomQty] = useState(1);
  const [customCategory, setCustomCategory] = useState<ShipCategory>('custom');

  const grouped = useMemo(() => {
    const m = new Map<ShipCategory, ExternalShip[]>();
    for (const s of externalShips) {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    }
    return m;
  }, []);

  const handleAddExternal = () => {
    const ship = externalShips.find((s) => s.id === selectedId);
    if (!ship || extQty < 1) return;
    onAdd({
      id: `${ship.id}-${Date.now()}`,
      name: ship.name,
      combatStrengthPerUnit: ship.combatStrength,
      initialQuantity: extQty,
      currentStrength: ship.combatStrength * extQty,
      category: ship.category,
      notes: ship.role,
      source: 'external',
    });
    setSelectedId(null);
    setExtQty(1);
    onClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim() || customCS <= 0 || customQty < 1) return;
    onAdd({
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      combatStrengthPerUnit: customCS,
      initialQuantity: customQty,
      currentStrength: customCS * customQty,
      category: customCategory,
      source: 'custom',
    });
    setCustomName('');
    setCustomCS(100);
    setCustomQty(1);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Unit Stack</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="External Ships" />
          <Tab label="Custom" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">CS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoryOrder.map((cat) => {
                  const ships = grouped.get(cat);
                  if (!ships) return null;
                  return [
                    <TableRow key={`hdr-${cat}`}>
                      <TableCell colSpan={3} sx={{ bgcolor: 'action.hover', fontWeight: 600 }}>
                        {categoryLabel[cat]}
                      </TableCell>
                    </TableRow>,
                    ...ships.map((s) => (
                      <TableRow
                        key={s.id}
                        hover
                        selected={selectedId === s.id}
                        onClick={() => setSelectedId(s.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{s.role}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={s.combatStrength} size="small" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    )),
                  ];
                })}
              </TableBody>
            </Table>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="body2">Quantity:</Typography>
            <IconButton size="small" onClick={() => setExtQty((q) => Math.max(1, q - 1))}>
              <RemoveIcon />
            </IconButton>
            <TextField
              size="small"
              type="number"
              value={extQty}
              onChange={(e) => setExtQty(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 80 }}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <IconButton size="small" onClick={() => setExtQty((q) => q + 1)}>
              <AddIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!selectedId}
              onClick={handleAddExternal}
            >
              Add Stack
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Unit name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Combat strength per unit"
                type="number"
                value={customCS}
                onChange={(e) => setCustomCS(Math.max(1, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField
                label="Quantity"
                type="number"
                value={customQty}
                onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField
                select
                label="Category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as ShipCategory)}
                fullWidth
              >
                {[...categoryOrder, 'custom' as ShipCategory].map((c) => (
                  <MenuItem key={c} value={c}>{categoryLabel[c]}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                Add Custom Stack
              </Button>
            </Stack>
          </Stack>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
