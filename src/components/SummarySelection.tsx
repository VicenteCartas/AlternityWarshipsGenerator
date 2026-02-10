import { useState, useRef, useMemo, useCallback } from 'react';
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
import { TabPanel } from './shared';
import { FireDiagram, DamageZonesOverview } from './summary';
import { PdfExportDialog, type PdfExportOptions } from './PdfExportDialog';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { OrdnanceDesign, InstalledLaunchSystem } from '../types/ordnance';
import type { DamageZone } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import type { ProgressLevel } from '../types/common';
import { calculateArmorHullPoints, calculateArmorCost } from '../services/armorService';
import { calculateTotalPowerPlantStats, calculateFuelTankCost } from '../services/powerPlantService';
import { calculateTotalEngineStats, calculateEngineFuelTankCost } from '../services/engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats, calculateFTLFuelTankCost } from '../services/ftlDriveService';
import { calculateSupportSystemsStats } from '../services/supportSystemService';
import { calculateWeaponStats } from '../services/weaponService';
import { calculateOrdnanceStats } from '../services/ordnanceService';
import { calculateDefenseStats } from '../services/defenseService';
import { calculateCommandControlStats } from '../services/commandControlService';
import { calculateSensorStats } from '../services/sensorService';
import { calculateHangarMiscStats } from '../services/hangarMiscService';
import { formatCost } from '../services/formatters';
import { getLaunchSystemsData } from '../services/dataLoader';
import { getZoneLimitForHull } from '../services/damageDiagramService';
import { exportShipToPDF } from '../services/pdfExportService';


interface SummarySelectionProps {
  hull: Hull | null;
  warshipName: string;
  shipDescription: ShipDescription;
  onShipDescriptionChange: (description: ShipDescription) => void;
  selectedArmorWeight: ArmorWeight | null;
  selectedArmorType: ArmorType | null;
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
  damageDiagramZones: DamageZone[];
  designProgressLevel: ProgressLevel;
  currentFilePath: string | null;
  onShowNotification: (message: string, severity: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
}

export function SummarySelection({
  hull,
  warshipName,
  shipDescription,
  onShipDescriptionChange,
  selectedArmorWeight,
  selectedArmorType,
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
  currentFilePath,
  onShowNotification,
}: SummarySelectionProps) {
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
      alert('Image file is too large. Maximum size is 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
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
  }, [shipDescription, onShipDescriptionChange]);

  const handleRemoveImage = () => {
    onShipDescriptionChange({
      ...shipDescription,
      imageData: null,
      imageMimeType: null,
    });
  };

  // Calculate all stats
  const stats = useMemo(() => {
    if (!hull) {
      return null;
    }

    const totalHP = hull.hullPoints + hull.bonusHullPoints;
    
    const armorHP = selectedArmorWeight ? calculateArmorHullPoints(hull, selectedArmorWeight) : 0;
    const armorCost = selectedArmorWeight && selectedArmorType 
      ? calculateArmorCost(hull, selectedArmorWeight, selectedArmorType) 
      : 0;

    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    const engineStats = calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, hull);
    const ftlStats = installedFTLDrive ? calculateTotalFTLStats(installedFTLDrive, hull) : null;
    const ftlFuelStats = calculateTotalFTLFuelTankStats(installedFTLFuelTanks);
    const supportStats = calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, []);
    const weaponStats = calculateWeaponStats(installedWeapons);
    const ordnanceStats = calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns);
    const defenseStats = calculateDefenseStats(installedDefenses);
    const ccStats = calculateCommandControlStats(installedCommandControl, hull.hullPoints);
    const sensorStats = calculateSensorStats(installedSensors);
    const hangarMiscStats = calculateHangarMiscStats(installedHangarMisc);

    // Total HP used
    const usedHP = armorHP + 
      powerPlantStats.totalHullPoints + 
      engineStats.totalHullPoints + 
      (ftlStats?.totalHullPoints || 0) + 
      ftlFuelStats.totalHullPoints +
      supportStats.totalHullPoints + 
      weaponStats.totalHullPoints + 
      ordnanceStats.totalLauncherHullPoints +
      defenseStats.totalHullPoints + 
      ccStats.totalHullPoints + 
      sensorStats.totalHullPoints + 
      hangarMiscStats.totalHullPoints;

    // Total power consumed
    const totalPowerConsumed = engineStats.totalPowerRequired + 
      (ftlStats?.totalPowerRequired || 0) + 
      supportStats.totalPowerRequired + 
      weaponStats.totalPowerRequired + 
      ordnanceStats.totalLauncherPower +
      defenseStats.totalPowerRequired + 
      ccStats.totalPowerRequired + 
      sensorStats.totalPowerRequired + 
      hangarMiscStats.totalPowerRequired;

    // Total cost
    const totalCost = hull.cost + 
      armorCost + 
      powerPlantStats.totalCost + 
      engineStats.totalCost + 
      (ftlStats?.totalCost || 0) + 
      ftlFuelStats.totalCost +
      supportStats.totalCost + 
      weaponStats.totalCost + 
      ordnanceStats.totalLauncherCost +
      defenseStats.totalCost + 
      ccStats.totalCost + 
      sensorStats.totalCost + 
      hangarMiscStats.totalCost;

    // Acceleration (single value, units depend on engine PL)
    const totalAcceleration = engineStats.totalAcceleration;

    return {
      totalHP,
      usedHP,
      remainingHP: totalHP - usedHP,
      powerGenerated: powerPlantStats.totalPowerGenerated,
      powerConsumed: totalPowerConsumed,
      powerBalance: powerPlantStats.totalPowerGenerated - totalPowerConsumed,
      totalCost,
      totalAcceleration,
      armor: { hp: armorHP, cost: armorCost },
      powerPlants: { hp: powerPlantStats.totalHullPoints, power: powerPlantStats.totalPowerGenerated, cost: powerPlantStats.totalCost },
      engines: { hp: engineStats.totalHullPoints, power: engineStats.totalPowerRequired, cost: engineStats.totalCost },
      ftl: ftlStats ? { hp: ftlStats.totalHullPoints + ftlFuelStats.totalHullPoints, power: ftlStats.totalPowerRequired, cost: ftlStats.totalCost + ftlFuelStats.totalCost } : null,
      support: { hp: supportStats.totalHullPoints, power: supportStats.totalPowerRequired, cost: supportStats.totalCost },
      weapons: { hp: weaponStats.totalHullPoints + ordnanceStats.totalLauncherHullPoints, power: weaponStats.totalPowerRequired + ordnanceStats.totalLauncherPower, cost: weaponStats.totalCost + ordnanceStats.totalLauncherCost },
      defenses: { hp: defenseStats.totalHullPoints, power: defenseStats.totalPowerRequired, cost: defenseStats.totalCost },
      commandControl: { hp: ccStats.totalHullPoints, power: ccStats.totalPowerRequired, cost: ccStats.totalCost },
      sensors: { hp: sensorStats.totalHullPoints, power: sensorStats.totalPowerRequired, cost: sensorStats.totalCost },
      hangarMisc: { hp: hangarMiscStats.totalHullPoints, power: hangarMiscStats.totalPowerRequired, cost: hangarMiscStats.totalCost },
    };
  }, [
    hull,
    selectedArmorWeight,
    selectedArmorType,
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
  ]);

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
      if (installedPowerPlants.length === 0) {
        missingMandatory.push('Power Plant');
      }
      if (installedEngines.length === 0) {
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
      if (!selectedArmorWeight) {
        missingOptional.push('Armor');
      }
      if (!installedFTLDrive) {
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
      const supportStats = calculateSupportSystemsStats(
        installedLifeSupport, 
        installedAccommodations, 
        installedStoreSystems, 
        installedGravitySystems, 
        designProgressLevel, 
        []
      );
      
      // Calculate hangar/misc stats for evacuation capacity
      const hangarMiscStats = calculateHangarMiscStats(installedHangarMisc);
      
      // Calculate sensor stats for active sensors check
      const sensorStats = calculateSensorStats(installedSensors);

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

    // Check damage diagram
    const zoneLimit = getZoneLimitForHull(hull.id);
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

    return { errors, warnings };
  }, [
    hull, 
    stats, 
    selectedArmorWeight,
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
    damageDiagramZones,
    designProgressLevel,
  ]);

  // Check if there are any issues
  const hasIssues = validationIssues.errors.length > 0 || validationIssues.warnings.length > 0;

  if (!hull) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Please select a hull first to view the ship summary.
        </Alert>
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
        selectedArmorWeight,
        selectedArmorType,
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
        targetDirectory,
      }, options);
      const filename = `${warshipName.replace(/[^a-zA-Z0-9]/g, '_')}_ship_sheet.pdf`;
      
      // Create action to open the PDF file
      const openAction = window.electronAPI ? {
        label: 'Open',
        onClick: async () => {
          try {
            await window.electronAPI!.openPath(pdfPath);
          } catch (e) {
            console.error('Failed to open PDF:', e);
          }
        }
      } : undefined;
      
      onShowNotification(`PDF exported: ${filename}`, 'success', openAction);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      onShowNotification(`Failed to export PDF: ${error}`, 'error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Tabs and Export Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="summary tabs">
          {hasIssues && (
            <Tab 
              label={`Issues (${validationIssues.errors.length + validationIssues.warnings.length})`} 
              id="summary-tab-issues" 
              aria-controls="summary-tabpanel-issues"
              sx={{ color: validationIssues.errors.length > 0 ? 'error.main' : 'warning.main' }}
            />
          )}
          <Tab label="Description" id="summary-tab-0" aria-controls="summary-tabpanel-0" />
          <Tab label="Systems" id="summary-tab-1" aria-controls="summary-tabpanel-1" />
          <Tab label="Fire Diagram" id="summary-tab-2" aria-controls="summary-tabpanel-2" />
          <Tab label="Damage Zones" id="summary-tab-3" aria-controls="summary-tabpanel-3" />
        </Tabs>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => setExportDialogOpen(true)}
          sx={{ mr: 1 }}
        >
          Export PDF
        </Button>
      </Box>

      {/* PDF Export Dialog */}
      <PdfExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExportPDF}
      />

      {/* Issues Tab - only shown when there are issues */}
      {hasIssues && (
        <TabPanel value={tabValue} index={0}>
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
        </TabPanel>
      )}

      {/* Description Tab */}
      <TabPanel value={tabValue} index={hasIssues ? 1 : 0}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Image upload section */}
          <Box sx={{ minWidth: 300, maxWidth: 400 }}>
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

          {/* Lore/Description section */}
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Ship Lore & Description
            </Typography>
            <TextField
              multiline
              rows={12}
              fullWidth
              placeholder="Write the history, purpose, and background of your warship..."
              value={shipDescription.lore}
              onChange={handleLoreChange}
              variant="outlined"
            />
          </Box>
        </Box>
      </TabPanel>

      {/* Systems Tab */}
      <TabPanel value={tabValue} index={hasIssues ? 2 : 1}>
        {stats && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  {selectedArmorWeight && selectedArmorType && (
                    <TableRow>
                      <TableCell>{selectedArmorWeight.charAt(0).toUpperCase() + selectedArmorWeight.slice(1)} {selectedArmorType.name} Armor</TableCell>
                      <TableCell align="right">{stats.armor.hp} HP</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right">{formatCost(stats.armor.cost)}</TableCell>
                    </TableRow>
                  )}
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
                        <TableCell align="right" sx={{ width: '20%' }}>-{eng.hullPoints * eng.type.powerPerHullPoint} PP</TableCell>
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
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>-{stats.engines.power} PP</TableCell>
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
                    {installedWeapons.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell sx={{ width: '40%' }}>
                          {w.quantity}x {w.gunConfiguration} {w.weaponType.name} ({w.mountType}{w.concealed ? ', concealed' : ''}) [{w.arcs.join(', ')}]
                        </TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{w.hullPoints * w.quantity} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{w.powerRequired * w.quantity === 0 ? '0' : `-${w.powerRequired * w.quantity}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(w.cost * w.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedLaunchSystems.map((ls) => {
                      const launchSystemData = getLaunchSystemsData().find(l => l.id === ls.launchSystemType);
                      return (
                        <TableRow key={ls.id}>
                          <TableCell>
                            {ls.quantity}x {launchSystemData?.name || ls.launchSystemType}
                          </TableCell>
                          <TableCell align="right">{ls.hullPoints * ls.quantity} HP</TableCell>
                          <TableCell align="right">{ls.powerRequired * ls.quantity === 0 ? '0' : `-${ls.powerRequired * ls.quantity}`} PP</TableCell>
                          <TableCell align="right">{formatCost(ls.cost * ls.quantity)}</TableCell>
                        </TableRow>
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
                      <TableRow key={hm.id}>
                        <TableCell sx={{ width: '40%' }}>{hm.quantity}x {hm.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{hm.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{hm.powerRequired === 0 ? '0' : `-${hm.powerRequired}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(hm.cost)}</TableCell>
                      </TableRow>
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
            <TabPanel value={tabValue} index={hasIssues ? 3 : 2}>
        <FireDiagram weapons={installedWeapons} warshipName={warshipName} hullName={hull.name} />
      </TabPanel>

      {/* Damage Zones Tab */}
            <TabPanel value={tabValue} index={hasIssues ? 4 : 3}>
        <DamageZonesOverview zones={damageDiagramZones} hull={hull} warshipName={warshipName} selectedArmorWeight={selectedArmorWeight} selectedArmorType={selectedArmorType} />
      </TabPanel>
    </Box>
  );
}
