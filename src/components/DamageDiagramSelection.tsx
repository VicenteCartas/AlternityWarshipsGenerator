import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
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
 * Build a list of individual systems that can be assigned to zones.
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
  const systems: UnassignedSystem[] = [];

  for (const pp of installedPowerPlants) {
    const id = `pp-${pp.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${pp.type.name} (${pp.hullPoints} HP)`, hullPoints: pp.hullPoints, category: 'powerPlant', originalType: 'powerPlant' });
    }
  }

  for (const ft of installedFuelTanks) {
    const id = `ppfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `Fuel Tank (${ft.forPowerPlantType.name}) (${ft.hullPoints} HP)`, hullPoints: ft.hullPoints, category: 'fuel', originalType: 'powerPlantFuel' });
    }
  }

  for (const eng of installedEngines) {
    const id = `eng-${eng.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${eng.type.name} Engine (${eng.hullPoints} HP)`, hullPoints: eng.hullPoints, category: 'engine', originalType: 'engine' });
    }
  }

  for (const ft of installedEngineFuelTanks) {
    const id = `engfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `Fuel Tank (${ft.forEngineType.name}) (${ft.hullPoints} HP)`, hullPoints: ft.hullPoints, category: 'fuel', originalType: 'engineFuel' });
    }
  }

  if (installedFTLDrive) {
    const id = `ftl-${installedFTLDrive.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${installedFTLDrive.type.name} (${installedFTLDrive.hullPoints} HP)`, hullPoints: installedFTLDrive.hullPoints, category: 'ftlDrive', originalType: 'ftlDrive' });
    }
  }

  for (const ft of installedFTLFuelTanks) {
    const id = `ftlfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `Fuel Tank (${ft.forFTLDriveType.name}) (${ft.hullPoints} HP)`, hullPoints: ft.hullPoints, category: 'fuel', originalType: 'ftlFuel' });
    }
  }

  for (const ls of installedLifeSupport) {
    const id = `ls-${ls.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${ls.type.name} x${ls.quantity}`, hullPoints: ls.type.hullPoints * ls.quantity, category: 'support', originalType: 'lifeSupport' });
    }
  }

  for (const acc of installedAccommodations) {
    const id = `acc-${acc.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${acc.type.name} x${acc.quantity}`, hullPoints: acc.type.hullPoints * acc.quantity, category: 'accommodation', originalType: 'accommodation' });
    }
  }

  for (const ss of installedStoreSystems) {
    const id = `store-${ss.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${ss.type.name} x${ss.quantity}`, hullPoints: ss.type.hullPoints * ss.quantity, category: 'accommodation', originalType: 'storeSystem' });
    }
  }

  for (const gs of installedGravitySystems) {
    const id = `grav-${gs.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: gs.type.name, hullPoints: gs.hullPoints, category: 'support', originalType: 'gravitySystem' });
    }
  }

  for (const wpn of installedWeapons) {
    const id = `wpn-${wpn.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${wpn.weaponType.name} (${wpn.gunConfiguration}, ${wpn.mountType}) x${wpn.quantity}`, hullPoints: wpn.hullPoints * wpn.quantity, category: 'weapon', firepowerOrder: getFirepowerOrder(wpn.weaponType.firepower), arcs: wpn.arcs, originalType: 'weapon' });
    }
  }

  const allLaunchSystems = getLaunchSystemsData();
  for (const ls of installedLaunchSystems) {
    const id = `launch-${ls.id}`;
    if (!assignedSystemIds.has(id)) {
      const launchSystemDef = allLaunchSystems.find(lsd => lsd.id === ls.launchSystemType);
      const ordnanceNames = (ls.loadout || []).map(lo => {
        const design = ordnanceDesigns.find(d => d.id === lo.designId);
        return design ? design.name : '';
      }).filter(Boolean);
      const ordnanceSuffix = ordnanceNames.length > 0 ? ` [${ordnanceNames.join(', ')}]` : '';
      systems.push({ id, name: `${launchSystemDef?.name ?? ls.launchSystemType} x${ls.quantity}${ordnanceSuffix}`, hullPoints: ls.hullPoints, category: 'weapon', firepowerOrder: 99, originalType: 'launchSystem' });
    }
  }

  for (const def of installedDefenses) {
    const id = `def-${def.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${def.type.name} x${def.quantity}`, hullPoints: def.hullPoints, category: 'defense', originalType: 'defense' });
    }
  }

  for (const cc of installedCommandControl) {
    const id = `cc-${cc.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${cc.type.name} x${cc.quantity}`, hullPoints: cc.hullPoints, category: 'command', originalType: 'commandControl' });
    }
  }

  for (const sen of installedSensors) {
    const id = `sen-${sen.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({ id, name: `${sen.type.name} x${sen.quantity}`, hullPoints: sen.hullPoints, category: 'sensor', originalType: 'sensor' });
    }
  }

  for (const hm of installedHangarMisc) {
    const id = `hm-${hm.id}`;
    if (!assignedSystemIds.has(id)) {
      const category = hm.type.category === 'hangar' || hm.type.category === 'cargo' ? 'hangar' : 'miscellaneous';
      systems.push({ id, name: `${hm.type.name} x${hm.quantity}`, hullPoints: hm.hullPoints, category, originalType: 'hangarMisc' });
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
  // Multiselect state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  // Collapsible unassigned panel
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);
  // Drag state
  const [draggedSystemId, setDraggedSystemId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<ZoneCode | null>(null);
  // For drag between zones
  const [draggedZoneSystem, setDraggedZoneSystem] = useState<{ zoneCode: ZoneCode; refId: string } | null>(null);
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

  // Filter unassigned systems
  const filteredUnassignedSystems = useMemo(() => {
    if (categoryFilter === 'all') return unassignedSystems;
    return unassignedSystems.filter(s => s.category === categoryFilter);
  }, [unassignedSystems, categoryFilter]);

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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(zoneCode);
  }, []);

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

  // ============== Render ==============

  const allAssigned = unassignedSystems.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Assign systems to hit zones. Drag systems from the pool below into zone columns, or use Auto-Assign.
          {selectedIds.size > 0 && ` Click a zone header to assign ${selectedIds.size} selected system(s).`}
        </Typography>

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
            <Tooltip title="Auto-assign all systems evenly across zones">
              <Button size="small" startIcon={<AutoFixHighIcon />} onClick={handleAutoAssign}>
                Auto-Assign All
              </Button>
            </Tooltip>
          )}
          {stats.totalSystemsAssigned > 0 && (
            <Button size="small" color="error" startIcon={<ClearAllIcon />} onClick={handleClearAllZones}>
              Unassign All
            </Button>
          )}
        </Box>
      </Box>

      {/* Zone columns grid (main area) */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 1, minHeight: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, minWidth: 'max-content', height: '100%', alignItems: 'stretch' }}>
          {effectiveZones.map((zone) => {
            const fillPercent = zone.maxHullPoints > 0 ? Math.min(100, (zone.totalHullPoints / zone.maxHullPoints) * 100) : 0;
            const isOver = zone.totalHullPoints > zone.maxHullPoints;
            const isEmpty = zone.systems.length === 0;
            const isDragTarget = dragOverZone === zone.code;
            const isClickableForAssign = selectedIds.size > 0;

            return (
              <Paper
                key={zone.code}
                variant="outlined"
                onDragOver={(e) => handleDragOverZone(e, zone.code)}
                onDragLeave={handleDragLeaveZone}
                onDrop={(e) => handleDropOnZone(e, zone.code)}
                sx={{
                  width: Math.max(160, Math.floor(900 / effectiveZones.length)),
                  minWidth: 140,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  borderColor: isDragTarget ? 'primary.main' : isOver ? 'error.main' : 'divider',
                  borderWidth: isDragTarget ? 2 : 1,
                  boxShadow: isDragTarget ? 4 : 0,
                  bgcolor: isDragTarget ? 'action.hover' : 'background.paper',
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
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'inherit' }}>
                      {zone.code}
                    </Typography>
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
                      color={isOver ? 'error' : fillPercent >= 90 ? 'warning' : 'primary'}
                      sx={{ height: 4, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.2)' }}
                    />
                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.85 }}>
                      {zone.totalHullPoints}/{zone.maxHullPoints} HP
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
                        Drag from pool below
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.6rem' }}>
                        or select &amp; click header
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

      {/* Unassigned systems pool (bottom panel) */}
      <Paper
        variant="outlined"
        sx={{
          flexShrink: 0,
          maxHeight: unassignedExpanded ? 280 : 40,
          transition: 'max-height 0.2s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Pool header */}
        <Box
          onClick={() => setUnassignedExpanded(!unassignedExpanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            cursor: 'pointer',
            bgcolor: allAssigned ? 'success.dark' : 'grey.800',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {allAssigned ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <WarningIcon sx={{ fontSize: 16 }} />}
          <Typography variant="subtitle2" sx={{ flex: 1, color: 'inherit' }}>
            {allAssigned
              ? 'All systems assigned'
              : `Unassigned Systems (${unassignedSystems.length} remaining)`
            }
          </Typography>
          {selectedIds.size > 0 && (
            <Chip label={`${selectedIds.size} selected`} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
          {selectedIds.size > 0 && (
            <Button size="small" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)', py: 0, minHeight: 22, fontSize: '0.7rem' }} onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}>
              Clear
            </Button>
          )}
          {!allAssigned && unassignedExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : !allAssigned ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : null}
        </Box>

        {/* Pool content */}
        {unassignedExpanded && !allAssigned && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
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
                            <Typography component="span" variant="caption" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                          maxWidth: 280,
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
