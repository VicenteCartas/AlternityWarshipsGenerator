import { useState, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
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
  Divider,
  Card,
  CardMedia,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { TabPanel } from './shared';
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
import { calculateTotalPowerPlantStats } from '../services/powerPlantService';
import { calculateTotalEngineStats } from '../services/engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } from '../services/ftlDriveService';
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
}: SummarySelectionProps) {
  const [tabValue, setTabValue] = useState(0);
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
    const defenseStats = calculateDefenseStats(installedDefenses, hull.hullPoints);
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
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    
    if (!hull) {
      issues.push({ type: 'error', message: 'No hull selected' });
      return issues;
    }

    if (stats) {
      if (stats.remainingHP < 0) {
        issues.push({ type: 'error', message: `Hull points exceeded by ${Math.abs(stats.remainingHP)} HP` });
      }
      if (installedPowerPlants.length === 0) {
        issues.push({ type: 'warning', message: 'No power plants installed' });
      }
      if (installedEngines.length === 0) {
        issues.push({ type: 'warning', message: 'No engines installed' });
      }
      if (installedCommandControl.length === 0) {
        issues.push({ type: 'warning', message: 'No command & control systems installed' });
      }
      if (installedSensors.length === 0) {
        issues.push({ type: 'warning', message: 'No sensors installed' });
      }
    }

    // Check damage diagram
    const zoneLimit = getZoneLimitForHull(hull.id);
    const unassignedCount = damageDiagramZones.length === 0 ? 'all' : 
      damageDiagramZones.every(z => z.systems.length === 0) ? 'all' : null;
    if (unassignedCount === 'all') {
      issues.push({ type: 'warning', message: 'No systems assigned to damage diagram' });
    } else {
      // Check for zones over limit
      for (const zone of damageDiagramZones) {
        if (zone.totalHullPoints > zone.maxHullPoints) {
          issues.push({ type: 'warning', message: `Zone ${zone.code} exceeds HP limit (${zone.totalHullPoints}/${zoneLimit})` });
          break; // Only show one zone warning
        }
      }
    }

    return issues;
  }, [hull, stats, installedPowerPlants, installedEngines, installedCommandControl, installedSensors, damageDiagramZones]);

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

  const handleExportPDF = async () => {
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
      
      await exportShipToPDF({
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
        installedDefenses,
        installedCommandControl,
        installedSensors,
        installedHangarMisc,
        damageDiagramZones,
        targetDirectory,
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Validation alerts */}
      {validationIssues.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {validationIssues.map((issue, index) => (
            <Alert 
              key={index} 
              severity={issue.type} 
              icon={issue.type === 'error' ? <WarningIcon /> : undefined}
            >
              {issue.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Tabs and Export Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="summary tabs">
          <Tab label="Description" id="summary-tab-0" aria-controls="summary-tabpanel-0" />
          <Tab label="Systems" id="summary-tab-1" aria-controls="summary-tabpanel-1" />
          <Tab label="Fire Diagram" id="summary-tab-2" aria-controls="summary-tabpanel-2" />
          <Tab label="Damage Zones" id="summary-tab-3" aria-controls="summary-tabpanel-3" />
        </Tabs>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPDF}
          sx={{ mr: 1 }}
        >
          Export PDF
        </Button>
      </Box>

      {/* Description Tab */}
      <TabPanel value={tabValue} index={0}>
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
      <TabPanel value={tabValue} index={1}>
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
                    {installedPowerPlants.map((pp, idx) => (
                      <TableRow key={pp.id}>
                        <TableCell sx={{ width: '40%' }}>{pp.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{pp.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>+{pp.hullPoints * pp.type.powerPerHullPoint} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(pp.type.baseCost + pp.hullPoints * pp.type.costPerHullPoint)}</TableCell>
                      </TableRow>
                    ))}
                    {installedFuelTanks.map((ft, idx) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank ({ft.forPowerPlantType.name})</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(ft.hullPoints * 1000)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.powerPlants.hp} HP</TableCell>
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
                    {installedEngines.map((eng, idx) => (
                      <TableRow key={eng.id}>
                        <TableCell sx={{ width: '40%' }}>{eng.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{eng.hullPoints} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>-{eng.hullPoints * eng.type.powerPerHullPoint} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(eng.type.baseCost + eng.hullPoints * eng.type.costPerHullPoint)}</TableCell>
                      </TableRow>
                    ))}
                    {installedEngineFuelTanks.map((ft, idx) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank ({ft.forEngineType.name})</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(ft.hullPoints * 1000)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.engines.hp} HP</TableCell>
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
                    {installedFTLFuelTanks.map((ft, idx) => (
                      <TableRow key={ft.id}>
                        <TableCell sx={{ pl: 4 }}>↳ Fuel Tank</TableCell>
                        <TableCell align="right">{ft.hullPoints} HP</TableCell>
                        <TableCell align="right">—</TableCell>
                        <TableCell align="right">{formatCost(ft.hullPoints * 1000)}</TableCell>
                      </TableRow>
                    ))}
                    {(installedFTLFuelTanks.length > 0) && (
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stats.ftl.hp} HP</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>-{stats.ftl.power} PP</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCost(stats.ftl.cost)}</TableCell>
                      </TableRow>
                    )}
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
                    {installedWeapons.map((w, idx) => (
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
                    {installedDefenses.map((d, idx) => (
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
                    {installedSensors.map((s, idx) => (
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
                    {installedCommandControl.map((cc, idx) => (
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
                    {installedLifeSupport.map((ls, idx) => (
                      <TableRow key={ls.id}>
                        <TableCell sx={{ width: '40%' }}>{ls.quantity}x {ls.type.name}</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{ls.type.hullPoints * ls.quantity} HP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{ls.type.powerRequired * ls.quantity === 0 ? '0' : `-${ls.type.powerRequired * ls.quantity}`} PP</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>{formatCost(ls.type.cost * ls.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedAccommodations.map((acc, idx) => (
                      <TableRow key={acc.id}>
                        <TableCell>{acc.quantity}x {acc.type.name}</TableCell>
                        <TableCell align="right">{acc.type.hullPoints * acc.quantity} HP</TableCell>
                        <TableCell align="right">{acc.type.powerRequired * acc.quantity === 0 ? '0' : `-${acc.type.powerRequired * acc.quantity}`} PP</TableCell>
                        <TableCell align="right">{formatCost(acc.type.cost * acc.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedStoreSystems.map((ss, idx) => (
                      <TableRow key={ss.id}>
                        <TableCell>{ss.quantity}x {ss.type.name}</TableCell>
                        <TableCell align="right">{ss.type.hullPoints * ss.quantity} HP</TableCell>
                        <TableCell align="right">{ss.type.powerRequired * ss.quantity === 0 ? '0' : `-${ss.type.powerRequired * ss.quantity}`} PP</TableCell>
                        <TableCell align="right">{formatCost(ss.type.cost * ss.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    {installedGravitySystems.map((gs, idx) => (
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
                    {installedHangarMisc.map((hm, idx) => (
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
      <TabPanel value={tabValue} index={2}>
        <FireDiagram weapons={installedWeapons} warshipName={warshipName} hullName={hull.name} />
      </TabPanel>

      {/* Damage Zones Tab */}
      <TabPanel value={tabValue} index={3}>
        <DamageZonesOverview zones={damageDiagramZones} hull={hull} warshipName={warshipName} selectedArmorWeight={selectedArmorWeight} selectedArmorType={selectedArmorType} />
      </TabPanel>
    </Box>
  );
}

// Sub-component for damage zones overview
interface DamageZonesOverviewProps {
  zones: DamageZone[];
  hull: Hull;
  warshipName: string;
  selectedArmorWeight: ArmorWeight | null;
  selectedArmorType: ArmorType | null;
}

function DamageZonesOverview({ zones, hull, warshipName, selectedArmorWeight, selectedArmorType }: DamageZonesOverviewProps) {
  const zoneLimit = getZoneLimitForHull(hull.id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Ship Defense Stats */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Ship Defense
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`Toughness: ${hull.toughness}`} size="small" variant="outlined" />
          <Chip label={`Damage Track: S:${hull.damageTrack.stun} W:${hull.damageTrack.wound} M:${hull.damageTrack.mortal} C:${hull.damageTrack.critical}`} size="small" variant="outlined" />
          {selectedArmorWeight && selectedArmorType && (
            <>
              <Chip label={`Armor: ${selectedArmorWeight.charAt(0).toUpperCase() + selectedArmorWeight.slice(1)} ${selectedArmorType.name}`} size="small" variant="outlined" color="primary" />
              <Chip label={`LI: ${selectedArmorType.protectionLI}`} size="small" variant="outlined" />
              <Chip label={`HI: ${selectedArmorType.protectionHI}`} size="small" variant="outlined" />
              <Chip label={`En: ${selectedArmorType.protectionEn}`} size="small" variant="outlined" />
            </>
          )}
          {!selectedArmorWeight && (
            <Chip label="No Armor" size="small" variant="outlined" color="warning" />
          )}
        </Box>
      </Paper>
      
      {zones.length === 0 ? (
        <Alert severity="info">
          No damage zones configured. Go to the Zones step to assign systems to zones.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            The {warshipName || hull.name} has {zones.length} damage zones. Each zone can hold up to {zoneLimit} HP worth of systems.
            When a ship takes damage, systems in the hit zone are damaged from surface (weapons/defenses) to core (command/power).
          </Typography>
      
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {zones.map((zone) => {
              const isOverLimit = zone.totalHullPoints > zone.maxHullPoints;
              const isEmpty = zone.systems.length === 0;
          
              return (
                <Paper 
                  key={zone.code} 
                  sx={{ 
                    p: 2, 
                    width: 300,
                    height: 250,
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: isOverLimit ? 'error.main' : isEmpty ? 'grey.400' : 'success.main',
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Zone {zone.code}
                    </Typography>
                    <Chip 
                      label={`${zone.totalHullPoints}/${zone.maxHullPoints}`} 
                      size="small"
                      color={isOverLimit ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {zone.systems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No systems assigned
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {zone.systems.map((sys, idx) => (
                          <Typography key={sys.id} variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {idx + 1}. {sys.name} ({sys.hullPoints} HP)
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}

// Sub-component for fire diagram
interface FireDiagramProps {
  weapons: InstalledWeapon[];
  warshipName: string;
  hullName: string;
}

// Arc angle definitions for SVG rendering
const ARC_ANGLES: Record<string, { start: number; end: number }> = {
  forward: { start: -135, end: -45 },
  starboard: { start: -45, end: 45 },
  aft: { start: 45, end: 135 },
  port: { start: 135, end: 225 },
  'zero-forward': { start: -135, end: -45 },
  'zero-starboard': { start: -45, end: 45 },
  'zero-aft': { start: 45, end: 135 },
  'zero-port': { start: 135, end: 225 },
};

// Generate SVG path for a pie sector
function createArcPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  const x1 = centerX + outerRadius * Math.cos(startAngleRad);
  const y1 = centerY + outerRadius * Math.sin(startAngleRad);
  const x2 = centerX + outerRadius * Math.cos(endAngleRad);
  const y2 = centerY + outerRadius * Math.sin(endAngleRad);
  const x3 = centerX + innerRadius * Math.cos(endAngleRad);
  const y3 = centerY + innerRadius * Math.sin(endAngleRad);
  const x4 = centerX + innerRadius * Math.cos(startAngleRad);
  const y4 = centerY + innerRadius * Math.sin(startAngleRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
}

function FireDiagram({ weapons, warshipName, hullName }: FireDiagramProps) {
  // Group weapons by their arcs
  const arcWeapons = useMemo(() => {
    const result: Record<string, { standard: InstalledWeapon[]; zero: InstalledWeapon[] }> = {
      forward: { standard: [], zero: [] },
      starboard: { standard: [], zero: [] },
      aft: { standard: [], zero: [] },
      port: { standard: [], zero: [] },
    };

    for (const weapon of weapons) {
      for (const arc of weapon.arcs) {
        if (arc.startsWith('zero-')) {
          const baseArc = arc.replace('zero-', '');
          if (result[baseArc]) {
            result[baseArc].zero.push(weapon);
          }
        } else {
          if (result[arc]) {
            result[arc].standard.push(weapon);
          }
        }
      }
    }

    return result;
  }, [weapons]);

  // Check if any zero-range arcs are used
  const hasZeroArcs = weapons.some(w => w.arcs.some(a => a.startsWith('zero-')));

  const size = 400;
  const center = size / 2;
  const outerRadius = 180;
  const innerRadius = hasZeroArcs ? 80 : 0;
  const zeroOuterRadius = 75;
  const zeroInnerRadius = 20;

  // Colors for arcs based on weapon count
  const getArcColor = (count: number): string => {
    if (count === 0) return '#e0e0e0'; // grey
    if (count <= 4) return '#90caf9'; // light blue (1-4)
    if (count <= 8) return '#42a5f5'; // blue (5-8)
    if (count <= 12) return '#1976d2'; // darker blue (9-12)
    return '#0d47a1'; // very dark blue for 13+
  };

  const getZeroArcColor = (count: number): string => {
    if (count === 0) return '#e0e0e0'; // grey
    if (count <= 2) return '#ffcc80'; // light orange (1-2)
    if (count <= 4) return '#ffa726'; // orange (3-4)
    if (count <= 6) return '#f57c00'; // darker orange (5-6)
    return '#e65100'; // very dark orange for 7+
  };

  const standardArcs: Array<{ key: string; label: string }> = [
    { key: 'forward', label: 'Forward' },
    { key: 'starboard', label: 'Starboard' },
    { key: 'aft', label: 'Aft' },
    { key: 'port', label: 'Port' },
  ];

  if (weapons.length === 0) {
    return (
      <Alert severity="info">
        No weapons installed. Add weapons to see the fire diagram.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Fire diagram for the {warshipName || hullName}. Standard arcs (blue) show weapons that can fire at range. 
        {hasZeroArcs && ' Zero-range arcs (orange) show weapons that can engage targets in the same hex (fighters, missiles, etc.).'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Fire Diagram SVG */}
        <Paper sx={{ p: 2 }}>
          <Box
            component="svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Standard arc sectors (outer ring) */}
            {standardArcs.map(({ key, label }) => {
              const angles = ARC_ANGLES[key];
              const weaponCount = arcWeapons[key].standard.reduce((sum, w) => sum + w.quantity, 0);
              const path = createArcPath(center, center, innerRadius, outerRadius, angles.start, angles.end);
              
              // Label position (middle of the sector)
              const midAngle = ((angles.start + angles.end) / 2) * Math.PI / 180;
              const labelRadius = (innerRadius + outerRadius) / 2;
              const labelX = center + labelRadius * Math.cos(midAngle);
              const labelY = center + labelRadius * Math.sin(midAngle);

              return (
                <g key={key}>
                  <path
                    d={path}
                    fill={getArcColor(weaponCount)}
                    stroke="#666"
                    strokeWidth={2}
                  />
                  <text
                    x={labelX}
                    y={labelY - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={weaponCount > 0 ? '#fff' : '#666'}
                    fontSize={14}
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={weaponCount > 0 ? '#fff' : '#666'}
                    fontSize={12}
                  >
                    {weaponCount} weapon{weaponCount !== 1 ? 's' : ''}
                  </text>
                </g>
              );
            })}

            {/* Zero arc sectors (inner ring) - only if zero arcs are used */}
            {hasZeroArcs && standardArcs.map(({ key }) => {
              const angles = ARC_ANGLES[key];
              const weaponCount = arcWeapons[key].zero.reduce((sum, w) => sum + w.quantity, 0);
              const path = createArcPath(center, center, zeroInnerRadius, zeroOuterRadius, angles.start, angles.end);
              
              // Label position for the zero arc count
              const midAngle = ((angles.start + angles.end) / 2) * Math.PI / 180;
              const labelRadius = (zeroInnerRadius + zeroOuterRadius) / 2;
              const labelX = center + labelRadius * Math.cos(midAngle);
              const labelY = center + labelRadius * Math.sin(midAngle);

              return (
                <g key={`zero-${key}`}>
                  <path
                    d={path}
                    fill={getZeroArcColor(weaponCount)}
                    stroke="#666"
                    strokeWidth={1}
                  />
                  {weaponCount > 0 && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={14}
                      fontWeight="bold"
                    >
                      {weaponCount}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Ship icon in center */}
            <polygon
              points={`${center},${center - 15} ${center - 8},${center + 10} ${center + 8},${center + 10}`}
              fill="#333"
              stroke="#000"
              strokeWidth={1}
            />
          </Box>
        </Paper>

        {/* Weapons list by arc - 2x2 grid */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Weapons by Arc
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: 1 }}>
            {/* Row 1: Forward and Port, Row 2: Aft and Starboard */}
            {[['forward', 'port'], ['aft', 'starboard']].flat().map((key, index) => {
              // Reorder: forward (0), port (1), aft (2), starboard (3)
              const orderedKeys = ['forward', 'port', 'aft', 'starboard'];
              const actualKey = orderedKeys[index];
              const label = actualKey.charAt(0).toUpperCase() + actualKey.slice(1);
              const standardWeapons = arcWeapons[actualKey].standard;
              const zeroWeapons = arcWeapons[actualKey].zero;
              const hasWeapons = standardWeapons.length > 0 || zeroWeapons.length > 0;

              return (
                <Paper key={actualKey} sx={{ p: 1.5, bgcolor: hasWeapons ? 'background.paper' : 'action.disabledBackground' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {label}
                  </Typography>
                  {!hasWeapons ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                      No weapons
                    </Typography>
                  ) : (
                    <>
                      {standardWeapons.length > 0 && (
                        <Box sx={{ mb: zeroWeapons.length > 0 ? 1 : 0 }}>
                          {standardWeapons.map((w, idx) => (
                            <Typography key={`${w.id}-std-${idx}`} variant="body2" sx={{ fontSize: '0.85rem', pl: 1 }}>
                              • {w.quantity}x {w.gunConfiguration.charAt(0).toUpperCase() + w.gunConfiguration.slice(1)} {w.weaponType.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {zeroWeapons.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Zero-range:</Typography>
                          {zeroWeapons.map((w, idx) => (
                            <Typography key={`${w.id}-zero-${idx}`} variant="body2" sx={{ fontSize: '0.85rem', pl: 1 }}>
                              • {w.quantity}x {w.gunConfiguration.charAt(0).toUpperCase() + w.gunConfiguration.slice(1)} {w.weaponType.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          Standard arcs (range):
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#e0e0e0', border: '1px solid #666' }} />
          <Typography variant="caption">0</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#90caf9', border: '1px solid #666' }} />
          <Typography variant="caption">1</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#42a5f5', border: '1px solid #666' }} />
          <Typography variant="caption">2</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2', border: '1px solid #666' }} />
          <Typography variant="caption">3</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#0d47a1', border: '1px solid #666' }} />
          <Typography variant="caption">4+</Typography>
        </Box>
        {hasZeroArcs && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Zero-range:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#ffcc80', border: '1px solid #666' }} />
              <Typography variant="caption">1</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#ffa726', border: '1px solid #666' }} />
              <Typography variant="caption">2</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#f57c00', border: '1px solid #666' }} />
              <Typography variant="caption">3+</Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
