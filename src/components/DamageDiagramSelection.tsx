import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { ConfirmDialog } from './shared';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import type { Hull } from '../types/hull';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { InstalledLaunchSystem, OrdnanceDesign } from '../types/ordnance';
import { getLaunchSystemsData } from '../services/dataLoader';
import type {
  DamageZone,
  ZoneSystemReference,
  ZoneCode,
  SystemDamageCategory,
} from '../types/damageDiagram';
import { ZONE_NAMES } from '../types/damageDiagram';
import {
  createEmptyZones,
  generateZoneSystemRefId,
  sortSystemsByDamagePriority,
  getFirepowerOrder,
  calculateDamageDiagramStats,
  canWeaponBeInZone,
} from '../services/damageDiagramService';

interface DamageDiagramSelectionProps {
  hull: Hull;
  installedPowerPlants: InstalledPowerPlant[];
  installedFuelTanks: InstalledFuelTank[];
  installedEngines: InstalledEngine[];
  installedEngineFuelTanks: InstalledEngineFuelTank[];
  installedFTLDrive: InstalledFTLDrive | null;
  installedFTLFuelTanks: InstalledFTLFuelTank[];
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  installedWeapons: InstalledWeapon[];
  installedLaunchSystems: InstalledLaunchSystem[];
  ordnanceDesigns: OrdnanceDesign[];
  installedDefenses: InstalledDefenseSystem[];
  installedCommandControl: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedHangarMisc: InstalledHangarMiscSystem[];
  zones: DamageZone[];
  onZonesChange: (zones: DamageZone[]) => void;
}

// ============== Helper to build unassigned systems list ==============

interface UnassignedSystem {
  id: string;
  name: string;
  hullPoints: number;
  category: SystemDamageCategory;
  firepowerOrder?: number;
  arcs?: string[];
  originalType: string;
}

// Category filter options with display names
const CATEGORY_FILTERS: { key: SystemDamageCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'weapon', label: 'Weapons' },
  { key: 'defense', label: 'Defenses' },
  { key: 'sensor', label: 'Sensors' },
  { key: 'command', label: 'Command' },
  { key: 'engine', label: 'Engines' },
  { key: 'powerPlant', label: 'Power' },
  { key: 'ftlDrive', label: 'FTL' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'support', label: 'Support' },
  { key: 'accommodation', label: 'Quarters' },
  { key: 'hangar', label: 'Hangars' },
  { key: 'miscellaneous', label: 'Misc' },
  { key: 'communication', label: 'Comms' },
];

// Color mapping for system categories
const CATEGORY_COLORS: Record<SystemDamageCategory, string> = {
  weapon: '#ef5350',
  defense: '#42a5f5',
  sensor: '#ab47bc',
  communication: '#7e57c2',
  fuel: '#8d6e63',
  hangar: '#78909c',
  accommodation: '#26a69a',
  miscellaneous: '#bdbdbd',
  support: '#66bb6a',
  engine: '#ff7043',
  powerPlant: '#ffa726',
  ftlDrive: '#29b6f6',
  command: '#ffee58',
};

const CATEGORY_TEXT_COLORS: Record<SystemDamageCategory, string> = {
  weapon: '#fff',
  defense: '#fff',
  sensor: '#fff',
  communication: '#fff',
  fuel: '#fff',
  hangar: '#fff',
  accommodation: '#fff',
  miscellaneous: '#333',
  support: '#fff',
  engine: '#fff',
  powerPlant: '#fff',
  ftlDrive: '#fff',
  command: '#333',
};

// Format arcs in short mode (e.g., "FPSA" for forward-port-starboard-aft)
function formatArcsShort(arcs: string[] | undefined): string {
  if (!arcs || arcs.length === 0) return '';
  const arcMap: Record<string, string> = {
    'forward': 'F',
    'port': 'P',
    'starboard': 'S',
    'aft': 'A',
    'zero-forward': 'zF',
    'zero-port': 'zP',
    'zero-starboard': 'zS',
    'zero-aft': 'zA',
  };
  const order = ['forward', 'port', 'starboard', 'aft', 'zero-forward', 'zero-port', 'zero-starboard', 'zero-aft'];
  const sorted = [...arcs].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.map(arc => arcMap[arc] || arc[0].toUpperCase()).join('');
}

/**
 * Configuration for mapping an installed system array to unassigned systems.
 * Each entry describes how to extract id, name, and hullPoints from one type of installed item.
 */
interface SystemCollectorConfig {
  idPrefix: string;
  category: SystemDamageCategory;
  originalType: string;
  getName: (item: any) => string;
  getHullPoints: (item: any) => number;
  getCategory?: (item: any) => SystemDamageCategory;
  getFirepowerOrder?: (item: any) => number;
  getArcs?: (item: any) => string[];
}

/**
 * Build a list of individual systems that can be assigned to zones.
 * Uses a data-driven config array to eliminate per-type for-loops.
 */
function buildUnassignedSystemsList(
  installedPowerPlants: InstalledPowerPlant[],
  installedFuelTanks: InstalledFuelTank[],
  installedEngines: InstalledEngine[],
  installedEngineFuelTanks: InstalledEngineFuelTank[],
  installedFTLDrive: InstalledFTLDrive | null,
  installedFTLFuelTanks: InstalledFTLFuelTank[],
  installedLifeSupport: InstalledLifeSupport[],
  installedAccommodations: InstalledAccommodation[],
  installedStoreSystems: InstalledStoreSystem[],
  installedGravitySystems: InstalledGravitySystem[],
  installedWeapons: InstalledWeapon[],
  installedLaunchSystems: InstalledLaunchSystem[],
  ordnanceDesigns: OrdnanceDesign[],
  installedDefenses: InstalledDefenseSystem[],
  installedCommandControl: InstalledCommandControlSystem[],
  installedSensors: InstalledSensor[],
  installedHangarMisc: InstalledHangarMiscSystem[],
  assignedSystemIds: Set<string>
): UnassignedSystem[] {
  const allLaunchSystems = getLaunchSystemsData();

  // Config array: one entry per system type, in display order
  const collectors: { items: any[]; config: SystemCollectorConfig }[] = [
    {
      items: installedPowerPlants,
      config: { idPrefix: 'pp', category: 'powerPlant', originalType: 'powerPlant',
        getName: (pp: InstalledPowerPlant) => `${pp.type.name} (${pp.hullPoints} HP)`,
        getHullPoints: (pp: InstalledPowerPlant) => pp.hullPoints },
    },
    {
      items: installedFuelTanks,
      config: { idPrefix: 'ppfuel', category: 'fuel', originalType: 'powerPlantFuel',
        getName: (ft: InstalledFuelTank) => `Fuel Tank (${ft.forPowerPlantType.name}) (${ft.hullPoints} HP)`,
        getHullPoints: (ft: InstalledFuelTank) => ft.hullPoints },
    },
    {
      items: installedEngines,
      config: { idPrefix: 'eng', category: 'engine', originalType: 'engine',
        getName: (e: InstalledEngine) => `${e.type.name} Engine (${e.hullPoints} HP)`,
        getHullPoints: (e: InstalledEngine) => e.hullPoints },
    },
    {
      items: installedEngineFuelTanks,
      config: { idPrefix: 'engfuel', category: 'fuel', originalType: 'engineFuel',
        getName: (ft: InstalledEngineFuelTank) => `Fuel Tank (${ft.forEngineType.name}) (${ft.hullPoints} HP)`,
        getHullPoints: (ft: InstalledEngineFuelTank) => ft.hullPoints },
    },
    {
      items: installedFTLDrive ? [installedFTLDrive] : [],
      config: { idPrefix: 'ftl', category: 'ftlDrive', originalType: 'ftlDrive',
        getName: (f: InstalledFTLDrive) => `${f.type.name} (${f.hullPoints} HP)`,
        getHullPoints: (f: InstalledFTLDrive) => f.hullPoints },
    },
    {
      items: installedFTLFuelTanks,
      config: { idPrefix: 'ftlfuel', category: 'fuel', originalType: 'ftlFuel',
        getName: (ft: InstalledFTLFuelTank) => `Fuel Tank (${ft.forFTLDriveType.name}) (${ft.hullPoints} HP)`,
        getHullPoints: (ft: InstalledFTLFuelTank) => ft.hullPoints },
    },
    {
      items: installedLifeSupport,
      config: { idPrefix: 'ls', category: 'support', originalType: 'lifeSupport',
        getName: (ls: InstalledLifeSupport) => `${ls.type.name} x${ls.quantity}`,
        getHullPoints: (ls: InstalledLifeSupport) => ls.type.hullPoints * ls.quantity },
    },
    {
      items: installedAccommodations,
      config: { idPrefix: 'acc', category: 'accommodation', originalType: 'accommodation',
        getName: (a: InstalledAccommodation) => `${a.type.name} x${a.quantity}`,
        getHullPoints: (a: InstalledAccommodation) => a.type.hullPoints * a.quantity },
    },
    {
      items: installedStoreSystems,
      config: { idPrefix: 'store', category: 'accommodation', originalType: 'storeSystem',
        getName: (s: InstalledStoreSystem) => `${s.type.name} x${s.quantity}`,
        getHullPoints: (s: InstalledStoreSystem) => s.type.hullPoints * s.quantity },
    },
    {
      items: installedGravitySystems,
      config: { idPrefix: 'grav', category: 'support', originalType: 'gravitySystem',
        getName: (g: InstalledGravitySystem) => g.type.name,
        getHullPoints: (g: InstalledGravitySystem) => g.hullPoints },
    },
    {
      items: installedWeapons,
      config: { idPrefix: 'wpn', category: 'weapon', originalType: 'weapon',
        getName: (w: InstalledWeapon) => `${w.weaponType.name} (${w.gunConfiguration}, ${w.mountType}) x${w.quantity}`,
        getHullPoints: (w: InstalledWeapon) => w.hullPoints * w.quantity,
        getFirepowerOrder: (w: InstalledWeapon) => getFirepowerOrder(w.weaponType.firepower),
        getArcs: (w: InstalledWeapon) => w.arcs },
    },
    {
      items: installedLaunchSystems,
      config: { idPrefix: 'launch', category: 'weapon', originalType: 'launchSystem',
        getName: (ls: InstalledLaunchSystem) => {
          const launchSystemDef = allLaunchSystems.find(lsd => lsd.id === ls.launchSystemType);
          const ordnanceNames = (ls.loadout || []).map(lo => {
            const design = ordnanceDesigns.find(d => d.id === lo.designId);
            return design ? design.name : '';
          }).filter(Boolean);
          const ordnanceSuffix = ordnanceNames.length > 0 ? ` [${ordnanceNames.join(', ')}]` : '';
          return `${launchSystemDef?.name ?? ls.launchSystemType} x${ls.quantity}${ordnanceSuffix}`;
        },
        getHullPoints: (ls: InstalledLaunchSystem) => ls.hullPoints,
        getFirepowerOrder: () => 99 },
    },
    {
      items: installedDefenses,
      config: { idPrefix: 'def', category: 'defense', originalType: 'defense',
        getName: (d: InstalledDefenseSystem) => `${d.type.name} x${d.quantity}`,
        getHullPoints: (d: InstalledDefenseSystem) => d.hullPoints },
    },
    {
      items: installedCommandControl,
      config: { idPrefix: 'cc', category: 'command', originalType: 'commandControl',
        getName: (c: InstalledCommandControlSystem) => `${c.type.name} x${c.quantity}`,
        getHullPoints: (c: InstalledCommandControlSystem) => c.hullPoints },
    },
    {
      items: installedSensors,
      config: { idPrefix: 'sen', category: 'sensor', originalType: 'sensor',
        getName: (s: InstalledSensor) => `${s.type.name} x${s.quantity}`,
        getHullPoints: (s: InstalledSensor) => s.hullPoints },
    },
    {
      items: installedHangarMisc,
      config: { idPrefix: 'hm', category: 'miscellaneous', originalType: 'hangarMisc',
        getName: (hm: InstalledHangarMiscSystem) => `${hm.type.name} x${hm.quantity}`,
        getHullPoints: (hm: InstalledHangarMiscSystem) => hm.hullPoints,
        getCategory: (hm: InstalledHangarMiscSystem) =>
          hm.type.category === 'hangar' || hm.type.category === 'cargo' ? 'hangar'
          : hm.type.category === 'communication' ? 'communication'
          : 'miscellaneous' },
    },
  ];

  const systems: UnassignedSystem[] = [];

  for (const { items, config } of collectors) {
    for (const item of items) {
      const id = `${config.idPrefix}-${item.id}`;
      if (assignedSystemIds.has(id)) continue;

      const system: UnassignedSystem = {
        id,
        name: config.getName(item),
        hullPoints: config.getHullPoints(item),
        category: config.getCategory ? config.getCategory(item) : config.category,
        originalType: config.originalType,
      };

      if (config.getFirepowerOrder) {
        system.firepowerOrder = config.getFirepowerOrder(item);
      }
      if (config.getArcs) {
        system.arcs = config.getArcs(item);
      }

      systems.push(system);
    }
  }

  return systems;
}

// ============== Main Component ==============

export function DamageDiagramSelection({
  hull,
  installedPowerPlants,
  installedFuelTanks,
  installedEngines,
  installedEngineFuelTanks,
  installedFTLDrive,
  installedFTLFuelTanks,
  installedLifeSupport,
  installedAccommodations,
  installedStoreSystems,
  installedGravitySystems,
  installedWeapons,
  installedLaunchSystems,
  ordnanceDesigns,
  installedDefenses,
  installedCommandControl,
  installedSensors,
  installedHangarMisc,
  zones,
  onZonesChange,
}: DamageDiagramSelectionProps) {

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<SystemDamageCategory | 'all'>('all');
  // Pool sort state
  const [poolSortMode, setPoolSortMode] = useState<'category' | 'hp' | 'name'>('category');
  // Multiselect state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  // Keyboard hints visibility
  const [showKeyHints, setShowKeyHints] = useState(false);
  const [showShortcutsBanner, setShowShortcutsBanner] = useState(
    () => !localStorage.getItem('damageDiagram.shortcutsBannerDismissed')
  );
  // Drag state
  const [draggedSystemId, setDraggedSystemId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<ZoneCode | null>(null);
  // For drag between zones
  const [draggedZoneSystem, setDraggedZoneSystem] = useState<{ zoneCode: ZoneCode; refId: string } | null>(null);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  // Track which zone each system ref came from for drag source
  const dragSourceRef = useRef<{ fromZone: ZoneCode; refId: string; systemRef: ZoneSystemReference } | null>(null);

  // Initialize zones if empty
  const effectiveZones = useMemo(() => {
    if (zones.length === 0) {
      return createEmptyZones(hull);
    }
    return zones;
  }, [zones, hull]);

  // Collect all assigned system IDs
  const assignedSystemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const zone of effectiveZones) {
      for (const sys of zone.systems) {
        ids.add(sys.installedSystemId);
      }
    }
    return ids;
  }, [effectiveZones]);

  // Build list of ALL systems
  const allSystems = useMemo(() => {
    return buildUnassignedSystemsList(
      installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks,
      installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations,
      installedStoreSystems, installedGravitySystems, installedWeapons, installedLaunchSystems,
      ordnanceDesigns, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
      new Set()
    );
  }, [
    installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks,
    installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations,
    installedStoreSystems, installedGravitySystems, installedWeapons, installedLaunchSystems,
    ordnanceDesigns, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
  ]);

  // Keep zone system names in sync with canonical names (handles renames across versions)
  const canonicalNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const sys of allSystems) map.set(sys.id, sys.name);
    return map;
  }, [allSystems]);

  useEffect(() => {
    let changed = false;
    const updated = effectiveZones.map(zone => {
      const systems = zone.systems.map(sys => {
        const canonical = canonicalNames.get(sys.installedSystemId);
        if (canonical && canonical !== sys.name) {
          changed = true;
          return { ...sys, name: canonical };
        }
        return sys;
      });
      return changed ? { ...zone, systems } : zone;
    });
    if (changed) onZonesChange(updated);
  }, [canonicalNames, effectiveZones, onZonesChange]);

  // Build list of unassigned systems
  const unassignedSystems = useMemo(() => {
    return buildUnassignedSystemsList(
      installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks,
      installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations,
      installedStoreSystems, installedGravitySystems, installedWeapons, installedLaunchSystems,
      ordnanceDesigns, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
      assignedSystemIds
    );
  }, [
    installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks,
    installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations,
    installedStoreSystems, installedGravitySystems, installedWeapons, installedLaunchSystems,
    ordnanceDesigns, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
    assignedSystemIds,
  ]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { assigned: number; total: number }> = {};
    for (const sys of allSystems) {
      if (!counts[sys.category]) counts[sys.category] = { assigned: 0, total: 0 };
      counts[sys.category].total++;
    }
    for (const cat of Object.keys(counts)) {
      const unassignedInCat = unassignedSystems.filter(s => s.category === cat).length;
      counts[cat].assigned = counts[cat].total - unassignedInCat;
    }
    return counts;
  }, [allSystems, unassignedSystems]);

  // Filter and sort unassigned systems
  const filteredUnassignedSystems = useMemo(() => {
    let systems = categoryFilter === 'all' ? unassignedSystems : unassignedSystems.filter(s => s.category === categoryFilter);
    if (poolSortMode === 'hp') {
      systems = [...systems].sort((a, b) => b.hullPoints - a.hullPoints);
    } else if (poolSortMode === 'name') {
      systems = [...systems].sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'category' keeps original order from buildUnassignedSystemsList
    return systems;
  }, [unassignedSystems, categoryFilter, poolSortMode]);

  // Compute info about what's being dragged (for capacity warnings + smart suggestions)
  const dragInfo = useMemo(() => {
    if (draggedSystemId) {
      // Dragging from pool — could be single or multi-select
      if (selectedIds.size > 0 && selectedIds.has(draggedSystemId)) {
        const systems = unassignedSystems.filter(s => selectedIds.has(s.id));
        const totalHp = systems.reduce((sum, s) => sum + s.hullPoints, 0);
        const hasWeaponArcs = systems.some(s => s.category === 'weapon' && s.arcs && s.arcs.length > 0);
        const weaponArcSets = systems.filter(s => s.category === 'weapon' && s.arcs && s.arcs.length > 0).map(s => s.arcs!);
        return { totalHp, count: systems.length, hasWeaponArcs, weaponArcSets, fromZoneHp: 0 };
      }
      const system = unassignedSystems.find(s => s.id === draggedSystemId);
      if (system) {
        const hasWeaponArcs = system.category === 'weapon' && system.arcs && system.arcs.length > 0;
        return { totalHp: system.hullPoints, count: 1, hasWeaponArcs: !!hasWeaponArcs, weaponArcSets: hasWeaponArcs ? [system.arcs!] : [], fromZoneHp: 0 };
      }
    }
    if (draggedZoneSystem && dragSourceRef.current) {
      const sys = dragSourceRef.current.systemRef;
      return { totalHp: sys.hullPoints, count: 1, hasWeaponArcs: false, weaponArcSets: [] as string[][], fromZoneHp: sys.hullPoints };
    }
    return null;
  }, [draggedSystemId, draggedZoneSystem, selectedIds, unassignedSystems]);

  // Total systems count
  const totalSystemsCount = useMemo(() => {
    return (
      installedPowerPlants.length + installedFuelTanks.length + installedEngines.length +
      installedEngineFuelTanks.length + (installedFTLDrive ? 1 : 0) + installedFTLFuelTanks.length +
      installedLifeSupport.length + installedAccommodations.length + installedStoreSystems.length +
      installedGravitySystems.length + installedWeapons.length + installedLaunchSystems.length +
      installedDefenses.length + installedCommandControl.length + installedSensors.length +
      installedHangarMisc.length
    );
  }, [
    installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks,
    installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations,
    installedStoreSystems, installedGravitySystems, installedWeapons, installedLaunchSystems,
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
  ]);

  // Stats
  const stats = useMemo(() => {
    return calculateDamageDiagramStats(effectiveZones, totalSystemsCount);
  }, [effectiveZones, totalSystemsCount]);

  // ============== Actions ==============

  const handleRowClick = useCallback(
    (systemId: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedId) {
        const currentIndex = filteredUnassignedSystems.findIndex(s => s.id === systemId);
        const lastIndex = filteredUnassignedSystems.findIndex(s => s.id === lastSelectedId);
        if (currentIndex !== -1 && lastIndex !== -1) {
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          const rangeIds = filteredUnassignedSystems.slice(start, end + 1).map(s => s.id);
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            rangeIds.forEach(id => newSet.add(id));
            return newSet;
          });
        }
      } else {
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(systemId)) newSet.delete(systemId);
          else newSet.add(systemId);
          return newSet;
        });
        setLastSelectedId(systemId);
      }
    },
    [filteredUnassignedSystems, lastSelectedId]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const handleAssignMultiple = useCallback(
    (systemIds: string[], zoneCode: ZoneCode) => {
      let newZones = [...effectiveZones];
      for (const systemId of systemIds) {
        const system = unassignedSystems.find((s) => s.id === systemId);
        if (!system) continue;
        if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
          if (!canWeaponBeInZone(system.arcs, zoneCode)) continue;
        }
        const newRef: ZoneSystemReference = {
          id: generateZoneSystemRefId(), systemType: system.category, name: system.name,
          hullPoints: system.hullPoints, installedSystemId: systemId, firepowerOrder: system.firepowerOrder,
        };
        newZones = newZones.map((zone) => {
          if (zone.code === zoneCode) {
            const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
            return { ...zone, systems: newSystems, totalHullPoints: zone.totalHullPoints + system.hullPoints };
          }
          return zone;
        });
      }
      onZonesChange(newZones);
      setSelectedIds(new Set());
      setLastSelectedId(null);
    },
    [unassignedSystems, effectiveZones, onZonesChange]
  );

  const handleAssignSystem = useCallback(
    (systemId: string, zoneCode: ZoneCode) => {
      if (selectedIds.size > 0 && selectedIds.has(systemId)) {
        handleAssignMultiple(Array.from(selectedIds), zoneCode);
        return;
      }
      const system = unassignedSystems.find((s) => s.id === systemId);
      if (!system) return;
      // Block incompatible weapon arc assignments
      if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
        if (!canWeaponBeInZone(system.arcs, zoneCode)) return;
      }
      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(), systemType: system.category, name: system.name,
        hullPoints: system.hullPoints, installedSystemId: systemId, firepowerOrder: system.firepowerOrder,
      };
      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return { ...zone, systems: newSystems, totalHullPoints: zone.totalHullPoints + system.hullPoints };
        }
        return zone;
      });
      onZonesChange(newZones);
    },
    [unassignedSystems, effectiveZones, onZonesChange, selectedIds, handleAssignMultiple]
  );

  const handleRemoveFromZone = useCallback(
    (zoneCode: ZoneCode, refId: string) => {
      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) {
          const systemToRemove = zone.systems.find((s) => s.id === refId);
          const hpToRemove = systemToRemove?.hullPoints ?? 0;
          return { ...zone, systems: zone.systems.filter((s) => s.id !== refId), totalHullPoints: zone.totalHullPoints - hpToRemove };
        }
        return zone;
      });
      onZonesChange(newZones);
    },
    [effectiveZones, onZonesChange]
  );

  const handleClearZone = useCallback(
    (zoneCode: ZoneCode) => {
      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) return { ...zone, systems: [], totalHullPoints: 0 };
        return zone;
      });
      onZonesChange(newZones);
    },
    [effectiveZones, onZonesChange]
  );

  const handleClearAllZones = useCallback(() => {
    const newZones = effectiveZones.map((zone) => ({ ...zone, systems: [], totalHullPoints: 0 }));
    onZonesChange(newZones);
  }, [effectiveZones, onZonesChange]);

  const handleAutoAssign = useCallback(() => {
    let newZones = [...effectiveZones];
    const remainingSystems = [...unassignedSystems];
    const categoryOrder = ['weapon', 'defense', 'sensor', 'communication', 'fuel', 'hangar', 'accommodation', 'miscellaneous', 'support', 'engine', 'powerPlant', 'ftlDrive', 'command'];
    remainingSystems.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));

    for (const system of remainingSystems) {
      let candidateZones = newZones.filter((zone) => zone.maxHullPoints - zone.totalHullPoints >= system.hullPoints);
      if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
        const arcCompatible = candidateZones.filter((zone) => canWeaponBeInZone(system.arcs!, zone.code));
        if (arcCompatible.length > 0) candidateZones = arcCompatible;
      }
      if (candidateZones.length === 0) continue;

      // Pick zone with most remaining space for balanced distribution
      let bestZone = candidateZones[0];
      let bestSpace = bestZone.maxHullPoints - bestZone.totalHullPoints;
      for (const zone of candidateZones) {
        const space = zone.maxHullPoints - zone.totalHullPoints;
        if (space > bestSpace) { bestSpace = space; bestZone = zone; }
      }

      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(), systemType: system.category, name: system.name,
        hullPoints: system.hullPoints, installedSystemId: system.id, firepowerOrder: system.firepowerOrder,
      };
      newZones = newZones.map((zone) => {
        if (zone.code === bestZone.code) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return { ...zone, systems: newSystems, totalHullPoints: zone.totalHullPoints + system.hullPoints };
        }
        return zone;
      });
    }
    onZonesChange(newZones);
  }, [unassignedSystems, effectiveZones, onZonesChange]);

  const handleAutoAssignCategory = useCallback((category: SystemDamageCategory) => {
    let newZones = [...effectiveZones];
    const systemsToAssign = unassignedSystems.filter(s => s.category === category);

    for (const system of systemsToAssign) {
      let candidateZones = newZones.filter((zone) => zone.maxHullPoints - zone.totalHullPoints >= system.hullPoints);
      if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
        const arcCompatible = candidateZones.filter((zone) => canWeaponBeInZone(system.arcs!, zone.code));
        if (arcCompatible.length > 0) candidateZones = arcCompatible;
      }
      if (candidateZones.length === 0) continue;

      let bestZone = candidateZones[0];
      let bestSpace = bestZone.maxHullPoints - bestZone.totalHullPoints;
      for (const zone of candidateZones) {
        const space = zone.maxHullPoints - zone.totalHullPoints;
        if (space > bestSpace) { bestSpace = space; bestZone = zone; }
      }

      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(), systemType: system.category, name: system.name,
        hullPoints: system.hullPoints, installedSystemId: system.id, firepowerOrder: system.firepowerOrder,
      };
      newZones = newZones.map((zone) => {
        if (zone.code === bestZone.code) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return { ...zone, systems: newSystems, totalHullPoints: zone.totalHullPoints + system.hullPoints };
        }
        return zone;
      });
    }
    onZonesChange(newZones);
  }, [unassignedSystems, effectiveZones, onZonesChange]);

  // ============== Drag & Drop from unassigned pool ==============

  const handleDragStartUnassigned = useCallback((e: React.DragEvent, systemId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', systemId);
    e.dataTransfer.setData('application/x-source', 'unassigned');
    setDraggedSystemId(systemId);
    setDraggedZoneSystem(null);
    dragSourceRef.current = null;
  }, []);

  const handleDragStartZoneSystem = useCallback((e: React.DragEvent, zoneCode: ZoneCode, sys: ZoneSystemReference) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sys.installedSystemId);
    e.dataTransfer.setData('application/x-source', 'zone');
    e.dataTransfer.setData('application/x-zone', zoneCode);
    e.dataTransfer.setData('application/x-refid', sys.id);
    setDraggedZoneSystem({ zoneCode, refId: sys.id });
    setDraggedSystemId(null);
    dragSourceRef.current = { fromZone: zoneCode, refId: sys.id, systemRef: sys };
  }, []);

  const handleDragOverZone = useCallback((e: React.DragEvent, zoneCode: ZoneCode) => {
    // Check arc compatibility — block drop on incompatible zones
    if (dragInfo && dragInfo.hasWeaponArcs && dragInfo.weaponArcSets.length > 0) {
      const anyIncompatible = dragInfo.weaponArcSets.some(arcs => !canWeaponBeInZone(arcs, zoneCode));
      if (anyIncompatible) {
        e.dataTransfer.dropEffect = 'none';
        setDragOverZone(zoneCode);
        return; // Don't preventDefault — disables the drop
      }
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(zoneCode);
  }, [dragInfo]);

  const handleDragLeaveZone = useCallback(() => {
    setDragOverZone(null);
  }, []);

  const handleDropOnZone = useCallback((e: React.DragEvent, zoneCode: ZoneCode) => {
    e.preventDefault();
    setDragOverZone(null);
    const source = e.dataTransfer.getData('application/x-source');

    if (source === 'zone') {
      // Move between zones
      const fromZone = e.dataTransfer.getData('application/x-zone') as ZoneCode;
      const refId = e.dataTransfer.getData('application/x-refid');
      if (fromZone === zoneCode) return; // Same zone, no-op

      const sourceZone = effectiveZones.find(z => z.code === fromZone);
      const systemRef = sourceZone?.systems.find(s => s.id === refId);
      if (!systemRef) return;

      const newZones = effectiveZones.map((zone) => {
        if (zone.code === fromZone) {
          return { ...zone, systems: zone.systems.filter(s => s.id !== refId), totalHullPoints: zone.totalHullPoints - systemRef.hullPoints };
        }
        if (zone.code === zoneCode) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, { ...systemRef, id: generateZoneSystemRefId() }]);
          return { ...zone, systems: newSystems, totalHullPoints: zone.totalHullPoints + systemRef.hullPoints };
        }
        return zone;
      });
      onZonesChange(newZones);
    } else {
      // From unassigned pool
      const systemId = e.dataTransfer.getData('text/plain');
      if (selectedIds.size > 0 && selectedIds.has(systemId)) {
        handleAssignMultiple(Array.from(selectedIds), zoneCode);
      } else {
        handleAssignSystem(systemId, zoneCode);
      }
    }

    setDraggedSystemId(null);
    setDraggedZoneSystem(null);
    dragSourceRef.current = null;
  }, [effectiveZones, onZonesChange, selectedIds, handleAssignMultiple, handleAssignSystem]);

  const handleDragEnd = useCallback(() => {
    setDraggedSystemId(null);
    setDraggedZoneSystem(null);
    setDragOverZone(null);
    dragSourceRef.current = null;
  }, []);

  // Assign selected/filtered systems to a zone when clicking the zone header
  const handleZoneHeaderClick = useCallback((zoneCode: ZoneCode) => {
    if (selectedIds.size > 0) {
      handleAssignMultiple(Array.from(selectedIds), zoneCode);
    }
  }, [selectedIds, handleAssignMultiple]);

  // ============== Keyboard Shortcuts ==============

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input field
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Escape: clear selection
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setLastSelectedId(null);
        return;
      }

      // Ctrl+A / Cmd+A: select all filtered unassigned
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedIds(new Set(filteredUnassignedSystems.map(s => s.id)));
        return;
      }

      // 'a' without modifier: auto-assign all
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (unassignedSystems.length > 0) {
          handleAutoAssign();
        }
        return;
      }

      // Number keys 1-9: assign selected to zone N
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= effectiveZones.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedIds.size > 0) {
          const zone = effectiveZones[num - 1];
          handleAssignMultiple(Array.from(selectedIds), zone.code);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredUnassignedSystems, unassignedSystems, effectiveZones, selectedIds, handleAutoAssign, handleAssignMultiple]);

  // ============== Render ==============

  const allAssigned = unassignedSystems.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, mb: 1 }}>
        {showShortcutsBanner && (
          <Alert
            severity="info"
            variant="outlined"
            sx={{ mb: 1, py: 0 }}
            onClose={() => {
              setShowShortcutsBanner(false);
              localStorage.setItem('damageDiagram.shortcutsBannerDismissed', '1');
            }}
          >
            <Typography variant="caption">
              <strong>Tip:</strong> Use keyboard shortcuts for faster assignment — press <strong>1-9</strong> to assign selected systems to zones, <strong>Ctrl+A</strong> to select all, <strong>A</strong> to auto-assign, <strong>Esc</strong> to deselect. Click <strong>Shortcuts</strong> to toggle inline hints.
            </Typography>
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Assign systems to hit zones. Drag from the pool or select &amp; press a zone number key.
            {selectedIds.size > 0 && ` Click a zone header to assign ${selectedIds.size} selected system(s).`}
          </Typography>
          <Tooltip title={showKeyHints
            ? 'Hide keyboard shortcuts'
            : '1-N: assign selected to zone, Ctrl+A: select all, A: auto-assign, Esc: deselect'
          }>
            <Button
              size="small"
              variant={showKeyHints ? 'contained' : 'text'}
              onClick={() => setShowKeyHints(prev => !prev)}
              startIcon={<KeyboardIcon sx={{ fontSize: 18 }} />}
              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}
            >
              Shortcuts
            </Button>
          </Tooltip>
        </Box>

        {/* Category filter chips */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORY_FILTERS.map((filter) => {
            const count = filter.key === 'all'
              ? { assigned: allSystems.length - unassignedSystems.length, total: allSystems.length }
              : categoryCounts[filter.key];
            if (filter.key !== 'all' && (!count || count.total === 0)) return null;

            const isActive = categoryFilter === filter.key;
            const isComplete = count && count.assigned === count.total;
            const hasUnassigned = count && count.assigned < count.total;

            // Use category color for category chips, grey for "All"
            const catColor = filter.key !== 'all' ? CATEGORY_COLORS[filter.key as SystemDamageCategory] : undefined;
            const catTextColor = filter.key !== 'all' ? CATEGORY_TEXT_COLORS[filter.key as SystemDamageCategory] : undefined;
            const chipIcon = isComplete
              ? <CheckIcon sx={{ fontSize: 14, color: catTextColor ?? 'inherit' }} />
              : (filter.key === 'all' && !isComplete ? <WarningIcon /> : undefined);

            return (
              <Tooltip key={filter.key} title={hasUnassigned && filter.key !== 'all' ? 'Click to filter, click wand to auto-assign' : ''}>
                <Chip
                  label={count ? `${filter.label} ${count.assigned}/${count.total}` : filter.label}
                  size="small"
                  variant={isActive ? 'filled' : 'outlined'}
                  color={!catColor ? (isComplete ? 'success' : (filter.key === 'all' ? 'warning' : 'default')) : undefined}
                  icon={chipIcon}
                  onClick={() => setCategoryFilter(filter.key)}
                  onDelete={hasUnassigned && filter.key !== 'all' ? () => handleAutoAssignCategory(filter.key as SystemDamageCategory) : undefined}
                  deleteIcon={hasUnassigned && filter.key !== 'all' ? <AutoFixHighIcon fontSize="small" sx={catColor ? { color: `${catTextColor} !important` } : undefined} /> : undefined}
                  sx={catColor ? {
                    cursor: 'pointer',
                    bgcolor: isActive ? catColor : 'transparent',
                    color: isActive ? catTextColor : catColor,
                    borderColor: catColor,
                    '&:hover': { bgcolor: catColor, color: catTextColor, opacity: 0.9 },
                    '& .MuiChip-icon': { color: isActive ? catTextColor : catColor },
                  } : { cursor: 'pointer' }}
                />
              </Tooltip>
            );
          })}
          {unassignedSystems.length > 0 && (
            <Tooltip title={`Auto-assign all systems evenly across zones${showKeyHints ? ' (A)' : ''}`}>
              <Button size="small" startIcon={<AutoFixHighIcon />} onClick={handleAutoAssign}>
                Auto-Assign All{showKeyHints && <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7, fontSize: '0.65rem' }}>A</Typography>}
              </Button>
            </Tooltip>
          )}
          {stats.totalSystemsAssigned > 0 && (
            <Button size="small" color="error" startIcon={<ClearAllIcon />} onClick={() => setConfirmUnassignOpen(true)}>
              Unassign All
            </Button>
          )}
        </Box>
      </Box>

      {/* Main content: sidebar pool + zone columns */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>

        {/* Left sidebar: Unassigned systems pool */}
        <Paper
          variant="outlined"
          sx={{
            width: 280,
            minWidth: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Pool header */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: allAssigned ? 'success.dark' : 'grey.800',
            color: '#fff',
            flexShrink: 0,
          }}>
            {allAssigned ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <WarningIcon sx={{ fontSize: 16 }} />}
            <Typography variant="subtitle2" sx={{ flex: 1, color: 'inherit', fontSize: '0.8rem' }}>
              {allAssigned ? 'All assigned' : `Unassigned (${unassignedSystems.length})`}
            </Typography>
          </Box>

          {/* Pool content */}
          {!allAssigned ? (
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {/* Selection & sort controls */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75, alignItems: 'center' }}>
                {selectedIds.size > 0 && (
                  <>
                    <Chip label={`${selectedIds.size} sel`} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                    <Button size="small" variant="text" onClick={handleClearSelection} sx={{ py: 0, minHeight: 20, fontSize: '0.7rem', minWidth: 0 }}>
                      Clear{showKeyHints && <Typography component="span" variant="caption" sx={{ ml: 0.25, opacity: 0.7, fontSize: '0.6rem' }}>Esc</Typography>}
                    </Button>
                    <Box sx={{ flex: 1 }} />
                  </>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Sort:</Typography>
                {(['category', 'hp', 'name'] as const).map(mode => (
                  <Chip
                    key={mode}
                    label={mode === 'hp' ? 'HP \u2193' : mode === 'category' ? 'Cat' : 'Name'}
                    size="small"
                    variant={poolSortMode === mode ? 'filled' : 'outlined'}
                    color={poolSortMode === mode ? 'primary' : 'default'}
                    onClick={() => setPoolSortMode(mode)}
                    sx={{ height: 20, fontSize: '0.65rem', cursor: 'pointer' }}
                    aria-label={`Sort by ${mode === 'hp' ? 'hull points' : mode}`}
                  />
                ))}
              </Box>

              {showKeyHints && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.65rem', lineHeight: 1.3 }}>
                  Ctrl+A: select all &bull; Esc: deselect
                </Typography>
              )}

              {filteredUnassignedSystems.length === 0 ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  All {CATEGORY_FILTERS.find(f => f.key === categoryFilter)?.label.toLowerCase()} assigned.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {filteredUnassignedSystems.map((system) => {
                    const isSelected = selectedIds.has(system.id);
                    const isDragging = draggedSystemId === system.id;
                    return (
                      <Tooltip
                        key={system.id}
                        title={`${system.name} — ${system.hullPoints} HP${system.arcs && system.arcs.length > 0 ? ` [${formatArcsShort(system.arcs)}]` : ''}`}
                      >
                        <Chip
                          draggable
                          onDragStart={(e) => handleDragStartUnassigned(e, system.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleRowClick(system.id, e)}
                          icon={<DragIndicatorIcon sx={{ fontSize: 14 }} />}
                          label={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box component="span" sx={{
                                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                                bgcolor: CATEGORY_COLORS[system.category], flexShrink: 0,
                              }} />
                              <Typography component="span" variant="caption" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {system.name}
                              </Typography>
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                {system.hullPoints}HP
                              </Typography>
                            </Box>
                          }
                          size="small"
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : 'default'}
                          sx={{
                            cursor: 'grab',
                            opacity: isDragging ? 0.4 : 1,
                            '&:active': { cursor: 'grabbing' },
                            maxWidth: 260,
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                All systems have been assigned to zones.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Right: Zone columns grid */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, minWidth: 'max-content', height: '100%', alignItems: 'stretch' }}>
            {effectiveZones.map((zone, zoneIndex) => {
              const fillPercent = zone.maxHullPoints > 0 ? Math.min(100, (zone.totalHullPoints / zone.maxHullPoints) * 100) : 0;
              const isOver = zone.totalHullPoints > zone.maxHullPoints;
              const isEmpty = zone.systems.length === 0;
              const isDragTarget = dragOverZone === zone.code;
              const isClickableForAssign = selectedIds.size > 0;
              const zoneKeyNumber = zoneIndex + 1;

              // Smart suggestions: is this zone compatible with the dragged item?
              const isDragging = !!(draggedSystemId || draggedZoneSystem);
              const isSourceZone = draggedZoneSystem?.zoneCode === zone.code;
              let isIncompatible = false;
              if (isDragging && dragInfo && !isSourceZone) {
                // Check weapon arc compatibility
                if (dragInfo.hasWeaponArcs && dragInfo.weaponArcSets.length > 0) {
                  isIncompatible = dragInfo.weaponArcSets.some(arcs => !canWeaponBeInZone(arcs, zone.code));
                }
              }

              // Capacity warning: projected HP if dropped here
              const projectedHp = isDragTarget && dragInfo
                ? zone.totalHullPoints + dragInfo.totalHp - (isSourceZone ? dragInfo.fromZoneHp : 0)
                : null;
              const wouldOverflow = projectedHp !== null && projectedHp > zone.maxHullPoints;
              const remainingAfterDrop = projectedHp !== null ? zone.maxHullPoints - projectedHp : null;
              // Fill-based border color: green → yellow → orange → red
              const fillBorderColor = isOver
                ? '#f44336'
                : fillPercent >= 90
                  ? '#ff9800'
                  : fillPercent >= 50
                    ? '#ffc107'
                    : fillPercent > 0
                      ? '#4caf50'
                      : undefined;

              return (
                <Paper
                  key={zone.code}
                  variant="outlined"
                  onDragOver={(e) => handleDragOverZone(e, zone.code)}
                  onDragLeave={handleDragLeaveZone}
                  onDrop={(e) => handleDropOnZone(e, zone.code)}
                  sx={{
                    width: Math.max(140, Math.floor(800 / effectiveZones.length)),
                    minWidth: 120,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
                    borderColor: isDragTarget ? (isIncompatible ? 'error.main' : wouldOverflow ? '#ff9800' : 'primary.main') : fillBorderColor ?? 'divider',
                    borderWidth: isDragTarget ? 2 : fillBorderColor ? 2 : 1,
                    boxShadow: isDragTarget ? (isIncompatible ? 0 : 4) : 0,
                    bgcolor: isDragTarget ? (isIncompatible ? 'rgba(244,67,54,0.05)' : 'action.hover') : 'background.paper',
                    opacity: isDragging && !isDragTarget && (isIncompatible || isSourceZone) ? 0.45 : 1,
                  }}
                >
                  {/* Zone header */}
                  <Box
                    onClick={() => handleZoneHeaderClick(zone.code)}
                    sx={{
                      p: 1,
                      flexShrink: 0,
                      cursor: isClickableForAssign ? 'pointer' : 'default',
                      bgcolor: isOver ? 'error.dark' : isEmpty ? 'warning.dark' : 'grey.800',
                      color: '#fff',
                      '&:hover': isClickableForAssign ? { bgcolor: 'primary.dark' } : {},
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'inherit' }}>
                          {zone.code}
                        </Typography>
                        {showKeyHints && (
                          <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.5, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                            {zoneKeyNumber}
                          </Typography>
                        )}
                      </Box>
                      {zone.systems.length > 0 && (
                        <Tooltip title="Clear zone">
                          <IconButton size="small" sx={{ color: 'inherit', p: 0.25 }} onClick={(e) => { e.stopPropagation(); handleClearZone(zone.code); }}>
                            <ClearAllIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.85 }}>
                      {ZONE_NAMES[zone.code]}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={fillPercent}
                        sx={{
                          height: 4, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.2)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isOver ? '#f44336' : fillPercent >= 90 ? '#ff9800' : fillPercent >= 50 ? '#ffc107' : '#4caf50',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.85 }}>
                        {isDragTarget && projectedHp !== null ? (
                          <>
                            <Box component="span" sx={{ textDecoration: 'line-through', opacity: 0.5 }}>
                              {zone.totalHullPoints}
                            </Box>
                            <Box component="span" sx={{ color: wouldOverflow ? '#ff6659' : '#81c784', fontWeight: 'bold' }}>
                              {' → '}{projectedHp}/{zone.maxHullPoints} HP
                            </Box>
                            {remainingAfterDrop !== null && (
                              <Box component="span" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
                                {' '}({remainingAfterDrop >= 0 ? `${remainingAfterDrop} free` : `${Math.abs(remainingAfterDrop)} over`})
                              </Box>
                            )}
                          </>
                        ) : (
                          `${zone.totalHullPoints}/${zone.maxHullPoints} HP`
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Zone systems */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 0.5 }}>
                    {zone.systems.length === 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        minHeight: 80,
                        p: 1,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        m: 0.5,
                        opacity: 0.6,
                      }}>
                        <VerticalAlignTopIcon sx={{ fontSize: 28, color: 'text.secondary', transform: 'rotate(180deg)', mb: 0.5 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.3 }}>
                          Drag from pool
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.6rem' }}>
                          {showKeyHints ? `select & press ${zoneKeyNumber}` : 'or select & click header'}
                        </Typography>
                      </Box>
                    ) : (
                      zone.systems.map((sys) => (
                        <Box
                          key={sys.id}
                          draggable
                          onDragStart={(e) => handleDragStartZoneSystem(e, zone.code, sys)}
                          onDragEnd={handleDragEnd}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            mb: 0.25,
                            p: 0.5,
                            borderRadius: 0.5,
                            bgcolor: CATEGORY_COLORS[sys.systemType],
                            color: CATEGORY_TEXT_COLORS[sys.systemType],
                            cursor: 'grab',
                            opacity: draggedZoneSystem?.refId === sys.id ? 0.4 : 1,
                            '&:hover': { filter: 'brightness(1.1)' },
                            '&:active': { cursor: 'grabbing' },
                          }}
                        >
                          <DragIndicatorIcon sx={{ fontSize: 12, opacity: 0.6, flexShrink: 0 }} />
                          <Tooltip title={`${sys.name} — ${sys.hullPoints} HP (${sys.systemType})`}>
                            <Typography
                              variant="caption"
                              sx={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.68rem',
                                lineHeight: 1.3,
                                color: 'inherit',
                              }}
                            >
                              {sys.name}
                            </Typography>
                          </Tooltip>
                          <Typography variant="caption" sx={{ flexShrink: 0, fontSize: '0.65rem', opacity: 0.8, color: 'inherit' }}>
                            {sys.hullPoints}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromZone(zone.code, sys.id); }}
                            sx={{ p: 0.125, color: 'inherit', opacity: 0.6, '&:hover': { opacity: 1 } }}
                            aria-label="Remove from zone"
                          >
                            <CloseIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Box>
                      ))
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmUnassignOpen}
        title="Unassign All Systems"
        message="This will remove all system assignments from all damage zones. This action cannot be undone."
        confirmLabel="Unassign All"
        onConfirm={() => { handleClearAllZones(); setConfirmUnassignOpen(false); }}
        onCancel={() => setConfirmUnassignOpen(false)}
      />
    </Box>
  );
}
