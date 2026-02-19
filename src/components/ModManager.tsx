import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  IconButton,
  Chip,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { Mod, ModManifest } from '../types/mod';
import {
  getInstalledMods,
  updateModSettings,
  createMod,
  deleteMod,
  exportMod,
  importMod,
  getModsDirectoryPath,
} from '../services/modService';
import { ModEditor } from './ModEditor';
import type { ModSettings } from '../types/mod';

interface ModManagerProps {
  onBack: () => void;
  onModsChanged: () => Promise<void>;
}

export function ModManager({ onBack, onModsChanged }: ModManagerProps) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmMod, setDeleteConfirmMod] = useState<Mod | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingMod, setEditingMod] = useState<Mod | null>(null);

  // Create dialog state
  const [newModName, setNewModName] = useState('');
  const [newModAuthor, setNewModAuthor] = useState('');
  const [newModDescription, setNewModDescription] = useState('');
  const [newModMode, setNewModMode] = useState<'add' | 'replace'>('add');

  const loadMods = useCallback(async () => {
    setLoading(true);
    const installed = await getInstalledMods();
    // Sort by priority
    installed.sort((a, b) => a.priority - b.priority);
    setMods(installed);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMods();
  }, [loadMods]);

  const persistSettings = useCallback(async (updatedMods: Mod[]) => {
    const settings: ModSettings = {
      mods: updatedMods.map(m => ({
        folderName: m.folderName,
        enabled: m.enabled,
        priority: m.priority,
      })),
    };
    await updateModSettings(settings);
    await onModsChanged();
  }, [onModsChanged]);

  const handleToggleEnabled = useCallback(async (mod: Mod) => {
    setSaving(true);
    const updated = mods.map(m =>
      m.folderName === mod.folderName ? { ...m, enabled: !m.enabled } : m
    );
    setMods(updated);
    await persistSettings(updated);
    setSaving(false);
  }, [mods, persistSettings]);

  const handleMovePriority = useCallback(async (mod: Mod, direction: 'up' | 'down') => {
    const idx = mods.findIndex(m => m.folderName === mod.folderName);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= mods.length) return;

    setSaving(true);
    const updated = [...mods];
    // Swap priorities
    const tempPriority = updated[idx].priority;
    updated[idx] = { ...updated[idx], priority: updated[swapIdx].priority };
    updated[swapIdx] = { ...updated[swapIdx], priority: tempPriority };
    // Re-sort
    updated.sort((a, b) => a.priority - b.priority);
    setMods(updated);
    await persistSettings(updated);
    setSaving(false);
  }, [mods, persistSettings]);

  const handleCreateMod = useCallback(async () => {
    if (!newModName.trim()) return;
    setSaving(true);
    const manifest: ModManifest = {
      name: newModName.trim(),
      author: newModAuthor.trim(),
      version: '1.0.0',
      description: newModDescription.trim(),
      mode: newModMode,
    };
    const success = await createMod(manifest);
    if (success) {
      setCreateDialogOpen(false);
      setNewModName('');
      setNewModAuthor('');
      setNewModDescription('');
      setNewModMode('add');
      await loadMods();
    }
    setSaving(false);
  }, [newModName, newModAuthor, newModDescription, newModMode, loadMods]);

  const handleDeleteMod = useCallback(async (mod: Mod) => {
    setSaving(true);
    await deleteMod(mod.folderName);
    setDeleteConfirmMod(null);
    await loadMods();
    await onModsChanged();
    setSaving(false);
  }, [loadMods, onModsChanged]);

  const handleExportMod = useCallback(async (mod: Mod) => {
    await exportMod(mod.folderName);
  }, []);

  const handleImportMod = useCallback(async () => {
    setSaving(true);
    const folderName = await importMod();
    if (folderName) {
      await loadMods();
    }
    setSaving(false);
  }, [loadMods]);

  const handleOpenModsFolder = useCallback(async () => {
    const modsPath = await getModsDirectoryPath();
    if (modsPath && window.electronAPI) {
      window.electronAPI.openPath(modsPath);
    }
  }, []);

  const handleEditorBack = useCallback(async () => {
    setEditingMod(null);
    await loadMods();
  }, [loadMods]);

  // Show mod editor if editing
  if (editingMod) {
    return (
      <ModEditor
        mod={editingMod}
        onBack={handleEditorBack}
        onModsChanged={onModsChanged}
      />
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 4,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={onBack} size="large">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Mod Manager
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={handleOpenModsFolder}
          >
            Open Mods Folder
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={handleImportMod}
            disabled={saving}
          >
            Import Mod
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={saving}
          >
            Create New Mod
          </Button>
        </Stack>
      </Box>

      {/* Description */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Mods customize the game data used by the ship builder. &quot;Add&quot; mods merge new items with base data (and can override existing items by ID).
        &quot;Replace&quot; mods completely replace base data for the files they provide. Higher priority mods are applied last and win conflicts.
      </Typography>

      {/* Mods Table */}
      {mods.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No mods installed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new mod or import one from a .altmod.json file to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Priority</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Author</TableCell>
                <TableCell sx={{ width: 80 }}>Version</TableCell>
                <TableCell sx={{ width: 80 }}>Mode</TableCell>
                <TableCell>Data Files</TableCell>
                <TableCell sx={{ width: 80 }} align="center">Enabled</TableCell>
                <TableCell sx={{ width: 150 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mods.map((mod, idx) => (
                <TableRow key={mod.folderName} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => handleMovePriority(mod, 'up')}
                        disabled={idx === 0 || saving}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMovePriority(mod, 'down')}
                        disabled={idx === mods.length - 1 || saving}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {mod.manifest.name}
                    </Typography>
                    {mod.manifest.description && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 300 }}>
                        {mod.manifest.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{mod.manifest.author || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{mod.manifest.version}</Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const fm = mod.manifest.fileModes || {};
                      const modes = mod.files.map(f => fm[f] ?? mod.manifest.mode);
                      const allAdd = modes.every(m => m === 'add');
                      const allReplace = modes.every(m => m === 'replace');
                      if (allAdd) return <Chip label="Add" size="small" color="primary" variant="outlined" />;
                      if (allReplace) return <Chip label="Replace" size="small" color="warning" variant="outlined" />;
                      return <Chip label="Mixed" size="small" color="info" variant="outlined" />;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {mod.files.length > 0
                        ? mod.files.map(f => f.replace('.json', '')).join(', ')
                        : 'No data files'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={mod.enabled}
                      onChange={() => handleToggleEnabled(mod)}
                      disabled={saving}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      <Tooltip title="Edit mod data">
                        <IconButton size="small" onClick={() => setEditingMod(mod)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export to .altmod.json">
                        <IconButton size="small" onClick={() => handleExportMod(mod)}>
                          <FileDownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete mod">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmMod(mod)}
                          disabled={saving}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Mod Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Mod</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Mod Name"
              value={newModName}
              onChange={e => setNewModName(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Author"
              value={newModAuthor}
              onChange={e => setNewModAuthor(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={newModDescription}
              onChange={e => setNewModDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Merge Mode
              </Typography>
              <ToggleButtonGroup
                value={newModMode}
                exclusive
                onChange={(_e, val) => { if (val) setNewModMode(val); }}
                size="small"
              >
                <ToggleButton value="add">
                  Add — Merge with base data
                </ToggleButton>
                <ToggleButton value="replace">
                  Replace — Override base data
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateMod}
            disabled={!newModName.trim() || saving}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmMod} onClose={() => setDeleteConfirmMod(null)}>
        <DialogTitle>Delete Mod</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteConfirmMod?.manifest.name}&quot;? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmMod(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmMod && handleDeleteMod(deleteConfirmMod)}
            disabled={saving}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
