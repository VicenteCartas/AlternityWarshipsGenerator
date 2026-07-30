import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Tooltip, Container, Paper,
  Stack, TextField, MenuItem, Button, Card, CardActionArea, CardContent, Chip,
  CircularProgress, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { APP_NAME } from '@shared/constants/version';
import {
  filterBattleEntries, formatFileSize, formatLibraryDate, getSavedBattleLibraryPath,
  saveBattleLibraryPath, sortBattleEntries, toBattleLibraryEntries,
  type BattleLibraryEntry, type BattleSortField,
} from '../services/battleLibraryService';
import { formatCombatStrength } from '../services/battleFormatters';

interface BattleLibraryProps {
  onBack: () => void;
  onOpenBattle: (filePath: string) => void;
}

const SORT_FIELDS: { value: BattleSortField; label: string }[] = [
  { value: 'modified', label: 'Last modified' },
  { value: 'created', label: 'Created' },
  { value: 'name', label: 'Scenario name' },
  { value: 'strength', label: 'Total combat strength' },
  { value: 'rounds', label: 'Rounds fought' },
];

export function BattleLibrary({ onBack, onOpenBattle }: BattleLibraryProps) {
  const [directory, setDirectory] = useState<string | null>(getSavedBattleLibraryPath());
  const [entries, setEntries] = useState<BattleLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<BattleSortField>('modified');
  const [sortDescending, setSortDescending] = useState(true);
  // Bumped by the rescan button to re-run the scan for the same folder.
  const [rescanToken, setRescanToken] = useState(0);

  useEffect(() => {
    if (!directory) return;
    let cancelled = false;

    (async () => {
      const api = window.electronAPI;
      if (!api) {
        setError('The battle library is only available in the desktop app.');
        return;
      }
      setLoading(true);
      setError(null);
      const result = await api.scanBattleFiles(directory);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error || 'Could not scan that folder.');
        setEntries([]);
      } else {
        setEntries(toBattleLibraryEntries(result.files));
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [directory, rescanToken]);

  const handleChooseFolder = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;
    const result = await api.selectDirectory(directory ?? undefined);
    if (result.canceled || !result.filePath) return;
    saveBattleLibraryPath(result.filePath);
    setDirectory(result.filePath);
  }, [directory]);

  const visible = useMemo(() => {
    const filtered = filterBattleEntries(entries, search);
    return sortBattleEntries(filtered, {
      field: sortField,
      direction: sortDescending ? 'desc' : 'asc',
    });
  }, [entries, search, sortField, sortDescending]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Tooltip title="Back">
            <IconButton color="inherit" onClick={onBack} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            {APP_NAME} — Battle Library
          </Typography>
          <Chip
            label={`${visible.length} of ${entries.length} engagement(s)`}
            size="small"
            variant="outlined"
            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleChooseFolder}>
              Choose Folder
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
              {directory ?? 'No folder selected yet.'}
            </Typography>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <TextField
              select
              size="small"
              label="Sort by"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as BattleSortField)}
              sx={{ minWidth: 220 }}
            >
              {SORT_FIELDS.map((f) => (
                <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
              ))}
            </TextField>
            <Tooltip title={sortDescending ? 'Descending' : 'Ascending'}>
              <IconButton onClick={() => setSortDescending((d) => !d)} aria-label="Toggle sort direction">
                <SwapVertIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rescan folder">
              <span>
                <IconButton
                  onClick={() => setRescanToken((t) => t + 1)}
                  disabled={!directory}
                  aria-label="Rescan folder"
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && !error && directory && visible.length === 0 && (
          <Alert severity="info">
            No saved engagements found in this folder. Save a battle here, or choose a different folder.
          </Alert>
        )}

        {!loading && !directory && (
          <Alert severity="info">
            Choose the folder where you keep your saved engagements to browse them here.
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(4, 1fr)',
            },
          }}
        >
          {visible.map((entry) => (
            <Card key={entry.filePath} elevation={2}>
              <CardActionArea onClick={() => onOpenBattle(entry.filePath)} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" component="h2" noWrap title={entry.scenarioName}>
                    {entry.scenarioName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                    {entry.sideAName} vs {entry.sideBName}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`CS ${formatCombatStrength(entry.totalCombatStrength)}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip label={`${entry.theatreCount} theatre(s)`} size="small" variant="outlined" />
                    <Chip label={`${entry.roundCount} round(s)`} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    Modified {formatLibraryDate(entry.modifiedAt)} · {formatFileSize(entry.fileSizeBytes)}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

export default BattleLibrary;
