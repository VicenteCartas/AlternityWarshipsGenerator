import { useMemo, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
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
import type { InstalledLaunchSystem } from '../types/ordnance';
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
  // All installed systems that need to be assigned to zones
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
  installedDefenses: InstalledDefenseSystem[];
  installedCommandControl: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedHangarMisc: InstalledHangarMiscSystem[];
  // Damage diagram state
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
];

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
  // Sort arcs in a consistent order: F, P, S, A, then zero arcs
  const order = ['forward', 'port', 'starboard', 'aft', 'zero-forward', 'zero-port', 'zero-starboard', 'zero-aft'];
  const sorted = [...arcs].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.map(arc => arcMap[arc] || arc[0].toUpperCase()).join('');
}

/**
 * Build a list of individual systems that can be assigned to zones.
 * Each installation creates separate systems based on its unique ID.
 * This allows multiple power plants of the same type/size to be assigned to different zones.
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
  installedDefenses: InstalledDefenseSystem[],
  installedCommandControl: InstalledCommandControlSystem[],
  installedSensors: InstalledSensor[],
  installedHangarMisc: InstalledHangarMiscSystem[],
  assignedSystemIds: Set<string>
): UnassignedSystem[] {
  const systems: UnassignedSystem[] = [];

  // Power Plants - each installation is a separate system
  for (const pp of installedPowerPlants) {
    const id = `pp-${pp.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${pp.type.name} (${pp.hullPoints} HP)`,
        hullPoints: pp.hullPoints,
        category: 'powerPlant',
        originalType: 'powerPlant',
      });
    }
  }

  // Power Plant Fuel Tanks - each installation is a separate system
  for (const ft of installedFuelTanks) {
    const id = `ppfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${ft.forPowerPlantType.name} Fuel (${ft.hullPoints} HP)`,
        hullPoints: ft.hullPoints,
        category: 'fuel',
        originalType: 'powerPlantFuel',
      });
    }
  }

  // Engines - each installation is a separate system
  for (const eng of installedEngines) {
    const id = `eng-${eng.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${eng.type.name} Engine (${eng.hullPoints} HP)`,
        hullPoints: eng.hullPoints,
        category: 'engine',
        originalType: 'engine',
      });
    }
  }

  // Engine Fuel Tanks - each installation is a separate system
  for (const ft of installedEngineFuelTanks) {
    const id = `engfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${ft.forEngineType.name} Fuel (${ft.hullPoints} HP)`,
        hullPoints: ft.hullPoints,
        category: 'fuel',
        originalType: 'engineFuel',
      });
    }
  }

  // FTL Drive - single installation
  if (installedFTLDrive) {
    const id = `ftl-${installedFTLDrive.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${installedFTLDrive.type.name} (${installedFTLDrive.hullPoints} HP)`,
        hullPoints: installedFTLDrive.hullPoints,
        category: 'ftlDrive',
        originalType: 'ftlDrive',
      });
    }
  }

  // FTL Fuel Tanks - each installation is a separate system
  for (const ft of installedFTLFuelTanks) {
    const id = `ftlfuel-${ft.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${ft.forFTLDriveType.name} Fuel (${ft.hullPoints} HP)`,
        hullPoints: ft.hullPoints,
        category: 'fuel',
        originalType: 'ftlFuel',
      });
    }
  }

  // Life Support - each installation is a separate system (with its quantity)
  for (const ls of installedLifeSupport) {
    const id = `ls-${ls.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${ls.type.name} x${ls.quantity}`,
        hullPoints: ls.type.hullPoints * ls.quantity,
        category: 'support',
        originalType: 'lifeSupport',
      });
    }
  }

  // Accommodations - each installation is a separate system
  for (const acc of installedAccommodations) {
    const id = `acc-${acc.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${acc.type.name} x${acc.quantity}`,
        hullPoints: acc.type.hullPoints * acc.quantity,
        category: 'accommodation',
        originalType: 'accommodation',
      });
    }
  }

  // Store Systems - each installation is a separate system
  for (const ss of installedStoreSystems) {
    const id = `store-${ss.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${ss.type.name} x${ss.quantity}`,
        hullPoints: ss.type.hullPoints * ss.quantity,
        category: 'accommodation',
        originalType: 'storeSystem',
      });
    }
  }

  // Gravity Systems - each installation is a separate system
  for (const gs of installedGravitySystems) {
    const id = `grav-${gs.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: gs.type.name,
        hullPoints: gs.hullPoints,
        category: 'support',
        originalType: 'gravitySystem',
      });
    }
  }

  // Weapons - each installation (battery) is a separate system
  for (const wpn of installedWeapons) {
    const id = `wpn-${wpn.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${wpn.weaponType.name} (${wpn.gunConfiguration}, ${wpn.mountType}, ${wpn.quantity}x)`,
        hullPoints: wpn.hullPoints * wpn.quantity,
        category: 'weapon',
        firepowerOrder: getFirepowerOrder(wpn.weaponType.firepower),
        arcs: wpn.arcs,
        originalType: 'weapon',
      });
    }
  }

  // Launch Systems - each installation is a separate system
  const allLaunchSystems = getLaunchSystemsData();
  for (const ls of installedLaunchSystems) {
    const id = `launch-${ls.id}`;
    if (!assignedSystemIds.has(id)) {
      const launchSystemDef = allLaunchSystems.find(lsd => lsd.id === ls.launchSystemType);
      systems.push({
        id,
        name: `${launchSystemDef?.name ?? ls.launchSystemType} x${ls.quantity}`,
        hullPoints: ls.hullPoints,
        category: 'weapon',
        firepowerOrder: 99, // Launch systems are treated as heavy weapons
        originalType: 'launchSystem',
      });
    }
  }

  // Defenses - each installation is a separate system
  for (const def of installedDefenses) {
    const id = `def-${def.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${def.type.name} x${def.quantity}`,
        hullPoints: def.hullPoints,
        category: 'defense',
        originalType: 'defense',
      });
    }
  }

  // Command & Control - each installation is a separate system
  for (const cc of installedCommandControl) {
    const id = `cc-${cc.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${cc.type.name} x${cc.quantity}`,
        hullPoints: cc.hullPoints,
        category: 'command',
        originalType: 'commandControl',
      });
    }
  }

  // Sensors - each installation is a separate system
  for (const sen of installedSensors) {
    const id = `sen-${sen.id}`;
    if (!assignedSystemIds.has(id)) {
      systems.push({
        id,
        name: `${sen.type.name} x${sen.quantity}`,
        hullPoints: sen.hullPoints,
        category: 'sensor',
        originalType: 'sensor',
      });
    }
  }

  // Hangar & Misc - each installation is a separate system
  for (const hm of installedHangarMisc) {
    const id = `hm-${hm.id}`;
    if (!assignedSystemIds.has(id)) {
      const category = hm.type.category === 'hangar' || hm.type.category === 'cargo'
        ? 'hangar' 
        : 'miscellaneous';
      systems.push({
        id,
        name: `${hm.type.name} x${hm.quantity}`,
        hullPoints: hm.hullPoints,
        category,
        originalType: 'hangarMisc',
      });
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

  // Build list of ALL systems (for counting totals per category)
  const allSystems = useMemo(() => {
    return buildUnassignedSystemsList(
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
      installedDefenses,
      installedCommandControl,
      installedSensors,
      installedHangarMisc,
      new Set() // Empty set = nothing assigned, so we get ALL systems
    );
  }, [
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
    installedDefenses,
    installedCommandControl,
    installedSensors,
    installedHangarMisc,
  ]);

  // Build list of unassigned systems
  const unassignedSystems = useMemo(() => {
    return buildUnassignedSystemsList(
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
      installedDefenses,
      installedCommandControl,
      installedSensors,
      installedHangarMisc,
      assignedSystemIds
    );
  }, [
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
    installedDefenses,
    installedCommandControl,
    installedSensors,
    installedHangarMisc,
    assignedSystemIds,
  ]);

  // Calculate category counts (assigned / total)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { assigned: number; total: number }> = {};
    
    // Count totals per category
    for (const sys of allSystems) {
      if (!counts[sys.category]) {
        counts[sys.category] = { assigned: 0, total: 0 };
      }
      counts[sys.category].total++;
    }
    
    // Count assigned (total - unassigned)
    for (const cat of Object.keys(counts)) {
      const unassignedInCat = unassignedSystems.filter(s => s.category === cat).length;
      counts[cat].assigned = counts[cat].total - unassignedInCat;
    }
    
    return counts;
  }, [allSystems, unassignedSystems]);

  // Filter unassigned systems by selected category
  const filteredUnassignedSystems = useMemo(() => {
    if (categoryFilter === 'all') {
      return unassignedSystems;
    }
    return unassignedSystems.filter(s => s.category === categoryFilter);
  }, [unassignedSystems, categoryFilter]);

  // Total systems count
  const totalSystemsCount = useMemo(() => {
    return (
      installedPowerPlants.length +
      installedFuelTanks.length +
      installedEngines.length +
      installedEngineFuelTanks.length +
      (installedFTLDrive ? 1 : 0) +
      installedFTLFuelTanks.length +
      installedLifeSupport.length +
      installedAccommodations.length +
      installedStoreSystems.length +
      installedGravitySystems.length +
      installedWeapons.length +
      installedLaunchSystems.length +
      installedDefenses.length +
      installedCommandControl.length +
      installedSensors.length +
      installedHangarMisc.length
    );
  }, [
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
    installedDefenses,
    installedCommandControl,
    installedSensors,
    installedHangarMisc,
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    return calculateDamageDiagramStats(effectiveZones, totalSystemsCount);
  }, [effectiveZones, totalSystemsCount]);

  // ============== Actions ==============

  // Handle row click for selection
  const handleRowClick = useCallback(
    (systemId: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedId) {
        // Shift+click: select range
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
        // Regular click: toggle selection
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(systemId)) {
            newSet.delete(systemId);
          } else {
            newSet.add(systemId);
          }
          return newSet;
        });
        setLastSelectedId(systemId);
      }
    },
    [filteredUnassignedSystems, lastSelectedId]
  );

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Assign multiple systems to a zone
  const handleAssignMultiple = useCallback(
    (systemIds: string[], zoneCode: ZoneCode) => {
      let newZones = [...effectiveZones];
      
      for (const systemId of systemIds) {
        const system = unassignedSystems.find((s) => s.id === systemId);
        if (!system) continue;

        // Check arc compatibility for weapons
        if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
          if (!canWeaponBeInZone(system.arcs, zoneCode)) {
            continue; // Skip weapons that can't go to this zone
          }
        }

        const newRef: ZoneSystemReference = {
          id: generateZoneSystemRefId(),
          systemType: system.category,
          name: system.name,
          hullPoints: system.hullPoints,
          installedSystemId: systemId,
          firepowerOrder: system.firepowerOrder,
        };

        newZones = newZones.map((zone) => {
          if (zone.code === zoneCode) {
            const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
            return {
              ...zone,
              systems: newSystems,
              totalHullPoints: zone.totalHullPoints + system.hullPoints,
            };
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
      // If there are selected items and this system is one of them, assign all selected
      if (selectedIds.size > 0 && selectedIds.has(systemId)) {
        handleAssignMultiple(Array.from(selectedIds), zoneCode);
        return;
      }

      const system = unassignedSystems.find((s) => s.id === systemId);
      if (!system) return;

      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(),
        systemType: system.category,
        name: system.name,
        hullPoints: system.hullPoints,
        installedSystemId: systemId,
        firepowerOrder: system.firepowerOrder,
      };

      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return {
            ...zone,
            systems: newSystems,
            totalHullPoints: zone.totalHullPoints + system.hullPoints,
          };
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
          return {
            ...zone,
            systems: zone.systems.filter((s) => s.id !== refId),
            totalHullPoints: zone.totalHullPoints - hpToRemove,
          };
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
        if (zone.code === zoneCode) {
          return {
            ...zone,
            systems: [],
            totalHullPoints: 0,
          };
        }
        return zone;
      });
      onZonesChange(newZones);
    },
    [effectiveZones, onZonesChange]
  );

  const handleClearAllZones = useCallback(() => {
    const newZones = effectiveZones.map((zone) => ({
      ...zone,
      systems: [],
      totalHullPoints: 0,
    }));
    onZonesChange(newZones);
  }, [effectiveZones, onZonesChange]);

  const handleMoveSystemUp = useCallback(
    (zoneCode: ZoneCode, refId: string) => {
      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) {
          const idx = zone.systems.findIndex((s) => s.id === refId);
          if (idx > 0) {
            const newSystems = [...zone.systems];
            [newSystems[idx - 1], newSystems[idx]] = [newSystems[idx], newSystems[idx - 1]];
            return { ...zone, systems: newSystems };
          }
        }
        return zone;
      });
      onZonesChange(newZones);
    },
    [effectiveZones, onZonesChange]
  );

  const handleMoveSystemDown = useCallback(
    (zoneCode: ZoneCode, refId: string) => {
      const newZones = effectiveZones.map((zone) => {
        if (zone.code === zoneCode) {
          const idx = zone.systems.findIndex((s) => s.id === refId);
          if (idx >= 0 && idx < zone.systems.length - 1) {
            const newSystems = [...zone.systems];
            [newSystems[idx], newSystems[idx + 1]] = [newSystems[idx + 1], newSystems[idx]];
            return { ...zone, systems: newSystems };
          }
        }
        return zone;
      });
      onZonesChange(newZones);
    },
    [effectiveZones, onZonesChange]
  );

  const handleAutoAssign = useCallback(() => {
    // Auto-assign all unassigned systems evenly across zones
    let newZones = [...effectiveZones];
    const remainingSystems = [...unassignedSystems];

    // Sort systems by category (surface to core)
    remainingSystems.sort((a, b) => {
      const orderA = ['weapon', 'defense', 'sensor', 'communication', 'fuel', 'hangar', 'accommodation', 'miscellaneous', 'support', 'engine', 'powerPlant', 'ftlDrive', 'command'].indexOf(a.category);
      const orderB = ['weapon', 'defense', 'sensor', 'communication', 'fuel', 'hangar', 'accommodation', 'miscellaneous', 'support', 'engine', 'powerPlant', 'ftlDrive', 'command'].indexOf(b.category);
      return orderA - orderB;
    });

    for (const system of remainingSystems) {
      // Find candidate zones
      let candidateZones = newZones.filter((zone) => {
        // Must have enough space (not exceed HP limit)
        const spaceAvailable = zone.maxHullPoints - zone.totalHullPoints;
        if (spaceAvailable < system.hullPoints) {
          return false;
        }
        return true;
      });

      // For weapons, filter by arc compatibility
      if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
        const arcCompatibleZones = candidateZones.filter((zone) =>
          canWeaponBeInZone(system.arcs!, zone.code)
        );
        // Only use arc-compatible zones if there are any; otherwise fall back to all candidates
        if (arcCompatibleZones.length > 0) {
          candidateZones = arcCompatibleZones;
        }
      }

      // Skip if no valid zone found
      if (candidateZones.length === 0) {
        continue;
      }

      // Find zone with most room among candidates
      let bestZone = candidateZones[0];
      let bestSpace = bestZone.maxHullPoints - bestZone.totalHullPoints;

      for (const zone of candidateZones) {
        const space = zone.maxHullPoints - zone.totalHullPoints;
        if (space > bestSpace) {
          bestSpace = space;
          bestZone = zone;
        }
      }

      // Add system to best zone
      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(),
        systemType: system.category,
        name: system.name,
        hullPoints: system.hullPoints,
        installedSystemId: system.id,
        firepowerOrder: system.firepowerOrder,
      };

      newZones = newZones.map((zone) => {
        if (zone.code === bestZone.code) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return {
            ...zone,
            systems: newSystems,
            totalHullPoints: zone.totalHullPoints + system.hullPoints,
          };
        }
        return zone;
      });
    }

    onZonesChange(newZones);
  }, [unassignedSystems, effectiveZones, onZonesChange]);

  const handleAutoAssignCategory = useCallback((category: SystemDamageCategory) => {
    // Auto-assign only systems of the specified category
    let newZones = [...effectiveZones];
    const systemsToAssign = unassignedSystems.filter(s => s.category === category);

    for (const system of systemsToAssign) {
      // Find candidate zones
      let candidateZones = newZones.filter((zone) => {
        const spaceAvailable = zone.maxHullPoints - zone.totalHullPoints;
        if (spaceAvailable < system.hullPoints) {
          return false;
        }
        return true;
      });

      // For weapons, filter by arc compatibility
      if (system.category === 'weapon' && system.arcs && system.arcs.length > 0) {
        const arcCompatibleZones = candidateZones.filter((zone) =>
          canWeaponBeInZone(system.arcs!, zone.code)
        );
        if (arcCompatibleZones.length > 0) {
          candidateZones = arcCompatibleZones;
        }
      }

      if (candidateZones.length === 0) {
        continue;
      }

      // Find zone with most room
      let bestZone = candidateZones[0];
      let bestSpace = bestZone.maxHullPoints - bestZone.totalHullPoints;

      for (const zone of candidateZones) {
        const space = zone.maxHullPoints - zone.totalHullPoints;
        if (space > bestSpace) {
          bestSpace = space;
          bestZone = zone;
        }
      }

      const newRef: ZoneSystemReference = {
        id: generateZoneSystemRefId(),
        systemType: system.category,
        name: system.name,
        hullPoints: system.hullPoints,
        installedSystemId: system.id,
        firepowerOrder: system.firepowerOrder,
      };

      newZones = newZones.map((zone) => {
        if (zone.code === bestZone.code) {
          const newSystems = sortSystemsByDamagePriority([...zone.systems, newRef]);
          return {
            ...zone,
            systems: newSystems,
            totalHullPoints: zone.totalHullPoints + system.hullPoints,
          };
        }
        return zone;
      });
    }

    onZonesChange(newZones);
  }, [unassignedSystems, effectiveZones, onZonesChange]);

  // ============== Render ==============

  return (
    <Box>
      {/* Header with stats */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Damage Diagram
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Organize your ship's systems into hit zones. When the ship takes damage, the location
          hit is determined by die roll, and systems within that zone are damaged from surface to core.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          {CATEGORY_FILTERS.map((filter) => {
            const count = filter.key === 'all' 
              ? { assigned: allSystems.length - unassignedSystems.length, total: allSystems.length }
              : categoryCounts[filter.key];
            
            // Skip categories with no systems
            if (filter.key !== 'all' && (!count || count.total === 0)) {
              return null;
            }
            
            const isActive = categoryFilter === filter.key;
            const isComplete = count && count.assigned === count.total;
            const hasUnassigned = count && count.assigned < count.total;
            
            // For "All" chip, show warning icon when incomplete
            const chipColor = isComplete ? 'success' : (filter.key === 'all' ? 'warning' : (isActive ? 'primary' : 'default'));
            const chipIcon = filter.key === 'all' && !isComplete ? <WarningIcon /> : undefined;
            
            return (
              <Tooltip 
                key={filter.key}
                title={hasUnassigned && filter.key !== 'all' ? `Click to filter, click wand to auto-assign` : ''}
              >
                <Chip
                  label={count ? `${filter.label} ${count.assigned}/${count.total}` : filter.label}
                  size="small"
                  variant={isActive ? "filled" : "outlined"}
                  color={chipColor}
                  icon={chipIcon}
                  onClick={() => setCategoryFilter(filter.key)}
                  onDelete={hasUnassigned && filter.key !== 'all' ? () => handleAutoAssignCategory(filter.key as SystemDamageCategory) : undefined}
                  deleteIcon={hasUnassigned && filter.key !== 'all' ? <AutoFixHighIcon fontSize="small" /> : undefined}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            );
          })}
          {stats.totalSystemsAssigned > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={handleClearAllZones}
            >
              Unassign All
            </Button>
          )}
        </Box>
      </Box>

      {/* Main content: side by side layout */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 280px)', minHeight: 400 }}>
        {/* Unassigned Systems Panel */}
        <Paper sx={{ width: 500, p: 2, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Unassigned Systems ({unassignedSystems.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedIds.size > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              )}
              {unassignedSystems.length > 0 && (
                <Tooltip title="Auto-assign all systems evenly across zones">
                  <Button
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleAutoAssign}
                  >
                    Auto-Assign
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {unassignedSystems.length === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              All systems have been assigned to zones.
            </Alert>
          ) : filteredUnassignedSystems.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              All {CATEGORY_FILTERS.find(f => f.key === categoryFilter)?.label.toLowerCase()} assigned.
            </Alert>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {filteredUnassignedSystems.map((system) => {
                const isSelected = selectedIds.has(system.id);
                return (
                  <Box
                    key={system.id}
                    onClick={(e) => handleRowClick(system.id, e)}
                    sx={{
                      py: 0.75,
                      px: 1,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: isSelected ? 'action.selected' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                    }}
                  >
                    <Box 
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
                    >
                      <Typography variant="body2">
                        {system.name} <Typography component="span" variant="body2" color="text.secondary">- {system.hullPoints} HP{system.arcs && system.arcs.length > 0 ? ` [${formatArcsShort(system.arcs)}]` : ''}</Typography>
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {effectiveZones.map((zone) => {
                        const wouldExceed = zone.totalHullPoints + system.hullPoints > zone.maxHullPoints;
                        const isArcCompatible = system.category !== 'weapon' || !system.arcs || system.arcs.length === 0 ||
                          canWeaponBeInZone(system.arcs, zone.code);
                        return (
                          <Tooltip
                            key={zone.code}
                            title={`${ZONE_NAMES[zone.code]} (${zone.totalHullPoints}/${zone.maxHullPoints} HP)${wouldExceed ? ' - Would exceed limit!' : ''}${!isArcCompatible ? ' - Arc mismatch' : ''}${isSelected && selectedIds.size > 1 ? ` - Assign ${selectedIds.size} selected` : ''}`}
                          >
                            <Button
                              size="small"
                              variant={isArcCompatible ? "outlined" : "text"}
                              color={wouldExceed ? "error" : isArcCompatible ? "primary" : "inherit"}
                              onClick={(e) => { e.stopPropagation(); handleAssignSystem(system.id, zone.code); }}
                              sx={{
                                minWidth: 36,
                                px: 1,
                                py: 0.25,
                                fontSize: '0.75rem',
                                opacity: !isArcCompatible ? 0.5 : 1,
                              }}
                            >
                              {zone.code}{isSelected && selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
                            </Button>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* Zones Panel - Vertical List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          {effectiveZones.map((zone) => (
            <Paper
              key={zone.code}
              sx={{
                p: 2,
                bgcolor: zone.totalHullPoints > zone.maxHullPoints
                  ? 'error.light'
                  : zone.systems.length === 0
                    ? 'rgba(237, 108, 2, 0.50)'  // Subtle orange for empty zones
                    : 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {zone.code} - {ZONE_NAMES[zone.code]}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`${zone.totalHullPoints} / ${zone.maxHullPoints} HP`}
                    size="small"
                    color={zone.totalHullPoints > zone.maxHullPoints ? 'error' : 'default'}
                    variant="outlined"
                  />
                  {zone.systems.length > 0 && (
                    <Tooltip title="Clear this zone">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleClearZone(zone.code)}
                      >
                        <ClearAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 1 }} />

              {zone.systems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No systems assigned to this zone.
                </Typography>
              ) : (
                <Table size="small">
                  <TableBody>
                    {zone.systems.map((sys, idx) => (
                      <TableRow key={sys.id}>
                        <TableCell sx={{ py: 0.5, border: 0, width: '100%' }}>
                          <Typography variant="body2">{sys.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sys.hullPoints} HP • {sys.systemType}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.5, border: 0, whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveSystemUp(zone.code, sys.id)}
                            disabled={idx === 0}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveSystemDown(zone.code, sys.id)}
                            disabled={idx === zone.systems.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFromZone(zone.code, sys.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
