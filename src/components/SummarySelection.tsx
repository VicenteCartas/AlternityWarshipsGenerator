import { useState, useRef, useMemo, useCallback, Fragment } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert,
  Chip,
  Card,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TabPanel } from './shared';
import { FireDiagram, DamageZonesOverview } from './summary';
import { PdfExportDialog, type PdfExportOptions } from './PdfExportDialog';
import { BudgetChart } from './shared/BudgetChart';
import type { ShipDescription } from '../types/summary';
import { calculateFuelTankCost } from '../services/powerPlantService';
import { calculateEngineFuelTankCost, isEnginePowerGenerationAllowed } from '../services/engineService';
import { calculateFTLFuelTankCost } from '../services/ftlDriveService';
import { getAllLoadedCraft } from '../services/embarkedCraftService';
import { computeDesignSnapshot } from '../services/designSnapshotService';
import { formatCost } from '../services/formatters';
import { getLaunchSystemsData, getWarheadsData } from '../services/dataLoader';
import { getZoneLimitForHull } from '../services/damageDiagramService';
import { getWeaponBatteries, getWeaponBatteryDisplayName, batteryHasFireControl, getOrphanedFireControls, getOrphanedSensorControls, sensorHasSensorControl } from '../services/commandControlService';
import { exportShipToPDF } from '../services/pdfExportService';
import { logger } from '../services/utilities';
import type { WarshipState } from '../types/warshipState';


interface SummarySelectionProps {
  state: WarshipState;
  onShipDescriptionChange: (description: ShipDescription) => void;
  currentFilePath: string | null;
  onShowNotification: (message: string, severity: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
}

export function SummarySelection({
  state,
  onShipDescriptionChange,
  currentFilePath,
  onShowNotification,
}: SummarySelectionProps) {
  // Destructure state into local aliases matching the old prop names
  const {
    hull,
    name: warshipName,
    shipDescription,
    armorLayers,
    powerPlants: installedPowerPlants,
    fuelTanks: installedFuelTanks,
    engines: installedEngines,
    engineFuelTanks: installedEngineFuelTanks,
    ftlDrive: installedFTLDrive,
    ftlFuelTanks: installedFTLFuelTanks,
    lifeSupport: installedLifeSupport,
    accommodations: installedAccommodations,
    storeSystems: installedStoreSystems,
    gravitySystems: installedGravitySystems,
    weapons: installedWeapons,
    launchSystems: installedLaunchSystems,
    ordnanceDesigns,
    defenses: installedDefenses,
    commandControl: installedCommandControl,
    sensors: installedSensors,
    hangarMisc: installedHangarMisc,
    damageDiagramZones,
    designProgressLevel,
    designTechTracks,
    designType,
    stationType,
  } = state;
  const [tabValue, setTabValue] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onShipDescriptionChange({
      ...shipDescription,
      lore: event.target.value,
    });
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onShowNotification('Image file is too large. Maximum size is 5MB.', 'warning');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      onShowNotification('Please select an image file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 data (remove the data:image/xxx;base64, prefix for storage)
      const base64Data = result.split(',')[1];
      onShipDescriptionChange({
        ...shipDescription,
        imageData: base64Data,
        imageMimeType: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [shipDescription, onShipDescriptionChange, onShowNotification]);

  const handleRemoveImage = () => {
    onShipDescriptionChange({
      ...shipDescription,
      imageData: null,
      imageMimeType: null,
    });
  };

  // Calculate all stats via single authoritative snapshot
  const stats = useMemo(() => {
    if (!hull) {
      return null;
    }

    const snapshot = computeDesignSnapshot({
      hull,
      armorLayers,
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
      ordnanceDesigns,
      installedLaunchSystems,
      installedDefenses,
      installedCommandControl,
      installedSensors,
      installedHangarMisc,
      designProgressLevel,
      designTechTracks,
    });

    const totalPowerConsumed = snapshot.powerBreakdown.engines
      + snapshot.powerBreakdown.ftlDrive
      + snapshot.powerBreakdown.supportSystems
      + snapshot.powerBreakdown.weapons
      + snapshot.powerBreakdown.defenses
      + snapshot.powerBreakdown.commandControl
      + snapshot.powerBreakdown.sensors
      + snapshot.powerBreakdown.hangarMisc;

    return {
      totalHP: snapshot.totalHP,
      usedHP: snapshot.usedHP,
      remainingHP: snapshot.remainingHP,
      powerGenerated: snapshot.powerGenerated,
      powerConsumed: totalPowerConsumed,
      powerBalance: snapshot.powerGenerated - totalPowerConsumed,
      totalCost: snapshot.totalCost,
      totalAcceleration: snapshot.totalAcceleration,
      armor: snapshot.armor,
      powerPlants: snapshot.powerPlants,
      engines: snapshot.engines,
      ftl: snapshot.ftl,
      support: snapshot.support,
      weapons: snapshot.weapons,
      defenses: snapshot.defenses,
      commandControl: snapshot.commandControl,
      sensors: snapshot.sensors,
      hangarMisc: snapshot.hangarMisc,
      embarkedCraft: { cost: snapshot.embarkedCraft.cost, count: getAllLoadedCraft(installedHangarMisc).length, invalidFiles: snapshot.embarkedCraft.invalidFileCount },
      // Expose full subsystem stats for validation
      supportStats: snapshot.supportStats,
      sensorStats: snapshot.sensorStats,
      hangarMiscStats: snapshot.hangarMiscStats,
    };
  }, [
    hull,
    armorLayers,
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
    designProgressLevel,
    designTechTracks,
  ]);

  /** Generate Markdown-formatted stats text for clipboard */
  const generateStatsMarkdown = useCallback((): string => {
    if (!hull || !stats) return '';
    const lines: string[] = [];
    lines.push(`## ${warshipName}`);
    lines.push('');

    // Metadata
    const meta: string[] = [];
    meta.push(`**Hull:** ${hull.name} (${hull.shipClass.charAt(0).toUpperCase() + hull.shipClass.slice(1)})`);
    if (shipDescription.faction) meta.push(`**Faction:** ${shipDescription.faction}`);
    if (shipDescription.classification) meta.push(`**Classification:** ${shipDescription.classification}`);
    if (shipDescription.role) meta.push(`**Role:** ${shipDescription.role}`);
    if (shipDescription.manufacturer) meta.push(`**Manufacturer:** ${shipDescription.manufacturer}`);
    if (shipDescription.commissioningDate) meta.push(`**Commissioned:** ${shipDescription.commissioningDate}`);
    lines.push(meta.join(' | '));
    lines.push('');

    // Overview stats
    lines.push(`| Stat | Value |`);
    lines.push(`|------|-------|`);
    lines.push(`| Hull Points | ${stats.usedHP} / ${stats.totalHP} |`);
    lines.push(`| Power | ${stats.powerConsumed} / ${stats.powerGenerated} |`);
    lines.push(`| Total Cost | ${formatCost(stats.totalCost)} |`);
    if (stats.totalAcceleration > 0) {
      lines.push(`| Acceleration | ${stats.totalAcceleration} |`);
    }
    lines.push('');

    // Systems breakdown
    lines.push('### Systems');
    lines.push('| System | HP | Power | Cost |');
    lines.push('|--------|---:|------:|-----:|');
    lines.push(`| Hull & Armor | ${stats.armor.hp} | — | ${formatCost(stats.armor.cost)} |`);
    lines.push(`| Power Plants | ${stats.powerPlants.hp} | +${stats.powerPlants.power} | ${formatCost(stats.powerPlants.cost)} |`);
    if (stats.engines.hp > 0) lines.push(`| Engines | ${stats.engines.hp} | -${stats.engines.power}${stats.engines.powerGen > 0 ? ` / +${stats.engines.powerGen}` : ''} | ${formatCost(stats.engines.cost)} |`);
    if (stats.ftl) lines.push(`| FTL Drive | ${stats.ftl.hp} | -${stats.ftl.power} | ${formatCost(stats.ftl.cost)} |`);
    if (stats.weapons.hp > 0) lines.push(`| Weapons | ${stats.weapons.hp} | -${stats.weapons.power} | ${formatCost(stats.weapons.cost)} |`);
    if (stats.defenses.hp > 0) lines.push(`| Defenses | ${stats.defenses.hp} | -${stats.defenses.power} | ${formatCost(stats.defenses.cost)} |`);
    if (stats.sensors.hp > 0) lines.push(`| Sensors | ${stats.sensors.hp} | -${stats.sensors.power} | ${formatCost(stats.sensors.cost)} |`);
    if (stats.commandControl.hp > 0) lines.push(`| Command & Control | ${stats.commandControl.hp} | -${stats.commandControl.power} | ${formatCost(stats.commandControl.cost)} |`);
    if (stats.support.hp > 0) lines.push(`| Support Systems | ${stats.support.hp} | -${stats.support.power} | ${formatCost(stats.support.cost)} |`);
    if (stats.hangarMisc.hp > 0) lines.push(`| Hangars & Misc | ${stats.hangarMisc.hp} | -${stats.hangarMisc.power} | ${formatCost(stats.hangarMisc.cost)} |`);
    if (stats.embarkedCraft.cost > 0) lines.push(`| Embarked Craft | — | — | ${formatCost(stats.embarkedCraft.cost)} |`);
    lines.push('');

    // Weapons list
    if (installedWeapons.length > 0 || installedLaunchSystems.length > 0) {
      lines.push('### Armament');
      for (const w of installedWeapons) {
        lines.push(`- ${w.quantity}x ${w.gunConfiguration} ${w.weaponType.name} (${w.mountType}${w.concealed ? ', concealed' : ''}) [${w.arcs.join(', ')}]`);
        const warheads = getWarheadsData() || [];
        for (const lo of w.magazineLoadout || []) {
          const wh = warheads.find(wh => wh.id === lo.designId);
          if (wh) lines.push(`  - ${lo.quantity * w.quantity}x ${wh.name}`);
        }
      }
      for (const ls of installedLaunchSystems) {
        const lsData = getLaunchSystemsData().find(l => l.id === ls.launchSystemType);
        lines.push(`- ${ls.quantity}x ${lsData?.name || ls.launchSystemType}`);
        for (const lo of ls.loadout || []) {
          const design = ordnanceDesigns.find(d => d.id === lo.designId);
          if (design) lines.push(`  - ${lo.quantity}x ${design.name}`);
        }
      }
      lines.push('');
    }

    // Defenses list
    if (installedDefenses.length > 0) {
      lines.push('### Defenses');
      for (const d of installedDefenses) {
        lines.push(`- ${d.quantity}x ${d.type.name}`);
      }
      lines.push('');
    }

    // Embarked Craft
    const allCraft = getAllLoadedCraft(installedHangarMisc);
    if (allCraft.length > 0) {
      lines.push('### Embarked Craft');
      for (const craft of allCraft) {
        lines.push(`- ${craft.quantity}x ${craft.name} (${craft.hullName}, ${craft.hullHp} HP) — ${craft.berthing} (${craft.systemName})`);
      }
      lines.push('');
    }

    // Magazine Ordnance
    const magazinesWithOrdnance = installedHangarMisc.filter(hm => (hm.ordnanceLoadout || []).length > 0);
    if (magazinesWithOrdnance.length > 0) {
      lines.push('### Magazine Ordnance');
      for (const mag of magazinesWithOrdnance) {
        lines.push(`- ${mag.quantity}x ${mag.type.name}`);
        for (const lo of mag.ordnanceLoadout || []) {
          const design = ordnanceDesigns.find(d => d.id === lo.designId);
          if (design) lines.push(`  - ${lo.quantity}x ${design.name}`);
        }
      }
      lines.push('');
    }

    // Lore
    if (shipDescription.lore.trim()) {
      lines.push('### Description');
      lines.push(shipDescription.lore);
    }

    return lines.join('\n');
  }, [hull, stats, warshipName, shipDescription, installedWeapons, installedLaunchSystems, ordnanceDesigns, installedDefenses, installedHangarMisc]);

  const handleCopyStats = useCallback(async () => {
    const md = generateStatsMarkdown();
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      onShowNotification('Stats copied to clipboard', 'success');
    } catch {
      onShowNotification('Failed to copy to clipboard', 'error');
    }
  }, [generateStatsMarkdown, onShowNotification]);

  const embarkedCraft = getAllLoadedCraft(installedHangarMisc);

  // Validation checks
  const validationIssues = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!hull) {
      errors.push('No hull selected');
      return { errors, warnings };
    }

    if (stats) {
      // ERROR: HP exceeded
      if (stats.remainingHP < 0) {
        errors.push(`Hull points exceeded by ${Math.abs(stats.remainingHP)} HP`);
      }

      // ERROR: Mandatory steps not completed
      const missingMandatory: string[] = [];
      if (installedPowerPlants.length === 0 && !isEnginePowerGenerationAllowed()) {
        missingMandatory.push('Power Plant');
      }
      // Engines are mandatory only for warships
      if (designType === 'warship' && installedEngines.length === 0) {
        missingMandatory.push('Engines');
      }
      if (missingMandatory.length > 0) {
        errors.push(`Mandatory steps not completed: ${missingMandatory.join(', ')}`);
      }

      // WARNING: Power consumption exceeds generation (excluding FTL)
      const powerConsumedWithoutFTL = stats.powerConsumed - (stats.ftl?.power || 0);
      if (powerConsumedWithoutFTL > stats.powerGenerated) {
        warnings.push(`Power consumption (${powerConsumedWithoutFTL}) exceeds generation (${stats.powerGenerated}) - excluding FTL`);
      }

      // WARNING: Optional steps not completed
      const missingOptional: string[] = [];
      if (armorLayers.length === 0) {
        missingOptional.push('Armor');
      }
      // Only warn about FTL if the design type supports it
      const hasFtlStep = designType === 'warship' || stationType === 'space-station';
      if (hasFtlStep && !installedFTLDrive) {
        missingOptional.push('FTL Drive');
      }
      if (installedLifeSupport.length === 0 && installedAccommodations.length === 0) {
        missingOptional.push('Support Systems');
      }
      if (installedWeapons.length === 0 && installedLaunchSystems.length === 0) {
        missingOptional.push('Weapons');
      }
      if (installedDefenses.length === 0) {
        missingOptional.push('Defenses');
      }
      if (installedCommandControl.length === 0) {
        missingOptional.push('Command & Control');
      }
      if (installedSensors.length === 0) {
        missingOptional.push('Sensors');
      }
      if (missingOptional.length > 0) {
        warnings.push(`Optional steps not completed: ${missingOptional.join(', ')}`);
      }

      // Calculate support stats for accommodation/life support warnings
      const { supportStats, hangarMiscStats, sensorStats } = stats;
      
      // Calculate sensor stats for active sensors check

      // WARNING: Crew without 100% accommodations
      if (hull.crew > 0 && supportStats.crewCapacity < hull.crew) {
        const percentage = Math.round((supportStats.crewCapacity / hull.crew) * 100);
        warnings.push(`Crew accommodations at ${percentage}% (${supportStats.crewCapacity}/${hull.crew} crew)`);
      }

      // WARNING: Hull without 100% life support coverage
      if (supportStats.totalCoverage < hull.hullPoints) {
        const percentage = Math.round((supportStats.totalCoverage / hull.hullPoints) * 100);
        warnings.push(`Life support coverage at ${percentage}% (${supportStats.totalCoverage}/${hull.hullPoints} HP)`);
      }

      // WARNING: Crew and troops without 100% escape systems
      const evacNeeded = hull.crew + supportStats.troopCapacity;
      if (evacNeeded > 0 && hangarMiscStats.totalEvacCapacity < evacNeeded) {
        const percentage = Math.round((hangarMiscStats.totalEvacCapacity / evacNeeded) * 100);
        warnings.push(`Evacuation capacity at ${percentage}% (${hangarMiscStats.totalEvacCapacity}/${evacNeeded} people)`);
      }

      // WARNING: Launchers without ordnance
      const launchersWithoutOrdnance = installedLaunchSystems.filter(
        ls => !ls.loadout || ls.loadout.length === 0
      ).length;
      if (launchersWithoutOrdnance > 0) {
        warnings.push(`${launchersWithoutOrdnance} launcher${launchersWithoutOrdnance !== 1 ? 's' : ''} without ordnance`);
      }

      // WARNING: No active sensors
      if (!sensorStats.hasBasicSensors) {
        warnings.push('No active sensors installed');
      }

      // WARNING: Power plants requiring fuel without fuel
      const powerPlantsNeedingFuel = installedPowerPlants.filter(pp => pp.type.requiresFuel);
      if (powerPlantsNeedingFuel.length > 0) {
        // Check if there's fuel for each power plant type that needs it
        const plantTypesNeedingFuel = [...new Set(powerPlantsNeedingFuel.map(pp => pp.type.id))];
        const fuelTanksByPlantType = new Set(installedFuelTanks.map(ft => ft.forPowerPlantType.id));
        const plantTypesWithoutFuel = plantTypesNeedingFuel.filter(typeId => !fuelTanksByPlantType.has(typeId));
        
        if (plantTypesWithoutFuel.length > 0) {
          const plantNames = plantTypesWithoutFuel.map(typeId => {
            const plant = powerPlantsNeedingFuel.find(pp => pp.type.id === typeId);
            return plant?.type.name || typeId;
          });
          warnings.push(`Power plant${plantNames.length > 1 ? 's' : ''} without fuel: ${plantNames.join(', ')}`);
        }
      }

      // WARNING: Engines requiring fuel without fuel
      const enginesNeedingFuel = installedEngines.filter(e => e.type.requiresFuel && !e.type.fuelOptional);
      if (enginesNeedingFuel.length > 0) {
        // Check if there's fuel for each engine type that needs it
        const engineTypesNeedingFuel = [...new Set(enginesNeedingFuel.map(e => e.type.id))];
        const fuelTanksByEngineType = new Set(installedEngineFuelTanks.map(ft => ft.forEngineType.id));
        const engineTypesWithoutFuel = engineTypesNeedingFuel.filter(typeId => !fuelTanksByEngineType.has(typeId));
        
        if (engineTypesWithoutFuel.length > 0) {
          const engineNames = engineTypesWithoutFuel.map(typeId => {
            const engine = enginesNeedingFuel.find(e => e.type.id === typeId);
            return engine?.type.name || typeId;
          });
          warnings.push(`Engine${engineNames.length > 1 ? 's' : ''} without fuel: ${engineNames.join(', ')}`);
        }
      }
    }

      // WARNING: Fire Control ↔ Weapon linking validation (D15)
      const batteries = getWeaponBatteries(installedWeapons, installedLaunchSystems);
      if (batteries.length > 0 && installedCommandControl.length > 0) {
        const batteriesWithoutFC = batteries.filter(b => !batteryHasFireControl(b.key, installedCommandControl));
        if (batteriesWithoutFC.length > 0) {
          const names = batteriesWithoutFC.map(b => getWeaponBatteryDisplayName(b.key, installedWeapons, installedLaunchSystems));
          warnings.push(`Weapon batter${batteriesWithoutFC.length === 1 ? 'y' : 'ies'} without fire control: ${names.join(', ')}`);
        }
        const orphanedFC = getOrphanedFireControls(installedCommandControl, installedWeapons, installedLaunchSystems);
        if (orphanedFC.length > 0) {
          warnings.push(`${orphanedFC.length} fire control${orphanedFC.length !== 1 ? 's' : ''} not linked to any weapon battery`);
        }
      }

      // WARNING: Sensor Control ↔ Sensor linking validation (D16)
      if (installedSensors.length > 0 && installedCommandControl.length > 0) {
        const sensorsWithoutControl = installedSensors.filter(s => !sensorHasSensorControl(s.id, installedCommandControl));
        if (sensorsWithoutControl.length > 0) {
          const names = sensorsWithoutControl.map(s => `${s.quantity}x ${s.type.name}`);
          warnings.push(`Sensor${sensorsWithoutControl.length === 1 ? '' : 's'} without sensor control: ${names.join(', ')}`);
        }
        const orphanedSC = getOrphanedSensorControls(installedCommandControl, installedSensors);
        if (orphanedSC.length > 0) {
          warnings.push(`${orphanedSC.length} sensor control${orphanedSC.length !== 1 ? 's' : ''} not linked to any sensor`);
        }
      }

    // Check damage diagram
    const zoneLimit = getZoneLimitForHull(hull.id, hull);
    const unassignedCount = damageDiagramZones.length === 0 ? 'all' : 
      damageDiagramZones.every(z => z.systems.length === 0) ? 'all' : null;
    if (unassignedCount === 'all') {
      warnings.push('No systems assigned to damage diagram');
    } else {
      // Check for zones over limit
      for (const zone of damageDiagramZones) {
        if (zone.totalHullPoints > zone.maxHullPoints) {
          warnings.push(`Zone ${zone.code} exceeds HP limit (${zone.totalHullPoints}/${zoneLimit})`);
          break; // Only show one zone warning
        }
      }
    }

    // WARNING: Embarked craft with missing files
    const invalidCraft = embarkedCraft.filter(c => !c.fileValid);
    if (invalidCraft.length > 0) {
      const names = invalidCraft.map(c => c.name);
      warnings.push(`Embarked craft file${invalidCraft.length !== 1 ? 's' : ''} not found: ${names.join(', ')}`);
    }

    return { errors, warnings };
  }, [
    hull, 
    stats, 
    armorLayers,
    installedPowerPlants,
    installedFuelTanks,
    installedEngines,
    installedEngineFuelTanks,
    installedFTLDrive,
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
    embarkedCraft,
    damageDiagramZones,
    designProgressLevel,
    designType,
    stationType,
  ]);

  // Check if there are any issues
  const hasIssues = validationIssues.errors.length > 0 || validationIssues.warnings.length > 0;

  if (!hull) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select a hull first to view the summary.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          The summary shows a complete overview of your design including:
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1 }}>
          <li><strong>Issues</strong> — Validation errors and warnings that need attention</li>
          <li><strong>Description</strong> — Ship image and lore text for your design</li>
          <li><strong>Systems</strong> — Complete breakdown of all installed systems with HP, power, and cost</li>
          <li><strong>Fire Diagram</strong> — Visual representation of weapon coverage by arc</li>
          <li><strong>Damage Zones</strong> — Overview of hull toughness, armor, and damage zone assignments</li>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Go to <strong>Step 1: Hull</strong> to begin your design.
        </Typography>
      </Box>
    );
  }

  const imageDataUrl = shipDescription.imageData && shipDescription.imageMimeType
    ? `data:${shipDescription.imageMimeType};base64,${shipDescription.imageData}`
    : null;

  const handleExportPDF = async (options: PdfExportOptions) => {
    if (!hull) return;
    
    try {
      // Determine target directory: use directory of current file, or Documents folder
      let targetDirectory: string | undefined;
      
      if (window.electronAPI) {
        if (currentFilePath) {
          // Extract directory from current file path
          const separator = currentFilePath.includes('\\') ? '\\' : '/';
          const lastSeparatorIndex = currentFilePath.lastIndexOf(separator);
          targetDirectory = currentFilePath.substring(0, lastSeparatorIndex);
        } else {
          // No current file, use Documents folder
          targetDirectory = await window.electronAPI.getDocumentsPath();
        }
      }
      
      const pdfPath = await exportShipToPDF({
        warshipName,
        hull,
        shipDescription,
        armorLayers,
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
        damageDiagramZones,
        designProgressLevel,
        designTechTracks,
        designType,
        stationType,
        targetDirectory,
      }, options);
      const sheetType = designType === 'station' ? 'station_sheet' : 'ship_sheet';
      const filename = `${warshipName.replace(/[^a-zA-Z0-9]/g, '_')}_${sheetType}.pdf`;
      
      showPdfNotification(pdfPath, filename);
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to export PDF:', error);
      onShowNotification(`Failed to export PDF: ${error}`, 'error');
    }
  };



  const showPdfNotification = (pdfPath: string, filename: string) => {
    const openAction = window.electronAPI ? {
      label: 'Open',
      onClick: async () => {
        try {
          await window.electronAPI!.openPath(pdfPath);
        } catch (e) {
          if (import.meta.env.DEV) logger.error('Failed to open PDF:', e);
        }
      }
    } : undefined;

    onShowNotification(`PDF exported: ${filename}`, 'success', openAction);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Step header and overview */}
      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            icon={stats?.remainingHP != null && stats.remainingHP < 0 ? <ErrorIcon /> : undefined}
            label={`HP: ${stats?.usedHP ?? 0} / ${stats?.totalHP ?? 0}`}
            size="small"
            variant="outlined"
            color={stats?.remainingHP != null && stats.remainingHP < 0 ? 'error' : 'default'}
          />
          <Chip
            icon={stats?.powerBalance != null && stats.powerBalance < 0 ? <ErrorIcon /> : stats?.powerBalance === 0 ? <WarningIcon /> : <CheckCircleIcon />}
            label={`Power: ${stats?.powerConsumed ?? 0} / ${stats?.powerGenerated ?? 0}`}
            size="small"
            variant="outlined"
            color={stats?.powerBalance != null && stats.powerBalance < 0 ? 'error' : stats?.powerBalance === 0 ? 'warning' : 'success'}
          />
          <Chip
            label={`Cost: ${formatCost(stats?.totalCost ?? 0)}`}
            size="small"
            variant="outlined"
          />
          {hasIssues && (
            <Chip
              icon={validationIssues.errors.length > 0 ? <ErrorIcon /> : <WarningIcon />}
              label={`${validationIssues.errors.length} error(s), ${validationIssues.warnings.length} warning(s)`}
              size="small"
              color={validationIssues.errors.length > 0 ? 'error' : 'warning'}
            />
          )}
          {!hasIssues && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Design valid"
              size="small"
              color="success"
            />
          )}
        </Box>
      </Box>

      {/* Tabs and Export Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="summary tabs">
          <Tab 
            label={hasIssues ? `Issues (${validationIssues.errors.length + validationIssues.warnings.length})` : 'Issues'}
            id="summary-tab-issues" 
            aria-controls="summary-tabpanel-issues"
            sx={hasIssues ? { color: validationIssues.errors.length > 0 ? 'error.main' : 'warning.main' } : undefined}
          />
          <Tab label="Description" id="summary-tab-0" aria-controls="summary-tabpanel-0" />
          <Tab label="Systems" id="summary-tab-1" aria-controls="summary-tabpanel-1" />
          <Tab label="Fire Diagram" id="summary-tab-2" aria-controls="summary-tabpanel-2" />
          <Tab label="Damage Zones" id="summary-tab-3" aria-controls="summary-tabpanel-3" />
        </Tabs>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyStats}
          >
            Copy Stats
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* PDF Export Dialog */}
      <PdfExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExportPDF}
      />

      {/* Issues Tab */}
      <TabPanel value={tabValue} index={0}>
        {hasIssues ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Errors Section */}
            {validationIssues.errors.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" color="error.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon /> Errors ({validationIssues.errors.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  These issues must be resolved before the ship design is valid.
                </Typography>
                <List dense>
                  {validationIssues.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Warnings Section */}
            {validationIssues.warnings.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" color="warning.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon /> Warnings ({validationIssues.warnings.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  These are recommendations that may affect ship functionality.
                </Typography>
                <List dense>
                  {validationIssues.warnings.map((warning, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={warning} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3, justifyContent: 'center' }}>
            <CheckCircleIcon color="success" />
            <Typography color="success.main">No issues found — design is valid!</Typography>
          </Box>
        )}
      </TabPanel>

      {/* Description Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top row: Metadata on the left, Image on the right */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Design Metadata */}
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Design Metadata
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Faction"
                  size="small"
                  fullWidth
                  placeholder="e.g., Galactic Concord"
                  value={shipDescription.faction}
                  onChange={(e) => onShipDescriptionChange({ ...shipDescription, faction: e.target.value })}
                />
                <TextField
                  label="Classification"
                  size="small"
                  fullWidth
                  placeholder="e.g., Destroyer, Frigate"
                  value={shipDescription.classification}
                  onChange={(e) => onShipDescriptionChange({ ...shipDescription, classification: e.target.value })}
                />
                <TextField
                  label="Role"
                  size="small"
                  fullWidth
                  placeholder="e.g., Patrol, Escort, Assault"
                  value={shipDescription.role}
                  onChange={(e) => onShipDescriptionChange({ ...shipDescription, role: e.target.value })}
                />
                <TextField
                  label="Manufacturer"
                  size="small"
                  fullWidth
                  placeholder="e.g., Starmech Collective"
                  value={shipDescription.manufacturer}
                  onChange={(e) => onShipDescriptionChange({ ...shipDescription, manufacturer: e.target.value })}
                />
                <TextField
                  label="Commissioning Date"
                  size="small"
                  fullWidth
                  placeholder="e.g., 2501, Year 12 GC"
                  value={shipDescription.commissioningDate}
                  onChange={(e) => onShipDescriptionChange({ ...shipDescription, commissioningDate: e.target.value })}
                />
              </Box>
            </Box>

            {/* Image upload section */}
            <Box sx={{ minWidth: 280, maxWidth: 360 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Ship Image
              </Typography>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              {imageDataUrl ? (
                <Box>
                  <Card variant="outlined">
                    <CardMedia
                      component="img"
                      image={imageDataUrl}
                      alt={warshipName}
                      sx={{ maxHeight: 300, objectFit: 'contain' }}
                    />
                  </Card>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddPhotoAlternateIcon />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ width: '100%', height: 150 }}
                >
                  Upload Image
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Max 5MB. JPG, PNG, or GIF.
              </Typography>
            </Box>
          </Box>

          {/* Bottom row: Lore/Description full width */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Lore & Description
            </Typography>
            <TextField
              multiline
              minRows={8}
              maxRows={20}
              fullWidth
              placeholder="Write the history, purpose, and background of your design..."
              value={shipDescription.lore}
              onChange={handleLoreChange}
              variant="outlined"
            />
          </Box>
        </Box>
      </TabPanel>

      {/* Systems Tab */}
      <TabPanel value={tabValue} index={2}>
        {stats && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Budget Charts */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Budget Overview
              </Typography>
              <BudgetChart stats={stats} hullCost={hull.cost} />
            </Paper>

            {/* Hull & Armor */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Hull & Armor
              </Typography>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ width: '40%' }}>{hull.name} ({hull.shipClass.charAt(0).toUpperCase() + hull.shipClass.slice(1)})</TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>{hull.hullPoints + hull.bonusHullPoints} HP</TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>—</TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>{formatCost(hull.cost)}</TableCell>
                  </TableRow>
                  {armorLayers.map((layer) => (
                    <TableRow key={layer.weight}>
                      <TableCell>{layer.weight.charAt(0).toUpperCase() + layer.weight.slice(1)} {layer.type.name} Armor</TableCell>
                      <TableCell align="right">{layer.hullPointsUsed} HP</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right">{formatCost(layer.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* Power Plants */}
            {installedPowerPlants.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Power Plants
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedPowerPlants.map((pp) => (
                      <TableRow key={pp.id}>
                        <TableCell sx={{ width: '40%' }}>{pp.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{pp.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>+{pp.hullPoints * pp.type.powerPerHullPoint} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(pp.type.baseCost + pp.hullPoints * pp.type.costPerHullPoint)}</TableCell>
                      </TableRow>
                    ))}
                    {installedFuelTanks.map((ft) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank ({ft.forPowerPlantType.name})</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(calculateFuelTankCost(ft.forPowerPlantType, ft.hullPoints))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell />
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>+{stats.powerPlants.power} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.powerPlants.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Engines */}
            {installedEngines.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Engines
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedEngines.map((eng) => (
                      <TableRow key={eng.id}>
                        <TableCell sx={{ width: '40%' }}>{eng.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{eng.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>
                          -{Math.ceil(eng.hullPoints * eng.type.powerPerHullPoint)} PP
                          {(eng.type.powerGeneratedPerHullPoint ?? 0) > 0 && ` / +${Math.ceil(eng.type.powerGeneratedPerHullPoint! * eng.hullPoints)} PP`}
                        </TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(eng.type.baseCost + eng.hullPoints * eng.type.costPerHullPoint)}</TableCell>
                      </TableRow>
                    ))}
                    {installedEngineFuelTanks.map((ft) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank ({ft.forEngineType.name})</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(calculateEngineFuelTankCost(ft.forEngineType, ft.hullPoints))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell />
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        -{stats.engines.power} PP
                        {stats.engines.powerGen > 0 && ` / +${stats.engines.powerGen} PP`}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.engines.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* FTL Drive */}
            {installedFTLDrive && stats.ftl && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  FTL Drive
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ width: '40%' }}>{installedFTLDrive.type.name}</TableCell>
                      <TableCell align="right" sx={{ width: '20%' }}>{installedFTLDrive.hullPoints} HP</TableCell>
                      <TableCell align="right" sx={{ width: '20%' }}>-{installedFTLDrive.type.powerPerHullPoint * installedFTLDrive.hullPoints} PP</TableCell>
                      <TableCell align="right" sx={{ width: '20%' }}>{formatCost(installedFTLDrive.type.baseCost + installedFTLDrive.hullPoints * installedFTLDrive.type.costPerHullPoint)}</TableCell>
                    </TableRow>
                    {installedFTLFuelTanks.map((ft) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(calculateFTLFuelTankCost(ft.forFTLDriveType, ft.hullPoints))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.ftl.hp} HP</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>-{stats.ftl.power} PP</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.ftl.cost)}</TableCell>
                      </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Weapons */}
            {(installedWeapons.length > 0 || installedLaunchSystems.length > 0) && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Weapons
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedWeapons.map((w) => {
                      const warheads = getWarheadsData() || [];
                      return (
                        <Fragment key={w.id}>
                          <TableRow>
                            <TableCell sx={{ width: '40%' }}>
                              {w.quantity}x {w.gunConfiguration} {w.weaponType.name} ({w.mountType}{w.concealed ? ', concealed' : ''}) [{w.arcs.join(', ')}]
                            </TableCell>
                            <TableCell align="right" sx={{ width: '20%' }}>{w.hullPoints * w.quantity} HP</TableCell>
                            <TableCell align="right" sx={{ width: '20%' }}>{w.powerRequired * w.quantity === 0 ? '0' : `-${w.powerRequired * w.quantity}`} PP</TableCell>
                            <TableCell align="right" sx={{ width: '20%' }}>{formatCost(w.cost * w.quantity)}</TableCell>
                          </TableRow>
                          {(w.magazineLoadout || []).map((lo) => {
                            const wh = warheads.find(wh => wh.id === lo.designId);
                            if (!wh) return null;
                            return (
                              <TableRow key={`${w.id}-wh-${lo.designId}`}>
                                <TableCell sx={{ pl: 4 }}>↳ {lo.quantity * w.quantity}x {wh.name}</TableCell>
                                <TableCell align="right">—</TableCell>
                                <TableCell align="right">—</TableCell>
                                <TableCell align="right">{formatCost(wh.cost * lo.quantity * w.quantity)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                    {installedLaunchSystems.map((ls) => {
                      const launchSystemData = getLaunchSystemsData().find(l => l.id === ls.launchSystemType);
                      return (
                        <Fragment key={ls.id}>
                          <TableRow>
                            <TableCell>
                              {ls.quantity}x {launchSystemData?.name || ls.launchSystemType}
                            </TableCell>
                            <TableCell align="right">{ls.hullPoints * ls.quantity} HP</TableCell>
                            <TableCell align="right">{ls.powerRequired * ls.quantity === 0 ? '0' : `-${ls.powerRequired * ls.quantity}`} PP</TableCell>
                            <TableCell align="right">{formatCost(ls.cost * ls.quantity)}</TableCell>
                          </TableRow>
                          {(ls.loadout || []).map((lo) => {
                            const design = ordnanceDesigns.find(d => d.id === lo.designId);
                            if (!design) return null;
                            return (
                              <TableRow key={`${ls.id}-ord-${lo.designId}`}>
                                <TableCell sx={{ pl: 4 }}>↳ {lo.quantity}x {design.name}</TableCell>
                                <TableCell align="right">—</TableCell>
                                <TableCell align="right">—</TableCell>
                                <TableCell align="right">{formatCost(design.totalCost * lo.quantity)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.weapons.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.weapons.power === 0 ? '0' : `-${stats.weapons.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.weapons.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Defenses */}
            {installedDefenses.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Defenses
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedDefenses.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell sx={{ width: '40%' }}>{d.quantity}x {d.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{d.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{d.powerRequired === 0 ? '0' : `-${d.powerRequired}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(d.cost)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.defenses.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.defenses.power === 0 ? '0' : `-${stats.defenses.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.defenses.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Sensors */}
            {installedSensors.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Sensors
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedSensors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell sx={{ width: '40%' }}>{s.quantity}x {s.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{s.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{s.powerRequired === 0 ? '0' : `-${s.powerRequired}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(s.cost)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.sensors.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.sensors.power === 0 ? '0' : `-${stats.sensors.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.sensors.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Command & Control */}
            {installedCommandControl.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Command & Control
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedCommandControl.map((cc) => (
                      <TableRow key={cc.id}>
                        <TableCell sx={{ width: '40%' }}>{cc.quantity}x {cc.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{cc.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{cc.powerRequired === 0 ? '0' : `-${cc.powerRequired}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(cc.cost)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.commandControl.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.commandControl.power === 0 ? '0' : `-${stats.commandControl.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.commandControl.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Support Systems */}
            {(installedLifeSupport.length > 0 || installedAccommodations.length > 0 || installedStoreSystems.length > 0 || installedGravitySystems.length > 0) && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Support Systems
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedLifeSupport.map((ls) => (
                      <TableRow key={ls.id}>
                        <TableCell sx={{ width: '40%' }}>{ls.quantity}x {ls.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{ls.type.hullPoints * ls.quantity} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{ls.type.powerRequired * ls.quantity === 0 ? '0' : `-${ls.type.powerRequired * ls.quantity}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(ls.type.cost * ls.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedAccommodations.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell>{acc.quantity}x {acc.type.name}</TableCell>
                        <TableCell align="right">{acc.type.hullPoints * acc.quantity} HP</TableCell>
                        <TableCell align="right">{acc.type.powerRequired * acc.quantity === 0 ? '0' : `-${acc.type.powerRequired * acc.quantity}`} PP</TableCell>
                        <TableCell align="right">{formatCost(acc.type.cost * acc.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedStoreSystems.map((ss) => (
                      <TableRow key={ss.id}>
                        <TableCell>{ss.quantity}x {ss.type.name}</TableCell>
                        <TableCell align="right">{ss.type.hullPoints * ss.quantity} HP</TableCell>
                        <TableCell align="right">{ss.type.powerRequired * ss.quantity === 0 ? '0' : `-${ss.type.powerRequired * ss.quantity}`} PP</TableCell>
                        <TableCell align="right">{formatCost(ss.type.cost * ss.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedGravitySystems.map((gs) => (
                      <TableRow key={gs.id}>
                        <TableCell>{gs.type.name}</TableCell>
                        <TableCell align="right">{gs.hullPoints} HP</TableCell>
                        <TableCell align="right">{gs.type.powerRequired === 0 ? '0' : `-${gs.type.powerRequired}`} PP</TableCell>
                        <TableCell align="right">{formatCost(gs.cost)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.support.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.support.power === 0 ? '0' : `-${stats.support.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.support.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Hangars & Misc */}
            {installedHangarMisc.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Hangars & Miscellaneous
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {installedHangarMisc.map((hm) => (
                      <Fragment key={hm.id}>
                        <TableRow>
                          <TableCell sx={{ width: '40%' }}>{hm.quantity}x {hm.type.name}</TableCell>
                          <TableCell align="right" sx={{ width: '20%' }}>{hm.hullPoints} HP</TableCell>
                          <TableCell align="right" sx={{ width: '20%' }}>{hm.powerRequired === 0 ? '0' : `-${hm.powerRequired}`} PP</TableCell>
                          <TableCell align="right" sx={{ width: '20%' }}>{formatCost(hm.cost)}</TableCell>
                        </TableRow>
                        {(hm.loadout || []).map((craft) => (
                          <TableRow key={craft.id}>
                            <TableCell sx={{ pl: 4 }}>↳ {craft.quantity}x {craft.name}{!craft.fileValid ? ' ⚠' : ''}</TableCell>
                            <TableCell align="right">—</TableCell>
                            <TableCell align="right">—</TableCell>
                            <TableCell align="right">{formatCost(craft.designCost * craft.quantity)}</TableCell>
                          </TableRow>
                        ))}
                        {(hm.ordnanceLoadout || []).map((lo) => {
                          const design = ordnanceDesigns.find(d => d.id === lo.designId);
                          if (!design) return null;
                          return (
                            <TableRow key={`${hm.id}-ord-${lo.designId}`}>
                              <TableCell sx={{ pl: 4 }}>↳ {lo.quantity}x {design.name}</TableCell>
                              <TableCell align="right">—</TableCell>
                              <TableCell align="right">—</TableCell>
                              <TableCell align="right">{formatCost(design.totalCost * lo.quantity)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.hangarMisc.hp} HP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.hangarMisc.power === 0 ? '0' : `-${stats.hangarMisc.power}`} PP</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.hangarMisc.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Embarked Craft */}
            {embarkedCraft.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Embarked Craft
                </Typography>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableBody>
                    {embarkedCraft.map((craft) => (
                      <TableRow key={craft.id}>
                        <TableCell sx={{ width: '40%' }}>
                          {craft.quantity}x {craft.name} ({craft.berthing})
                          {!craft.fileValid && ' ⚠'}
                        </TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{craft.hullHp * craft.quantity} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>—</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(craft.designCost * craft.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>—</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>—</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.embarkedCraft.cost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Totals */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Totals
              </Typography>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Hull Points</TableCell>
                    <TableCell 
                      align="right"
                      colSpan={3}
                      sx={{ color: stats.remainingHP >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {stats.usedHP} / {stats.totalHP}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Power</TableCell>
                    <TableCell 
                      align="right"
                      colSpan={3}
                      sx={{ color: stats.powerBalance >= 0 ? 'success.main' : 'warning.main' }}
                    >
                      {stats.powerConsumed} / {stats.powerGenerated}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Cost</TableCell>
                    <TableCell align="right" colSpan={3}>{formatCost(stats.totalCost)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </TabPanel>

      {/* Fire Diagram Tab */}
            <TabPanel value={tabValue} index={3}>
        <FireDiagram weapons={installedWeapons} warshipName={warshipName} hullName={hull.name} />
      </TabPanel>

      {/* Damage Zones Tab */}
            <TabPanel value={tabValue} index={4}>
        <DamageZonesOverview zones={damageDiagramZones} hull={hull} warshipName={warshipName} armorLayers={armorLayers} installedDefenses={installedDefenses} />
      </TabPanel>
    </Box>
  );
}
