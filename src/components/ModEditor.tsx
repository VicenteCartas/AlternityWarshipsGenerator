import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { Mod, ModDataFileName } from '../types/mod';
import { getModFileData, saveModFileData, getInstalledMods } from '../services/modService';
import { EDITOR_SECTIONS, EDITOR_SECTION_GROUPS, HOUSE_RULES, type EditorSection, type HouseRule } from '../services/modEditorSchemas';
import { validateRows, type ValidationError } from '../services/modValidationService';
import { EditableDataGrid } from './shared/EditableDataGrid';
import { reloadWithSpecificMods, getHullsData, getStationHullsData, getArmorTypesData, getArmorWeightsData, getPowerPlantsData, getFuelTankData, getEnginesData, getFTLDrivesData, getLifeSupportData, getAccommodationsData, getStoreSystemsData, getGravitySystemsData, getDefenseSystemsData, getCommandControlSystemsData, getSensorsData, getHangarMiscSystemsData, getBeamWeaponsData, getProjectileWeaponsData, getTorpedoWeaponsData, getSpecialWeaponsData, getLaunchSystemsData, getPropulsionSystemsData, getWarheadsData, getGuidanceSystemsData, getMountModifiersData, getGunConfigurationsData, getConcealmentModifierData } from '../services/dataLoader';

interface ModEditorProps {
  mod: Mod;
  onBack: () => void;
  onModsChanged: () => Promise<void>;
}

// Map section IDs to base data getter functions
function getBaseDataForSection(sectionId: string, pureBase = false): Record<string, unknown>[] {
  const getters: Record<string, () => Record<string, unknown>[]> = {
    hulls: () => getHullsData(pureBase) as unknown as Record<string, unknown>[],
    stationHulls: () => getStationHullsData(pureBase) as unknown as Record<string, unknown>[],
    armors: () => getArmorTypesData(pureBase) as unknown as Record<string, unknown>[],
    armorWeights: () => getArmorWeightsData(pureBase) as unknown as Record<string, unknown>[],
    powerPlants: () => getPowerPlantsData(pureBase) as unknown as Record<string, unknown>[],
    fuelTank: () => [getFuelTankData(pureBase)] as unknown as Record<string, unknown>[],
    engines: () => getEnginesData(pureBase) as unknown as Record<string, unknown>[],
    ftlDrives: () => getFTLDrivesData(pureBase) as unknown as Record<string, unknown>[],
    lifeSupport: () => getLifeSupportData(pureBase) as unknown as Record<string, unknown>[],
    accommodations: () => getAccommodationsData(pureBase) as unknown as Record<string, unknown>[],
    storeSystems: () => getStoreSystemsData(pureBase) as unknown as Record<string, unknown>[],
    gravitySystems: () => getGravitySystemsData(pureBase) as unknown as Record<string, unknown>[],
    defenseSystems: () => getDefenseSystemsData(pureBase) as unknown as Record<string, unknown>[],
    commandSystems: () => getCommandControlSystemsData(pureBase) as unknown as Record<string, unknown>[],
    sensors: () => getSensorsData(pureBase) as unknown as Record<string, unknown>[],
    hangarMiscSystems: () => getHangarMiscSystemsData(pureBase) as unknown as Record<string, unknown>[],
    mountModifiers: () => {
      const data = getMountModifiersData(pureBase);
      return data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) as unknown as Record<string, unknown>[] : [];
    },
    gunConfigurations: () => {
      const data = getGunConfigurationsData(pureBase);
      return data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) as unknown as Record<string, unknown>[] : [];
    },
    concealmentModifier: () => {
      const data = getConcealmentModifierData(pureBase);
      return data ? [{ id: 'concealmentModifier', ...data }] as unknown as Record<string, unknown>[] : [];
    },
    beamWeapons: () => getBeamWeaponsData(pureBase) as unknown as Record<string, unknown>[],
    projectileWeapons: () => getProjectileWeaponsData(pureBase) as unknown as Record<string, unknown>[],
    torpedoWeapons: () => getTorpedoWeaponsData(pureBase) as unknown as Record<string, unknown>[],
    specialWeapons: () => getSpecialWeaponsData(pureBase) as unknown as Record<string, unknown>[],
    launchSystems: () => getLaunchSystemsData(pureBase) as unknown as Record<string, unknown>[],
    propulsionSystems: () => getPropulsionSystemsData(pureBase) as unknown as Record<string, unknown>[],
    warheads: () => getWarheadsData(pureBase) as unknown as Record<string, unknown>[],
    guidanceSystems: () => getGuidanceSystemsData(pureBase) as unknown as Record<string, unknown>[],
  };
  try {
    return getters[sectionId]?.() || [];
  } catch {
    return [];
  }
}

export function ModEditor({ mod, onBack, onModsChanged }: ModEditorProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>('house-rules');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Per-section data: sectionId → rows
  const [sectionData, setSectionData] = useState<Record<string, Record<string, unknown>[]>>({});
  // Track which sections have unsaved changes (by section ID)
  const [dirtySections, setDirtySections] = useState<Set<string>>(new Set());
  // Per-section mode: rootKey → "add" or "replace" (initialized from manifest)
  const [sectionModes, setSectionModes] = useState<Record<string, 'add' | 'replace'>>({});
  const [modName, setModName] = useState(mod.manifest.name);
  const [modAuthor, setModAuthor] = useState(mod.manifest.author);
  const [version, setVersion] = useState(mod.manifest.version);
  const [description, setDescription] = useState(mod.manifest.description);
  const [manifestDirty, setManifestDirty] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  // House rules: ruleId → true/false/null (null = not set by this mod)
  const [houseRules, setHouseRules] = useState<Record<string, boolean | null>>({});
  const [houseRulesDirty, setHouseRulesDirty] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  // Validation results dialog
  const [validationResults, setValidationResults] = useState<{ sectionLabel: string; sectionId: string; errors: ValidationError[] }[] | null>(null);
  // Sidebar groups: which are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Sidebar filter
  const [sidebarFilter, setSidebarFilter] = useState('');
  // Track whether other enabled mods exist (for Import from Active Mods)
  const [hasOtherMods, setHasOtherMods] = useState(false);
  // Preview merged data toggle
  const [previewMerged, setPreviewMerged] = useState(false);

  // Build a section lookup map
  const sectionMap = useMemo(() => {
    const map = new Map<string, EditorSection>();
    for (const s of EDITOR_SECTIONS) map.set(s.id, s);
    return map;
  }, []);

  /** Get the count of data rows for a section */
  const getSectionRowCount = useCallback((sectionId: string) => {
    return (sectionData[sectionId] || []).length;
  }, [sectionData]);

  /** Get total data rows for a group */
  const getGroupRowCount = useCallback((groupSectionIds: string[]) => {
    return groupSectionIds.reduce((sum, id) => sum + getSectionRowCount(id), 0);
  }, [getSectionRowCount]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Load mod data for all sections
  // Also apply other enabled mods to cache so "Import from Active Mods" works
  useEffect(() => {
    async function loadModData() {
      setLoading(true);

      // Apply all enabled mods (except the one being edited) to the data cache
      // so that getBaseDataForSection(id, false) returns merged data from other mods
      const allMods = await getInstalledMods();
      const otherEnabledMods = allMods
        .filter(m => m.enabled && m.folderName !== mod.folderName && m.files.length > 0)
        .sort((a, b) => a.priority - b.priority);
      if (otherEnabledMods.length > 0) {
        await reloadWithSpecificMods(otherEnabledMods);
      }
      setHasOtherMods(otherEnabledMods.length > 0);

      const data: Record<string, Record<string, unknown>[]> = {};

      // Group sections by file to avoid loading the same file multiple times
      const fileToSections = new Map<ModDataFileName, EditorSection[]>();
      for (const section of EDITOR_SECTIONS) {
        const list = fileToSections.get(section.fileName) || [];
        list.push(section);
        fileToSections.set(section.fileName, list);
      }

      // Also track which files we need for house rules
      const fileToHouseRules = new Map<ModDataFileName, HouseRule[]>();
      for (const rule of HOUSE_RULES) {
        const list = fileToHouseRules.get(rule.fileName) || [];
        list.push(rule);
        fileToHouseRules.set(rule.fileName, list);
      }

      // Collect all unique files we need to load
      const allFiles = new Set<ModDataFileName>([
        ...fileToSections.keys(),
        ...fileToHouseRules.keys(),
      ]);

      // Cache loaded file data to avoid re-loading
      const loadedFiles = new Map<ModDataFileName, Record<string, unknown> | null>();

      for (const fileName of allFiles) {
        if (!mod.files.includes(fileName)) {
          loadedFiles.set(fileName, null);
          continue;
        }
        const fileData = await getModFileData(mod.folderName, fileName);
        loadedFiles.set(fileName, fileData && typeof fileData === 'object' ? fileData as Record<string, unknown> : null);
      }

      // Populate section data from loaded files
      for (const [fileName, sections] of fileToSections) {
        const fileData = loadedFiles.get(fileName);
        if (fileData) {
          for (const section of sections) {
            const val = fileData[section.rootKey];
            if (section.dataType === 'record') {
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                data[section.id] = Object.entries(val).map(([key, item]) => ({
                  id: key,
                  ...(item as Record<string, unknown>)
                }));
              } else {
                data[section.id] = [];
              }
            } else if (section.dataType === 'object') {
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                data[section.id] = [{ id: section.id, ...(val as Record<string, unknown>) }];
              } else {
                data[section.id] = [];
              }
            } else {
              // Default is array
              if (Array.isArray(val)) {
                data[section.id] = val as Record<string, unknown>[];
              } else {
                data[section.id] = [];
              }
            }
          }
        } else {
          for (const section of sections) {
            data[section.id] = [];
          }
        }
      }

      // Load house rule values from mod files
      const loadedHouseRules: Record<string, boolean | null> = {};
      for (const rule of HOUSE_RULES) {
        const fileData = loadedFiles.get(rule.fileName);
        if (fileData && rule.jsonKey in fileData) {
          loadedHouseRules[rule.id] = !!fileData[rule.jsonKey];
        } else {
          loadedHouseRules[rule.id] = null;
        }
      }

      setSectionData(data);
      setHouseRules(loadedHouseRules);
      setDirtySections(new Set());
      // Initialize per-section modes from manifest
      setSectionModes(
        mod.manifest.fileModes
          ? Object.fromEntries(Object.entries(mod.manifest.fileModes).filter(([, v]) => v !== undefined)) as Record<string, 'add' | 'replace'>
          : {}
      );
      setManifestDirty(false);

      // Auto-expand groups that have data
      const groupsWithData = new Set<string>();
      for (const group of EDITOR_SECTION_GROUPS) {
        if (group.sectionIds.some(id => (data[id] || []).length > 0)) {
          groupsWithData.add(group.id);
        }
      }
      setExpandedGroups(groupsWithData);

      setLoading(false);
    }
    loadModData();
    // Restore cache to no mods when leaving editor
    return () => { reloadWithSpecificMods([]); };
  }, [mod]);

  const handleSectionDataChange = useCallback((sectionId: string, rows: Record<string, unknown>[]) => {
    setSectionData(prev => ({ ...prev, [sectionId]: rows }));
    setDirtySections(prev => new Set(prev).add(sectionId));
  }, []);

  const handleHouseRuleChange = useCallback((rule: HouseRule, value: boolean | null) => {
    setHouseRules(prev => ({ ...prev, [rule.id]: value }));
    setHouseRulesDirty(true);
  }, []);

  const handleSectionModeChange = useCallback((rootKey: string, newMode: 'add' | 'replace') => {
    setSectionModes(prev => ({ ...prev, [rootKey]: newMode }));
    setManifestDirty(true);
  }, []);

  /** Resolve the effective mode for a section by its rootKey */
  const getSectionMode = useCallback((rootKey: string): 'add' | 'replace' => {
    return sectionModes[rootKey] ?? 'add';
  }, [sectionModes]);

  /** Compute merged preview data for the active section */
  const mergedPreviewData = useMemo(() => {
    if (!previewMerged || !activeSectionId || activeSectionId === 'house-rules') return [];
    const section = sectionMap.get(activeSectionId);
    if (!section) return [];

    const modRows = sectionData[activeSectionId] || [];
    const mode = getSectionMode(section.rootKey);

    if (mode === 'replace') {
      // In replace mode, only mod items exist — tag them all as mod-sourced
      return modRows.map(r => ({ ...r, _source: 'mod' }));
    }

    // Add mode: merge mod items into base (including other enabled mods) by ID
    const baseRows = getBaseDataForSection(activeSectionId, false);
    const map = new Map<string, Record<string, unknown>>();
    for (const item of baseRows) {
      const key = (item.id as string) || JSON.stringify(item);
      map.set(key, { ...item, _source: 'base' });
    }
    for (const item of modRows) {
      const key = (item.id as string) || JSON.stringify(item);
      map.set(key, { ...item, _source: 'mod' });
    }
    return Array.from(map.values());
  }, [previewMerged, activeSectionId, sectionData, sectionMap, getSectionMode]);

  /** Highlight function: mod-sourced rows get a primary color left border */
  const previewRowHighlight = useCallback((row: Record<string, unknown>) => {
    return row._source === 'mod' ? '#1976d2' : undefined;
  }, []);

  const handleSave = useCallback(async () => {
    // Validate all dirty sections
    for (const section of EDITOR_SECTIONS) {
      const rows = sectionData[section.id] || [];
      if (rows.length > 0) {
        const errors = validateRows(rows, section.columns);
        if (errors.length > 0) {
          setSnackbar({ open: true, message: `Validation errors in "${section.label}": ${errors[0].message}`, severity: 'error' });
          // Navigate to the section with errors and expand its group
          setActiveSectionId(section.id);
          for (const group of EDITOR_SECTION_GROUPS) {
            if (group.sectionIds.includes(section.id)) {
              setExpandedGroups(prev => new Set(prev).add(group.id));
              break;
            }
          }
          return;
        }
      }
    }

    setSaving(true);

    // Group sections by file and save
    const fileToSections = new Map<ModDataFileName, EditorSection[]>();
    for (const section of EDITOR_SECTIONS) {
      const list = fileToSections.get(section.fileName) || [];
      list.push(section);
      fileToSections.set(section.fileName, list);
    }

    let saveErrors = 0;

    // Derive which files need saving from dirty sections
    const filesToSave = new Set<ModDataFileName>();
    for (const sectionId of dirtySections) {
      const section = EDITOR_SECTIONS.find(s => s.id === sectionId);
      if (section) filesToSave.add(section.fileName);
    }
    if (houseRulesDirty) {
      for (const rule of HOUSE_RULES) {
        filesToSave.add(rule.fileName);
      }
    }

    for (const fileName of filesToSave) {
      const sections = fileToSections.get(fileName) || [];
      // Check if any section in this file has data or house rules are set
      const hasData = sections.some(s => (sectionData[s.id] || []).length > 0);
      const fileHouseRules = HOUSE_RULES.filter(r => r.fileName === fileName);
      const hasSetRules = fileHouseRules.some(r => houseRules[r.id] !== null);
      if (!hasData && !hasSetRules) continue;

      // Build the file object — only include sections that have data
      const fileObj: Record<string, unknown> = {};
      for (const section of sections) {
        const rows = sectionData[section.id] || [];
        if (rows.length === 0) continue;
        // Strip _source from items before saving
        const cleanRows = rows.map(row => {
          const { _source, ...rest } = row;
          void _source;
          return rest;
        });
        
        if (section.dataType === 'record') {
          const recordObj: Record<string, unknown> = {};
          for (const row of cleanRows) {
            const { id, ...rest } = row;
            if (id && typeof id === 'string') {
              recordObj[id] = rest;
            }
          }
          fileObj[section.rootKey] = recordObj;
        } else if (section.dataType === 'object') {
          fileObj[section.rootKey] = cleanRows[0];
        } else {
          fileObj[section.rootKey] = cleanRows;
        }
      }

      // Add house rule values for this file (only if explicitly set)
      for (const rule of fileHouseRules) {
        const val = houseRules[rule.id];
        if (val !== null && val !== undefined) {
          fileObj[rule.jsonKey] = val;
        }
      }

      const success = await saveModFileData(mod.folderName, fileName, fileObj);
      if (!success) saveErrors++;
    }

    // Save updated manifest if fileModes changed
    if (manifestDirty) {
      const updatedManifest = { ...mod.manifest, name: modName, author: modAuthor, version, description, fileModes: sectionModes };
      const success = await saveModFileData(mod.folderName, 'mod.json', updatedManifest);
      if (!success) saveErrors++;
    }

    setSaving(false);

    if (saveErrors > 0) {
      setSnackbar({ open: true, message: `Failed to save ${saveErrors} file(s)`, severity: 'error' });
    } else {
      setDirtySections(new Set());
      setHouseRulesDirty(false);
      setManifestDirty(false);
      setSnackbar({ open: true, message: 'Mod saved successfully', severity: 'success' });
      await onModsChanged();
    }
  }, [sectionData, houseRules, dirtySections, houseRulesDirty, mod.folderName, mod.manifest, modName, modAuthor, version, description, sectionModes, manifestDirty, onModsChanged]);

  /** Validate all sections and show results dialog */
  const handleValidateAll = useCallback(() => {
    const results: { sectionLabel: string; sectionId: string; errors: ValidationError[] }[] = [];
    for (const section of EDITOR_SECTIONS) {
      const rows = sectionData[section.id] || [];
      if (rows.length === 0) continue;
      const errors = validateRows(rows, section.columns);
      if (errors.length > 0) {
        results.push({ sectionLabel: section.label, sectionId: section.id, errors });
      }
    }
    setValidationResults(results);
  }, [sectionData]);

  const isHouseRulesTab = activeSectionId === 'house-rules';
  const activeSection = isHouseRulesTab ? null : sectionMap.get(activeSectionId) ?? null;
  const hasUnsavedChanges = dirtySections.size > 0 || manifestDirty || houseRulesDirty;

  // Filter sections by sidebar search
  const filterLower = sidebarFilter.toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!filterLower) return EDITOR_SECTION_GROUPS;
    return EDITOR_SECTION_GROUPS.map(group => ({
      ...group,
      sectionIds: group.sectionIds.filter(id => {
        const section = sectionMap.get(id);
        return section && section.label.toLowerCase().includes(filterLower);
      }),
    })).filter(group =>
      group.label.toLowerCase().includes(filterLower) || group.sectionIds.length > 0
    );
  }, [filterLower, sectionMap]);

  // When filter is active, auto-expand all matching groups
  const effectiveExpandedGroups = useMemo(() => {
    if (filterLower) {
      return new Set(filteredGroups.map(g => g.id));
    }
    return expandedGroups;
  }, [filterLower, filteredGroups, expandedGroups]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, pb: 1, gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={() => hasUnsavedChanges ? setConfirmBackOpen(true) : onBack()} sx={{ mt: 0.5 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Stack direction="row" spacing={3} alignItems="baseline">
            <TextField
              label="Mod Name"
              value={modName}
              onChange={e => { setModName(e.target.value); setManifestDirty(true); }}
              size="small"
              variant="standard"
              sx={{ flexGrow: 1, maxWidth: 350, '& .MuiInput-root': { fontSize: '1.25rem', fontWeight: 500 } }}
            />
            <TextField
              label="Author"
              value={modAuthor}
              onChange={e => { setModAuthor(e.target.value); setManifestDirty(true); }}
              size="small"
              variant="standard"
              sx={{ width: 200 }}
            />
            <TextField
              label="Version"
              value={version}
              onChange={e => { setVersion(e.target.value); setManifestDirty(true); }}
              size="small"
              variant="standard"
              sx={{ width: 100 }}
            />
          </Stack>
          <TextField
            label="Description"
            value={description}
            onChange={e => { setDescription(e.target.value); setManifestDirty(true); }}
            size="small"
            variant="standard"
            multiline
            maxRows={3}
            fullWidth
          />
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          {hasUnsavedChanges && (
            <Chip label="Unsaved changes" size="small" color="warning" variant="outlined" />
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Tooltip title="Check all sections for validation errors" arrow>
            <Button
              variant="outlined"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleValidateAll}
            >
              Validate
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* Sidebar + Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Grouped sidebar */}
        <Box sx={{ borderRight: 1, borderColor: 'divider', minWidth: 220, maxWidth: 220, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter */}
          <Box sx={{ p: 1, pb: 0.5 }}>
            <TextField
              size="small"
              placeholder="Filter sections..."
              value={sidebarFilter}
              onChange={e => setSidebarFilter(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: sidebarFilter ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSidebarFilter('')} edge="end">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
            />
          </Box>

          <List dense sx={{ flexGrow: 1, overflow: 'auto', py: 0 }}>
            {/* House Rules item */}
            {(!filterLower || 'house rules'.includes(filterLower)) && (
              <ListItemButton
                selected={isHouseRulesTab}
                onClick={() => setActiveSectionId('house-rules')}
                sx={{ py: 0.5, minHeight: 32 }}
              >
                <ListItemText
                  primary="House Rules"
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                />
                {HOUSE_RULES.some(r => houseRules[r.id] !== null) && (
                  <Chip label={HOUSE_RULES.filter(r => houseRules[r.id] !== null).length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </ListItemButton>
            )}

            {/* Grouped sections */}
            {filteredGroups.map(group => {
              const isExpanded = effectiveExpandedGroups.has(group.id);
              const groupCount = getGroupRowCount(group.sectionIds);
              // When filtering and group label matches, show ALL its original sections
              const visibleSectionIds = filterLower && group.label.toLowerCase().includes(filterLower)
                ? EDITOR_SECTION_GROUPS.find(g => g.id === group.id)?.sectionIds || group.sectionIds
                : group.sectionIds;

              return (
                <Box key={group.id}>
                  {/* Group header */}
                  <ListItemButton
                    onClick={() => toggleGroup(group.id)}
                    sx={{ py: 0.25, minHeight: 32 }}
                  >
                    <ListItemText
                      primary={group.label}
                      primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {groupCount > 0 && (
                        <Chip label={groupCount} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
                      )}
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  </ListItemButton>

                  {/* Section items */}
                  <Collapse in={isExpanded}>
                    <List dense disablePadding>
                      {visibleSectionIds.map(sectionId => {
                        const section = sectionMap.get(sectionId);
                        if (!section) return null;
                        const rowCount = getSectionRowCount(sectionId);
                        const isDirty = dirtySections.has(sectionId);
                        return (
                          <ListItemButton
                            key={sectionId}
                            selected={activeSectionId === sectionId}
                            onClick={() => setActiveSectionId(sectionId)}
                            sx={{ pl: 3, py: 0.25, minHeight: 28 }}
                          >
                            <ListItemText
                              primary={section.label}
                              primaryTypographyProps={{ fontSize: '0.82rem' }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {rowCount > 0 && <Chip label={rowCount} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />}
                              {isDirty && <Typography color="warning.main" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>●</Typography>}
                            </Box>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {isHouseRulesTab && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>House Rules</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Toggle unofficial or variant rules. These override base game settings when this mod is enabled.
              </Typography>
              {HOUSE_RULES.map((rule) => (
                <Paper key={rule.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                    <Typography fontWeight="medium">{rule.label}</Typography>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={houseRules[rule.id] === null ? 'notset' : houseRules[rule.id] ? 'enabled' : 'disabled'}
                      onChange={(_e, val) => {
                        if (val === null) return;
                        const mapped = val === 'notset' ? null : val === 'enabled';
                        handleHouseRuleChange(rule, mapped);
                      }}
                    >
                      <ToggleButton value="notset" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Not Set</ToggleButton>
                      <ToggleButton value="enabled" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Enabled</ToggleButton>
                      <ToggleButton value="disabled" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Disabled</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {rule.description}
                  </Typography>
                </Paper>
              ))}
            </>
          )}
          {activeSection && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <Typography variant="h6">
                  {activeSection.label}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={getSectionMode(activeSection.rootKey)}
                  onChange={(_e, val) => { if (val) handleSectionModeChange(activeSection.rootKey, val); }}
                  disabled={previewMerged}
                >
                  <ToggleButton value="add" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Add to Base</ToggleButton>
                  <ToggleButton value="replace" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Replace Base</ToggleButton>
                </ToggleButtonGroup>
                <Box sx={{ flex: 1 }} />
                <Tooltip title={previewMerged ? 'Return to edit mode' : 'Preview the final merged result (base + mod data)'} arrow>
                  <Button
                    size="small"
                    variant={previewMerged ? 'contained' : 'outlined'}
                    startIcon={previewMerged ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    onClick={() => setPreviewMerged(prev => !prev)}
                  >
                    {previewMerged ? 'Back to Edit' : 'Preview Merged'}
                  </Button>
                </Tooltip>
              </Box>
              {!previewMerged && activeSection.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {activeSection.description}
                </Typography>
              )}
              {!previewMerged && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                  {getSectionMode(activeSection.rootKey) === 'add'
                    ? 'Add mode: Items here are merged with the base game data. If an item shares the same ID as a base item, it overrides the base version.'
                    : 'Replace mode: This section completely replaces the base game data. Only items listed here will exist in-game.'}
                </Typography>
              )}
              {previewMerged && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                  Showing the final merged data that players will see. <Box component="span" sx={{ borderLeft: '4px solid #1976d2', pl: 0.5 }}>Blue-bordered rows</Box> are from this mod.
                </Typography>
              )}
              <EditableDataGrid
                columns={activeSection.columns}
                rows={previewMerged ? mergedPreviewData : (sectionData[activeSection.id] || [])}
                onChange={rows => handleSectionDataChange(activeSection.id, rows)}
                defaultItem={activeSection.defaultItem}
                baseData={getBaseDataForSection(activeSection.id, true)}
                activeModsData={hasOtherMods ? getBaseDataForSection(activeSection.id, false) : undefined}
                disableAdd={activeSection.dataType === 'object'}
                disableDelete={activeSection.dataType === 'object'}
                readOnly={previewMerged}
                rowHighlightColor={previewMerged ? previewRowHighlight : undefined}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={confirmBackOpen} onClose={() => setConfirmBackOpen(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to go back? All changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBackOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={onBack}>Discard Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Validation Results Dialog */}
      <Dialog open={validationResults !== null} onClose={() => setValidationResults(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {validationResults && validationResults.length === 0
            ? <><CheckCircleOutlineIcon color="success" /> Validation Passed</>
            : <><ErrorOutlineIcon color="error" /> Validation Errors</>}
        </DialogTitle>
        <DialogContent>
          {validationResults && validationResults.length === 0 ? (
            <DialogContentText>All sections passed validation. No errors found.</DialogContentText>
          ) : (
            <Box>
              <DialogContentText sx={{ mb: 1 }}>
                Found {validationResults?.reduce((sum, r) => sum + r.errors.length, 0)} error{(validationResults?.reduce((sum, r) => sum + r.errors.length, 0) ?? 0) !== 1 ? 's' : ''} in {validationResults?.length} section{(validationResults?.length ?? 0) !== 1 ? 's' : ''}:
              </DialogContentText>
              {validationResults?.map(({ sectionLabel, sectionId, errors }) => (
                <Box key={sectionId} sx={{ mb: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    color="primary"
                    onClick={() => {
                      setActiveSectionId(sectionId);
                      for (const group of EDITOR_SECTION_GROUPS) {
                        if (group.sectionIds.includes(sectionId)) {
                          setExpandedGroups(prev => new Set(prev).add(group.id));
                          break;
                        }
                      }
                      setValidationResults(null);
                    }}
                  >
                    {sectionLabel} ({errors.length})
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {errors.map((err, i) => (
                      <Typography component="li" key={i} variant="caption" color="text.secondary">
                        Row {err.rowIndex + 1}, {err.columnKey}: {err.message}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationResults(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
