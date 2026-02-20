import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import type { Mod, ModDataFileName } from '../types/mod';
import { getModFileData, saveModFileData } from '../services/modService';
import { EDITOR_SECTIONS, HOUSE_RULES, type EditorSection, type HouseRule } from '../services/modEditorSchemas';
import { validateRows } from '../services/modValidationService';
import { EditableDataGrid } from './shared/EditableDataGrid';
import { getHullsData, getArmorTypesData, getArmorWeightsData, getPowerPlantsData, getEnginesData, getFTLDrivesData, getLifeSupportData, getAccommodationsData, getStoreSystemsData, getGravitySystemsData, getDefenseSystemsData, getCommandControlSystemsData, getSensorsData, getHangarMiscSystemsData, getBeamWeaponsData, getProjectileWeaponsData, getTorpedoWeaponsData, getSpecialWeaponsData, getLaunchSystemsData, getPropulsionSystemsData, getWarheadsData, getGuidanceSystemsData } from '../services/dataLoader';

interface ModEditorProps {
  mod: Mod;
  onBack: () => void;
  onModsChanged: () => Promise<void>;
}

// Map section IDs to base data getter functions
function getBaseDataForSection(sectionId: string): Record<string, unknown>[] {
  const getters: Record<string, () => Record<string, unknown>[]> = {
    hulls: () => getHullsData() as unknown as Record<string, unknown>[],
    armors: () => getArmorTypesData() as unknown as Record<string, unknown>[],
    armorWeights: () => getArmorWeightsData() as unknown as Record<string, unknown>[],
    powerPlants: () => getPowerPlantsData() as unknown as Record<string, unknown>[],
    engines: () => getEnginesData() as unknown as Record<string, unknown>[],
    ftlDrives: () => getFTLDrivesData() as unknown as Record<string, unknown>[],
    lifeSupport: () => getLifeSupportData() as unknown as Record<string, unknown>[],
    accommodations: () => getAccommodationsData() as unknown as Record<string, unknown>[],
    storeSystems: () => getStoreSystemsData() as unknown as Record<string, unknown>[],
    gravitySystems: () => getGravitySystemsData() as unknown as Record<string, unknown>[],
    defenseSystems: () => getDefenseSystemsData() as unknown as Record<string, unknown>[],
    commandSystems: () => getCommandControlSystemsData() as unknown as Record<string, unknown>[],
    sensors: () => getSensorsData() as unknown as Record<string, unknown>[],
    hangarMiscSystems: () => getHangarMiscSystemsData() as unknown as Record<string, unknown>[],
    beamWeapons: () => getBeamWeaponsData() as unknown as Record<string, unknown>[],
    projectileWeapons: () => getProjectileWeaponsData() as unknown as Record<string, unknown>[],
    torpedoWeapons: () => getTorpedoWeaponsData() as unknown as Record<string, unknown>[],
    specialWeapons: () => getSpecialWeaponsData() as unknown as Record<string, unknown>[],
    launchSystems: () => getLaunchSystemsData() as unknown as Record<string, unknown>[],
    propulsionSystems: () => getPropulsionSystemsData() as unknown as Record<string, unknown>[],
    warheads: () => getWarheadsData() as unknown as Record<string, unknown>[],
    guidanceSystems: () => getGuidanceSystemsData() as unknown as Record<string, unknown>[],
  };
  try {
    return getters[sectionId]?.() || [];
  } catch {
    return [];
  }
}

export function ModEditor({ mod, onBack, onModsChanged }: ModEditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Per-section data: sectionId → rows
  const [sectionData, setSectionData] = useState<Record<string, Record<string, unknown>[]>>({});
  // Track which sections have unsaved changes
  const [dirtyFiles, setDirtyFiles] = useState<Set<ModDataFileName>>(new Set());
  // Per-file mode: "add" or "replace" (initialized from manifest)
  const [fileModes, setFileModes] = useState<Record<string, 'add' | 'replace'>>({});
  const [manifestDirty, setManifestDirty] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  // House rules: ruleId → boolean value
  const [houseRules, setHouseRules] = useState<Record<string, boolean>>({});

  // Total tab count: 1 (House Rules) + EDITOR_SECTIONS.length
  const HOUSE_RULES_TAB = 0;
  const sectionTabOffset = 1;

  // Load mod data for all sections
  useEffect(() => {
    async function loadModData() {
      setLoading(true);
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
            const arr = fileData[section.rootKey];
            data[section.id] = Array.isArray(arr) ? arr as Record<string, unknown>[] : [];
          }
        } else {
          for (const section of sections) {
            data[section.id] = [];
          }
        }
      }

      // Load house rule values from mod files
      const loadedHouseRules: Record<string, boolean> = {};
      for (const rule of HOUSE_RULES) {
        const fileData = loadedFiles.get(rule.fileName);
        if (fileData && rule.jsonKey in fileData) {
          loadedHouseRules[rule.id] = !!fileData[rule.jsonKey];
        } else {
          loadedHouseRules[rule.id] = rule.defaultValue;
        }
      }

      setSectionData(data);
      setHouseRules(loadedHouseRules);
      setDirtyFiles(new Set());
      // Initialize per-file modes from manifest
      setFileModes(mod.manifest.fileModes
        ? Object.fromEntries(Object.entries(mod.manifest.fileModes).filter(([, v]) => v !== undefined)) as Record<string, 'add' | 'replace'>
        : {});
      setManifestDirty(false);
      setLoading(false);
    }
    loadModData();
  }, [mod]);

  const handleSectionDataChange = useCallback((sectionId: string, rows: Record<string, unknown>[]) => {
    const section = EDITOR_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    setSectionData(prev => ({ ...prev, [sectionId]: rows }));
    setDirtyFiles(prev => new Set(prev).add(section.fileName));
  }, []);

  const handleHouseRuleChange = useCallback((rule: HouseRule, value: boolean) => {
    setHouseRules(prev => ({ ...prev, [rule.id]: value }));
    setDirtyFiles(prev => new Set(prev).add(rule.fileName));
  }, []);

  const handleFileModeChange = useCallback((fileName: ModDataFileName, newMode: 'add' | 'replace') => {
    setFileModes(prev => ({ ...prev, [fileName]: newMode }));
    setManifestDirty(true);
  }, []);

  /** Resolve the effective mode for a file: per-file override → manifest default */
  const getFileMode = useCallback((fileName: ModDataFileName): 'add' | 'replace' => {
    return fileModes[fileName] ?? 'add';
  }, [fileModes]);

  const handleSave = useCallback(async () => {
    // Validate all dirty sections
    for (const section of EDITOR_SECTIONS) {
      const rows = sectionData[section.id] || [];
      if (rows.length > 0) {
        const errors = validateRows(rows, section.columns);
        if (errors.length > 0) {
          setSnackbar({ open: true, message: `Validation errors in "${section.label}": ${errors[0].message}`, severity: 'error' });
          // Switch to the tab with errors
          const tabIndex = EDITOR_SECTIONS.findIndex(s => s.id === section.id);
          if (tabIndex >= 0) setActiveTab(tabIndex + sectionTabOffset);
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
    for (const fileName of dirtyFiles) {
      const sections = fileToSections.get(fileName) || [];
      // Check if any section in this file has data or house rules are set
      const hasData = sections.some(s => (sectionData[s.id] || []).length > 0);
      const fileHouseRules = HOUSE_RULES.filter(r => r.fileName === fileName);
      const hasNonDefaultRules = fileHouseRules.some(r => houseRules[r.id] !== r.defaultValue);
      if (!hasData && !hasNonDefaultRules) continue;

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
        fileObj[section.rootKey] = cleanRows;
      }

      // Add house rule values for this file
      for (const rule of fileHouseRules) {
        fileObj[rule.jsonKey] = houseRules[rule.id] ?? rule.defaultValue;
      }

      const success = await saveModFileData(mod.folderName, fileName, fileObj);
      if (!success) saveErrors++;
    }

    // Save updated manifest if fileModes changed
    if (manifestDirty) {
      const updatedManifest = { ...mod.manifest, fileModes };
      const success = await saveModFileData(mod.folderName, 'mod.json', updatedManifest);
      if (!success) saveErrors++;
    }

    setSaving(false);

    if (saveErrors > 0) {
      setSnackbar({ open: true, message: `Failed to save ${saveErrors} file(s)`, severity: 'error' });
    } else {
      setDirtyFiles(new Set());
      setManifestDirty(false);
      setSnackbar({ open: true, message: 'Mod saved successfully', severity: 'success' });
      await onModsChanged();
    }
  }, [sectionData, houseRules, dirtyFiles, mod.folderName, mod.manifest, fileModes, manifestDirty, onModsChanged]);

  const isHouseRulesTab = activeTab === HOUSE_RULES_TAB;
  const activeSection = isHouseRulesTab ? null : EDITOR_SECTIONS[activeTab - sectionTabOffset];
  const hasUnsavedChanges = dirtyFiles.size > 0 || manifestDirty;

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
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1, gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h1">
            {mod.manifest.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {mod.manifest.author && `by ${mod.manifest.author} · `}v{mod.manifest.version}
            {mod.manifest.description && ` · ${mod.manifest.description}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
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
        </Stack>
      </Box>

      {/* Tabs + Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Side tabs */}
        <Tabs
          orientation="vertical"
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            minWidth: 180,
            '& .MuiTab-root': { textTransform: 'none', alignItems: 'flex-start', minHeight: 36, py: 0.5, fontSize: '0.85rem' },
          }}
        >
          <Tab
            key="house-rules"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                <span>House Rules</span>
                {HOUSE_RULES.some(r => houseRules[r.id] !== r.defaultValue) && (
                  <Chip label={HOUSE_RULES.filter(r => houseRules[r.id] !== r.defaultValue).length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </Box>
            }
            value={HOUSE_RULES_TAB}
          />
          {EDITOR_SECTIONS.map((section, idx) => {
            const rowCount = (sectionData[section.id] || []).length;
            const isDirty = dirtyFiles.has(section.fileName);
            return (
              <Tab
                key={section.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                    <span>{section.label}</span>
                    {rowCount > 0 && <Chip label={rowCount} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />}
                    {isDirty && <Typography color="warning.main" sx={{ fontSize: '0.7rem' }}>●</Typography>}
                  </Box>
                }
                value={idx + sectionTabOffset}
              />
            );
          })}
        </Tabs>

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
                  <FormControlLabel
                    control={
                      <Switch
                        checked={houseRules[rule.id] ?? rule.defaultValue}
                        onChange={(_e, checked) => handleHouseRuleChange(rule, checked)}
                      />
                    }
                    label={<Typography fontWeight="medium">{rule.label}</Typography>}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 7 }}>
                    {rule.description}
                  </Typography>
                </Paper>
              ))}
            </>
          )}
          {activeSection && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6">
                  {activeSection.label}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={getFileMode(activeSection.fileName)}
                  onChange={(_e, val) => { if (val) handleFileModeChange(activeSection.fileName, val); }}
                >
                  <ToggleButton value="add" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Add to Base</ToggleButton>
                  <ToggleButton value="replace" sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}>Replace Base</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <EditableDataGrid
                columns={activeSection.columns}
                rows={sectionData[activeSection.id] || []}
                onChange={rows => handleSectionDataChange(activeSection.id, rows)}
                defaultItem={activeSection.defaultItem}
                baseData={getBaseDataForSection(activeSection.id)}
              />
            </>
          )}
        </Box>
      </Box>

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
