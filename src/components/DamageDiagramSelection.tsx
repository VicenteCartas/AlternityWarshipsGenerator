import { useMemo, useCallback } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  getZoneConfigForHull,
  getZoneLimitForHull,
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
        name: `${wpn.weaponType.name} (${wpn.mountType}, ${wpn.quantity}x)`,
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
      const category = hm.type.id.includes('hangar') || hm.type.id.includes('cargo') 
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

  // Get zone configuration for this hull
  const zoneConfig = useMemo(() => getZoneConfigForHull(hull), [hull]);
  const zoneLimit = useMemo(() => getZoneLimitForHull(hull.id), [hull]);

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

  const handleAssignSystem = useCallback(
    (systemId: string, zoneCode: ZoneCode) => {
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
    [unassignedSystems, effectiveZones, onZonesChange]
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`${zoneConfig.zoneCount} Zones`}
            variant="outlined"
            color="primary"
          />
          <Chip
            label={`${zoneLimit} HP/Zone Limit`}
            variant="outlined"
            color="default"
          />
          <Chip
            label={`${stats.totalSystemsAssigned}/${totalSystemsCount} Systems Assigned`}
            variant="outlined"
            color={stats.unassignedSystems === 0 ? 'success' : 'warning'}
            icon={stats.unassignedSystems === 0 ? <CheckCircleIcon /> : <WarningIcon />}
          />
          {stats.zonesOverLimit > 0 && (
            <Chip
              label={`${stats.zonesOverLimit} Zone(s) Over Limit`}
              variant="outlined"
              color="error"
              icon={<WarningIcon />}
            />
          )}
          {stats.totalSystemsAssigned > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={handleClearAllZones}
            >
              Clear All Zones
            </Button>
          )}
        </Box>
      </Box>

      {/* Main content: side by side layout */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Unassigned Systems Panel */}
        <Paper sx={{ width: 500, p: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Unassigned Systems ({unassignedSystems.length})
            </Typography>
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

          {unassignedSystems.length === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              All systems have been assigned to zones.
            </Alert>
          ) : (
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              {unassignedSystems.map((system) => (
                <Box
                  key={system.id}
                  sx={{
                    py: 1,
                    px: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box>
                      <Typography variant="body2">{system.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {system.hullPoints} HP • {system.category}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {effectiveZones.map((zone) => {
                      const wouldExceed = zone.totalHullPoints + system.hullPoints > zone.maxHullPoints;
                      const isArcCompatible = system.category !== 'weapon' || !system.arcs || system.arcs.length === 0 ||
                        canWeaponBeInZone(system.arcs, zone.code);
                      return (
                        <Tooltip
                          key={zone.code}
                          title={`${ZONE_NAMES[zone.code]} (${zone.totalHullPoints}/${zone.maxHullPoints} HP)${wouldExceed ? ' - Would exceed limit!' : ''}${!isArcCompatible ? ' - Arc mismatch' : ''}`}
                        >
                          <Button
                            size="small"
                            variant={isArcCompatible ? "outlined" : "text"}
                            color={wouldExceed ? "error" : isArcCompatible ? "primary" : "inherit"}
                            onClick={() => handleAssignSystem(system.id, zone.code)}
                            sx={{
                              minWidth: 36,
                              px: 1,
                              py: 0.25,
                              fontSize: '0.75rem',
                              opacity: !isArcCompatible ? 0.5 : 1,
                            }}
                          >
                            {zone.code}
                          </Button>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Zones Panel - Vertical List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {effectiveZones.map((zone) => (
            <Paper
              key={zone.code}
              sx={{
                p: 2,
                bgcolor: zone.totalHullPoints > zone.maxHullPoints
                  ? 'error.light'
                  : zone.systems.length === 0
                    ? 'warning.light'
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
                  No systems assigned - drag systems here or use the dropdown
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
