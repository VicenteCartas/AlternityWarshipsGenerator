import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import type { Hull } from '../../types/hull';
import type { ArmorType, ArmorWeight } from '../../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../../types/supportSystem';
import type { InstalledWeapon } from '../../types/weapon';
import type { InstalledDefenseSystem } from '../../types/defense';
import type { InstalledCommandControlSystem } from '../../types/commandControl';
import type { InstalledSensor } from '../../types/sensor';
import type { InstalledHangarMiscSystem } from '../../types/hangarMisc';
import type { InstalledLaunchSystem } from '../../types/ordnance';
import { formatCost } from '../../services/formatters';
import { getLaunchSystemsData } from '../../services/dataLoader';

interface SystemsTabStats {
  totalHP: number;
  usedHP: number;
  remainingHP: number;
  powerGenerated: number;
  powerConsumed: number;
  powerBalance: number;
  totalCost: number;
  armor: { hp: number; cost: number };
  powerPlants: { hp: number; power: number; cost: number };
  engines: { hp: number; power: number; cost: number };
  ftl: { hp: number; power: number; cost: number } | null;
  support: { hp: number; power: number; cost: number };
  weapons: { hp: number; power: number; cost: number };
  defenses: { hp: number; power: number; cost: number };
  commandControl: { hp: number; power: number; cost: number };
  sensors: { hp: number; power: number; cost: number };
  hangarMisc: { hp: number; power: number; cost: number };
}

interface SystemsTabProps {
  hull: Hull;
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
  installedDefenses: InstalledDefenseSystem[];
  installedCommandControl: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedHangarMisc: InstalledHangarMiscSystem[];
  stats: SystemsTabStats;
}

export type { SystemsTabStats };

export function SystemsTab({
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
  installedDefenses,
  installedCommandControl,
  installedSensors,
  installedHangarMisc,
  stats,
}: SystemsTabProps) {
  return (
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
              {installedFTLFuelTanks.map((ft) => (
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
  );
}
