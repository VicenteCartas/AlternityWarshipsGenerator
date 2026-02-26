import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';
import ClearIcon from '@mui/icons-material/Clear';
import type { LibraryEntry, LibraryFilters, LibrarySortConfig, LibrarySortField } from '../../types/library';
import type { DesignType, ProgressLevel } from '../../types/common';
import type { ShipClass } from '../../types/hull';
import { PL_NAMES } from '../../services/formatters';
import {
  toLibraryEntries,
  filterLibraryEntries,
  sortLibraryEntries,
  getDefaultFilters,
  getDefaultSort,
  getSavedLibraryPath,
  saveLibraryPath,
} from '../../services/libraryService';
import { ShipCard } from './ShipCard';

interface ShipLibraryProps {
  onBack: () => void;
  onOpenDesign: (filePath: string) => void;
}

const SORT_FIELD_LABELS: Record<LibrarySortField, string> = {
  name: 'Name',
  modifiedAt: 'Date Modified',
  designType: 'Design Type',
  shipClass: 'Ship Class',
  progressLevel: 'Progress Level',
};

/**
 * Ship Library page — browse, search, filter, and open saved designs.
 */
export function ShipLibrary({ onBack, onOpenDesign }: ShipLibraryProps) {
  // Library state
  const [allEntries, setAllEntries] = useState<LibraryEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & sort
  const [filters, setFilters] = useState<LibraryFilters>(getDefaultFilters);
  const [sort, setSort] = useState<LibrarySortConfig>(getDefaultSort);

  // Scan a directory for warship files
  const scanDirectory = useCallback(async (dirPath: string) => {
    if (!window.electronAPI?.scanWarshipFiles) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.scanWarshipFiles(dirPath);
      if (result.success) {
        const entries = toLibraryEntries(result.files);
        setAllEntries(entries);
        setLibraryPath(dirPath);
        saveLibraryPath(dirPath);
      } else {
        setError(result.error || 'Failed to scan directory');
        setAllEntries([]);
      }
    } catch (err) {
      setError((err as Error).message);
      setAllEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, try to load the saved library path
  useEffect(() => {
    const savedPath = getSavedLibraryPath();
    if (savedPath) {
      scanDirectory(savedPath);
    }
  }, [scanDirectory]);

  // Handle browse button
  const handleBrowse = useCallback(async () => {
    if (!window.electronAPI?.selectDirectory) return;

    const result = await window.electronAPI.selectDirectory();
    if (!result.canceled && result.filePath) {
      scanDirectory(result.filePath);
    }
  }, [scanDirectory]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (libraryPath) {
      scanDirectory(libraryPath);
    }
  }, [libraryPath, scanDirectory]);

  // Filtered + sorted entries
  const displayedEntries = useMemo(() => {
    const filtered = filterLibraryEntries(allEntries, filters);
    return sortLibraryEntries(filtered, sort);
  }, [allEntries, filters, sort]);

  // Filter change helpers
  const updateFilter = useCallback(<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  const hasActiveFilters = filters.searchText.trim() !== '' || filters.designType !== 'all' || filters.shipClass !== null || filters.progressLevel !== null;

  // Toggle sort direction; if clicking a new field, default to ascending (except modifiedAt → desc)
  const handleSortChange = useCallback((field: LibrarySortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: field === 'modifiedAt' ? 'desc' : 'asc' };
    });
  }, []);

  // Get the folder name for display
  const folderDisplayName = libraryPath
    ? libraryPath.split(/[\\/]/).pop() || libraryPath
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={1}
        square
        sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mr: 1 }}
        >
          Back
        </Button>

        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Ship Library
        </Typography>

        {folderDisplayName && (
          <Chip
            label={folderDisplayName}
            variant="outlined"
            size="small"
            title={libraryPath || ''}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<FolderOpenIcon />}
          onClick={handleBrowse}
          size="small"
        >
          Browse Folder
        </Button>

        {libraryPath && (
          <Tooltip title="Rescan folder">
            <IconButton onClick={handleRefresh} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Paper>

      {/* Filter Bar */}
      {allEntries.length > 0 && (
        <Paper
          elevation={0}
          square
          sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
        >
          {/* Search */}
          <TextField
            placeholder="Search designs..."
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: filters.searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => updateFilter('searchText', '')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          {/* Design Type */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.designType}
              label="Type"
              onChange={(e) => updateFilter('designType', e.target.value as DesignType | 'all')}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="warship">Warship</MenuItem>
              <MenuItem value="station">Station</MenuItem>
            </Select>
          </FormControl>

          {/* Ship Class */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ship Class</InputLabel>
            <Select
              value={filters.shipClass ?? ''}
              label="Ship Class"
              onChange={(e) => updateFilter('shipClass', (e.target.value || null) as ShipClass | null)}
            >
              <MenuItem value="">All Classes</MenuItem>
              <MenuItem value="small-craft">Small Craft</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="heavy">Heavy</MenuItem>
              <MenuItem value="super-heavy">Super-Heavy</MenuItem>
            </Select>
          </FormControl>

          {/* Progress Level */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>PL</InputLabel>
            <Select
              value={filters.progressLevel ?? ''}
              label="PL"
              onChange={(e) => updateFilter('progressLevel', (e.target.value || null) as ProgressLevel | null)}
            >
              <MenuItem value="">All PLs</MenuItem>
              {([6, 7, 8, 9] as ProgressLevel[]).map((pl) => (
                <MenuItem key={pl} value={pl}>{PL_NAMES[pl]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sort.field}
              label="Sort By"
              onChange={(e) => handleSortChange(e.target.value as LibrarySortField)}
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon fontSize="small" sx={{ transform: sort.direction === 'desc' ? 'scaleY(-1)' : undefined }} />
                </InputAdornment>
              }
            >
              {(Object.entries(SORT_FIELD_LABELS) as [LibrarySortField, string][]).map(([field, label]) => (
                <MenuItem key={field} value={field}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters} startIcon={<ClearIcon />}>
              Clear Filters
            </Button>
          )}

          {/* Count */}
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {displayedEntries.length} of {allEntries.length} design{allEntries.length !== 1 ? 's' : ''}
          </Typography>
        </Paper>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary">Scanning for designs...</Typography>
          </Box>
        )}

        {/* Error state */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Empty state — no library path selected */}
        {!libraryPath && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <FolderOpenIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary">
              Select a folder to browse saved designs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a folder containing <code>.warship.json</code> files to populate the library.
            </Typography>
            <Button variant="contained" startIcon={<FolderOpenIcon />} onClick={handleBrowse}>
              Browse Folder
            </Button>
          </Box>
        )}

        {/* Empty state — path selected but no files found */}
        {libraryPath && !loading && allEntries.length === 0 && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No designs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No <code>.warship.json</code> files were found in this folder or its subfolders.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleBrowse}>
                Choose Different Folder
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                Rescan
              </Button>
            </Stack>
          </Box>
        )}

        {/* Empty state — files exist but all filtered out */}
        {libraryPath && !loading && allEntries.length > 0 && displayedEntries.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No matching designs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No designs match the current filters. Try adjusting your search criteria.
            </Typography>
            <Button variant="outlined" onClick={clearFilters} startIcon={<ClearIcon />}>
              Clear Filters
            </Button>
          </Box>
        )}

        {/* Card grid */}
        {!loading && displayedEntries.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)',
              },
              gap: 2,
            }}
          >
            {displayedEntries.map((entry) => (
              <ShipCard
                key={entry.filePath}
                entry={entry}
                onOpen={onOpenDesign}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
