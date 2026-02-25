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
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Switch,
  Chip,
  Collapse,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Mod, ModManifest } from '../types/mod';
import {
  getInstalledMods,
  updateModSettings,
  createMod,
  deleteMod,
  exportMod,
  importMod,
  setModEnabled,
  getModsDirectoryPath,
} from '../services/modService';
import { getSectionsForFile } from '../services/modEditorSchemas';
import type { ModDataFileName } from '../types/mod';
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
  const [expandedMod, setExpandedMod] = useState<string | null>(null);

  // Create dialog state
  const [newModName, setNewModName] = useState('');
  const [newModAuthor, setNewModAuthor] = useState('');
  const [newModVersion, setNewModVersion] = useState('1.0.0');
  const [newModDescription, setNewModDescription] = useState('');

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
    await setModEnabled(mod.folderName, !mod.enabled);
    await loadMods();
    await onModsChanged();
    setSaving(false);
  }, [loadMods, onModsChanged]);

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
      version: newModVersion.trim(),
      description: newModDescription.trim(),
    };
    const folderName = await createMod(manifest);
    if (folderName) {
      setCreateDialogOpen(false);
      setNewModName('');
      setNewModAuthor('');
      setNewModVersion('1.0.0');
      setNewModDescription('');
      
      // Load mods and find the newly created one to edit it immediately
      const installed = await getInstalledMods();
      installed.sort((a, b) => a.priority - b.priority);
      setMods(installed);
      
      const newMod = installed.find(m => m.folderName === folderName);
      if (newMod) {
        setEditingMod(newMod);
      }
    }
    setSaving(false);
  }, [newModName, newModAuthor, newModVersion, newModDescription]);

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
        <IconButton onClick={onBack} size="large" aria-label="Back to main menu">
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
        Mods customize the game data used by the ship builder. Each data section within a mod can be set to &quot;Add&quot; (merge with base data) or &quot;Replace&quot; (override base data). Mods are applied in priority order from #1 upward — higher-numbered mods are applied last and win conflicts when multiple mods change the same item. Select which mods to use when creating a new design.
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
                <TableCell sx={{ width: 60 }}>Enabled</TableCell>
                <TableCell sx={{ width: 110 }}>
                  <Tooltip title="Higher-numbered mods are applied last and win conflicts" placement="top">
                    <span>Priority</span>
                  </Tooltip>
                </TableCell>
                <TableCell>Mod</TableCell>
                <TableCell sx={{ width: 150 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mods.map((mod, idx) => {
                const isExpanded = expandedMod === mod.folderName;
                const sectionLabels = mod.files.flatMap(f => {
                  const sections = getSectionsForFile(f as ModDataFileName);
                  return sections.map(s => {
                    const mode = mod.manifest.fileModes?.[s.rootKey];
                    return { label: s.label, mode: mode || 'add' };
                  });
                });

                return (
                  <TableRow key={mod.folderName} hover sx={{ opacity: mod.enabled ? 1 : 0.5, verticalAlign: 'top' }}>
                    <TableCell sx={{ pt: 1.5 }}>
                      <Switch
                        size="small"
                        checked={mod.enabled}
                        onChange={() => handleToggleEnabled(mod)}
                        disabled={saving}
                        inputProps={{ 'aria-label': 'Enable mod' }}
                      />
                    </TableCell>
                    <TableCell sx={{ pt: 1.5 }}>
                      <Stack direction="row" spacing={0} alignItems="center">
                        <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 500 }}>
                          {idx + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleMovePriority(mod, 'up')}
                          disabled={idx === 0 || saving}
                          aria-label="Move priority up"
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleMovePriority(mod, 'down')}
                          disabled={idx === mods.length - 1 || saving}
                          aria-label="Move priority down"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setExpandedMod(isExpanded ? null : mod.folderName)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={500}>
                            {mod.manifest.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{mod.manifest.version}
                          </Typography>
                          {mod.manifest.author && (
                            <Typography variant="caption" color="text.secondary">
                              by {mod.manifest.author}
                            </Typography>
                          )}
                          {mod.files.length === 0 && (
                            <Chip label="No data" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          {isExpanded ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
                        </Stack>
                      </Box>
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 1, mb: 0.5 }}>
                          {mod.manifest.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {mod.manifest.description}
                            </Typography>
                          )}
                          {sectionLabels.length > 0 ? (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                Modified sections:
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {sectionLabels.map((s, i) => (
                                  <Chip
                                    key={i}
                                    label={s.label}
                                    size="small"
                                    variant="outlined"
                                    color={s.mode === 'replace' ? 'warning' : 'default'}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Stack>
                              {sectionLabels.some(s => s.mode === 'replace') && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                  Orange = replaces base data
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              This mod has no data files yet. Click Edit to add content.
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                    <TableCell align="right" sx={{ pt: 1.5 }}>
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
                );
              })}
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
              label="Version"
              value={newModVersion}
              onChange={e => setNewModVersion(e.target.value)}
              fullWidth
              required
              error={!/^\d+\.\d+(\.\d+)?$/.test(newModVersion)}
              helperText={!/^\d+\.\d+(\.\d+)?$/.test(newModVersion) ? "Must be formatted like 1.0 or 1.0.5" : ""}
            />
            <TextField
              label="Description"
              value={newModDescription}
              onChange={e => setNewModDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  const createButton = document.getElementById('create-mod-btn');
                  if (createButton) createButton.focus();
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disableRipple onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            id="create-mod-btn"
            variant="contained"
            disableRipple
            onClick={handleCreateMod}
            disabled={!newModName.trim() || !/^\d+\.\d+(\.\d+)?$/.test(newModVersion) || saving}
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
