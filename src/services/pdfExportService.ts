import { jsPDF } from 'jspdf';
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
import type { InstalledLaunchSystem } from '../types/ordnance';
import type { DamageZone } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';

interface ShipData {
  warshipName: string;
  hull: Hull;
  shipDescription: ShipDescription;
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
  damageDiagramZones: DamageZone[];
  targetDirectory?: string; // Directory to save the PDF (from current file path or Documents)
}

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function exportShipToPDF(data: ShipData): Promise<void> {
  const {
    warshipName,
    hull,
    selectedArmorWeight,
    selectedArmorType,
    installedWeapons,
    installedLaunchSystems,
    installedDefenses,
    installedCommandControl,
    installedSensors,
    damageDiagramZones,
  } = data;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ============ HELPER FUNCTIONS ============
  const addSectionTitle = (text: string) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(50, 50, 50);
    pdf.rect(margin, y - 4, contentWidth, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(text.toUpperCase(), margin + 2, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;
  };

  const addLabel = (label: string, value: string, x: number) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', x, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, x + pdf.getTextWidth(label + ': '), y);
  };

  const drawDamageTrackBoxes = (label: string, count: number, x: number, maxWidth: number) => {
    const boxSize = 4;
    const boxGap = 1;
    const labelY = y;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, x, labelY);
    
    const labelWidth = pdf.getTextWidth(label) + 2;
    const startX = x + labelWidth;
    
    // Calculate how many boxes fit per row
    const boxTotalWidth = boxSize + boxGap;
    const availableWidth = maxWidth - labelWidth - 5;
    const boxesPerRow = Math.floor(availableWidth / boxTotalWidth);
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / boxesPerRow);
      const col = i % boxesPerRow;
      const boxX = startX + col * boxTotalWidth;
      const boxY = labelY - 3 + row * (boxSize + boxGap);
      pdf.rect(boxX, boxY, boxSize, boxSize);
    }
    
    // Return how many rows were used
    return Math.ceil(count / boxesPerRow);
  };

  const checkNewPage = (needed: number = 20) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ============ SHIP NAME HEADER ============
  const shipName = warshipName || hull.name;
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(shipName, pageWidth / 2, y + 4, { align: 'center' });
  y += 9;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${capitalize(hull.shipClass)} Class – ${hull.name}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // ============ DEFENSES SECTION ============
  addSectionTitle('Defenses');
  y += 3;

  // Row 1: Toughness and Armor Type
  const col1 = margin;
  const col2 = margin + contentWidth / 3;
  
  addLabel('Toughness', hull.toughness.toString(), col1);
  
  if (selectedArmorWeight && selectedArmorType) {
    addLabel('Armor', `${capitalize(selectedArmorWeight)} ${selectedArmorType.name}`, col2);
  } else {
    addLabel('Armor', 'None', col2);
  }
  y += 5;

  // Row 2: Armor Protection values
  if (selectedArmorWeight && selectedArmorType) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Protection – LI: ${selectedArmorType.protectionLI}  |  HI: ${selectedArmorType.protectionHI}  |  En: ${selectedArmorType.protectionEn}`, col1, y);
    y += 5;
  }

  // Damage Track with fillable checkboxes
  y += 2;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DAMAGE TRACK', margin, y);
  y += 5;

  const trackWidth = contentWidth / 2 - 5;
  
  // Draw damage tracks in 2x2 grid layout
  const stunRows = drawDamageTrackBoxes(`Stun (${hull.damageTrack.stun})`, hull.damageTrack.stun, col1, trackWidth);
  const woundRows = drawDamageTrackBoxes(`Wound (${hull.damageTrack.wound})`, hull.damageTrack.wound, col1 + trackWidth + 10, trackWidth);
  y += Math.max(stunRows, woundRows) * 5 + 3;
  
  const mortalRows = drawDamageTrackBoxes(`Mortal (${hull.damageTrack.mortal})`, hull.damageTrack.mortal, col1, trackWidth);
  const critRows = drawDamageTrackBoxes(`Critical (${hull.damageTrack.critical})`, hull.damageTrack.critical, col1 + trackWidth + 10, trackWidth);
  y += Math.max(mortalRows, critRows) * 5 + 5;

  // ============ DEFENSES (active defenses like shields, ECM) ============
  if (installedDefenses.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ACTIVE DEFENSES', margin, y);
    y += 4;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    for (const d of installedDefenses) {
      pdf.text(`• ${d.quantity}x ${d.type.name}`, margin + 2, y);
      if (d.type.effect) {
        pdf.text(`(${d.type.effect})`, margin + 60, y);
      }
      y += 3.5;
    }
    y += 3;
  }

  // ============ DAMAGE ZONES ============
  if (damageDiagramZones.length > 0) {
    checkNewPage(45);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DAMAGE ZONES', margin, y);
    y += 4;

    const numZones = damageDiagramZones.length;
    const zonesPerRow = Math.min(numZones, 6);
    const zoneWidth = (contentWidth - (zonesPerRow - 1) * 2) / zonesPerRow;
    const zoneHeight = 28;
    
    for (let i = 0; i < numZones; i++) {
      const zone = damageDiagramZones[i];
      const row = Math.floor(i / 6);
      const col = i % 6;
      const zoneX = margin + col * (zoneWidth + 2);
      const zoneY = y + row * (zoneHeight + 3);
      
      // Zone box with header
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.4);
      pdf.rect(zoneX, zoneY, zoneWidth, zoneHeight);
      
      // Zone header bar
      pdf.setFillColor(180, 180, 180);
      pdf.rect(zoneX, zoneY, zoneWidth, 5, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${zone.code}`, zoneX + 2, zoneY + 3.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${zone.totalHullPoints}/${zone.maxHullPoints}`, zoneX + zoneWidth - 2, zoneY + 3.5, { align: 'right' });
      
      // Zone systems (abbreviated list)
      pdf.setFontSize(5.5);
      let sysY = zoneY + 8;
      const maxSystems = 4;
      for (let j = 0; j < Math.min(zone.systems.length, maxSystems); j++) {
        const sys = zone.systems[j];
        const maxNameLen = Math.floor(zoneWidth / 1.8);
        const shortName = sys.name.length > maxNameLen ? sys.name.substring(0, maxNameLen - 2) + '..' : sys.name;
        pdf.text(`${j + 1}. ${shortName}`, zoneX + 1, sysY);
        sysY += 4;
      }
      if (zone.systems.length > maxSystems) {
        pdf.setFont('helvetica', 'italic');
        pdf.text(`+${zone.systems.length - maxSystems} more`, zoneX + 1, sysY);
      }
    }
    
    const zoneRows = Math.ceil(numZones / 6);
    y += zoneRows * (zoneHeight + 3) + 5;
  }

  // ============ COMBAT SECTION ============
  checkNewPage(50);
  addSectionTitle('Combat');
  y += 3;

  // ---- SENSORS ----
  if (installedSensors.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SENSORS', margin, y);
    y += 4;

    // Find linked sensor controls
    const sensorControls = installedCommandControl.filter(cc => 
      cc.type.category === 'computer' && cc.linkedSensorId
    );

    // Sensors table header
    const sensorCols = [margin, margin + 42, margin + 68, margin + 90, margin + 110, margin + 130, margin + 155];
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sensor', sensorCols[0], y);
    pdf.text('Range S/M/L', sensorCols[1], y);
    pdf.text('Arcs', sensorCols[2], y);
    pdf.text('Tracking', sensorCols[3], y);
    pdf.text('Accuracy', sensorCols[4], y);
    pdf.text('Control', sensorCols[5], y);
    pdf.text('Qty', sensorCols[6], y);
    y += 1;
    pdf.setDrawColor(100);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;

    pdf.setFont('helvetica', 'normal');
    for (const sensor of installedSensors) {
      const st = sensor.type;
      const rangeText = st.rangeSpecial || `${st.rangeShort}/${st.rangeMedium}/${st.rangeLong}`;
      
      // Find linked sensor control
      const linkedSC = sensorControls.find(sc => sc.linkedSensorId === sensor.id);
      const scText = linkedSC ? (linkedSC.type.stepBonus ? `+${linkedSC.type.stepBonus}` : 'Yes') : '-';
      
      pdf.text(st.name.substring(0, 22), sensorCols[0], y);
      pdf.text(rangeText.substring(0, 14), sensorCols[1], y);
      pdf.text(st.arcsCovered.toString(), sensorCols[2], y);
      pdf.text(st.trackingCapability.toString(), sensorCols[3], y);
      pdf.text(st.accuracyDescription.substring(0, 10), sensorCols[4], y);
      pdf.text(scText, sensorCols[5], y);
      pdf.text(sensor.quantity.toString(), sensorCols[6], y);
      y += 4;
      checkNewPage(15);
    }
    y += 4;
  }

  // ---- WEAPONS ----
  if (installedWeapons.length > 0 || installedLaunchSystems.length > 0) {
    checkNewPage(35);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('WEAPONS', margin, y);
    y += 4;

    // Find linked fire controls for weapons
    const fireControls = installedCommandControl.filter(cc => 
      cc.type.category === 'computer' && cc.linkedWeaponBatteryKey
    );

    // Weapons table header
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    const weaponCols = [margin, margin + 48, margin + 76, margin + 94, margin + 118, margin + 138, margin + 156, margin + 170];
    pdf.text('Weapon', weaponCols[0], y);
    pdf.text('Range S/M/L', weaponCols[1], y);
    pdf.text('Type/FP', weaponCols[2], y);
    pdf.text('Damage', weaponCols[3], y);
    pdf.text('Accuracy', weaponCols[4], y);
    pdf.text('Arcs', weaponCols[5], y);
    pdf.text('FC', weaponCols[6], y);
    pdf.text('Qty', weaponCols[7], y);
    y += 1;
    pdf.setDrawColor(100);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;

    pdf.setFont('helvetica', 'normal');
    for (const weapon of installedWeapons) {
      const wt = weapon.weaponType;
      const rangeText = `${wt.rangeShort}/${wt.rangeMedium}/${wt.rangeLong}`;
      const typeText = `${wt.damageType}/${wt.firepower}`;
      const arcsText = weapon.arcs.map(a => {
        if (a.startsWith('zero-')) {
          return 'Z' + a.replace('zero-', '').charAt(0).toUpperCase();
        }
        return a.charAt(0).toUpperCase();
      }).join('');
      
      // Find linked fire control
      const batteryKey = `${wt.id}:${weapon.mountType}`;
      const linkedFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === batteryKey);
      const fcText = linkedFC ? (linkedFC.type.stepBonus ? `+${linkedFC.type.stepBonus}` : 'Yes') : '-';
      
      // Weapon name with config
      const weaponName = `${capitalize(weapon.gunConfiguration)} ${wt.name}`;
      const accText = wt.accuracyModifier >= 0 ? `+${wt.accuracyModifier}` : wt.accuracyModifier.toString();
      
      pdf.text(weaponName.substring(0, 26), weaponCols[0], y);
      pdf.text(rangeText, weaponCols[1], y);
      pdf.text(typeText, weaponCols[2], y);
      pdf.text(wt.damage.substring(0, 12), weaponCols[3], y);
      pdf.text(accText, weaponCols[4], y);
      pdf.text(arcsText, weaponCols[5], y);
      pdf.text(fcText, weaponCols[6], y);
      pdf.text(weapon.quantity.toString(), weaponCols[7], y);
      y += 4;
      checkNewPage(15);
    }

    // Launch systems
    for (const ls of installedLaunchSystems) {
      const lsName = capitalize(ls.launchSystemType.replace(/-/g, ' '));
      pdf.text(`${lsName}`, weaponCols[0], y);
      pdf.text('-', weaponCols[1], y);
      pdf.text('-', weaponCols[2], y);
      pdf.text('(ordnance)', weaponCols[3], y);
      pdf.text('-', weaponCols[4], y);
      pdf.text('-', weaponCols[5], y);
      pdf.text('-', weaponCols[6], y);
      pdf.text(ls.quantity.toString(), weaponCols[7], y);
      y += 4;
      checkNewPage(15);
    }
    y += 4;
  }

  // ---- FIRE ARCS DIAGRAM ----
  checkNewPage(70);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FIRE ARCS', margin, y);
  y += 4;

  // Group weapons by arc
  const arcWeapons: Record<string, number> = { forward: 0, starboard: 0, aft: 0, port: 0 };
  const zeroArcWeapons: Record<string, number> = { forward: 0, starboard: 0, aft: 0, port: 0 };
  
  for (const weapon of installedWeapons) {
    for (const arc of weapon.arcs) {
      if (arc.startsWith('zero-')) {
        const baseArc = arc.replace('zero-', '');
        if (baseArc in zeroArcWeapons) {
          zeroArcWeapons[baseArc] += weapon.quantity;
        }
      } else {
        if (arc in arcWeapons) {
          arcWeapons[arc] += weapon.quantity;
        }
      }
    }
  }

  // Draw fire arc diagram
  const diagramSize = 50;
  const diagramCenterX = margin + diagramSize / 2 + 8;
  const diagramCenterY = y + diagramSize / 2;
  const arcRadius = diagramSize / 2 - 3;

  // Draw circle
  pdf.setDrawColor(60);
  pdf.setLineWidth(0.4);
  pdf.circle(diagramCenterX, diagramCenterY, arcRadius);

  // Draw arc dividers and labels
  const drawArcSector = (startAngle: number, label: string, count: number, zeroCount: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + 90) * Math.PI) / 180;
    const midRad = ((startAngle + 45) * Math.PI) / 180;
    
    // Draw sector lines
    const x1 = diagramCenterX + arcRadius * Math.cos(startRad);
    const y1 = diagramCenterY + arcRadius * Math.sin(startRad);
    const x2 = diagramCenterX + arcRadius * Math.cos(endRad);
    const y2 = diagramCenterY + arcRadius * Math.sin(endRad);
    
    pdf.line(diagramCenterX, diagramCenterY, x1, y1);
    pdf.line(diagramCenterX, diagramCenterY, x2, y2);
    
    // Label position
    const labelRadius = arcRadius * 0.6;
    const labelX = diagramCenterX + labelRadius * Math.cos(midRad);
    const labelY = diagramCenterY + labelRadius * Math.sin(midRad);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, labelX, labelY - 1, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    if (count > 0 || zeroCount > 0) {
      pdf.text(`${count}`, labelX, labelY + 3, { align: 'center' });
      if (zeroCount > 0) {
        pdf.setFontSize(5);
        pdf.text(`(Z:${zeroCount})`, labelX, labelY + 6, { align: 'center' });
      }
    }
  };

  // Forward at top (-135 to -45 degrees)
  drawArcSector(-135, 'FWD', arcWeapons.forward, zeroArcWeapons.forward);
  drawArcSector(-45, 'STBD', arcWeapons.starboard, zeroArcWeapons.starboard);
  drawArcSector(45, 'AFT', arcWeapons.aft, zeroArcWeapons.aft);
  drawArcSector(135, 'PORT', arcWeapons.port, zeroArcWeapons.port);

  // Ship triangle indicator
  pdf.setFillColor(50, 50, 50);
  const triSize = 3;
  pdf.triangle(
    diagramCenterX, diagramCenterY - triSize,
    diagramCenterX - triSize * 0.7, diagramCenterY + triSize * 0.5,
    diagramCenterX + triSize * 0.7, diagramCenterY + triSize * 0.5,
    'F'
  );

  // Legend next to diagram
  const legendX = diagramCenterX + diagramSize / 2 + 12;
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text('# = standard range weapons', legendX, diagramCenterY - 8);
  pdf.text('(Z:#) = zero-range weapons', legendX, diagramCenterY - 3);
  pdf.text('FWD = Forward', legendX, diagramCenterY + 4);
  pdf.text('AFT = Aft', legendX, diagramCenterY + 9);
  pdf.text('STBD = Starboard', legendX, diagramCenterY + 14);
  pdf.text('PORT = Port', legendX, diagramCenterY + 19);

  y = diagramCenterY + diagramSize / 2 + 8;

  // ============ NOTES SECTION ============
  checkNewPage(30);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NOTES', margin, y);
  y += 4;
  
  // Draw lined area for player notes
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.15);
  const notesLines = 8;
  for (let i = 0; i < notesLines; i++) {
    pdf.line(margin, y + i * 5, pageWidth - margin, y + i * 5);
  }

  // ============ FOOTER ============
  const footerY = pageHeight - 6;
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(128);
  pdf.text('Alternity Warship Generator', margin, footerY);
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin, footerY, { align: 'right' });

  // Save the PDF
  const filename = `${shipName.replace(/[^a-zA-Z0-9]/g, '_')}_ship_sheet.pdf`;
  
  // If we have Electron API and a target directory, save to that directory
  if (window.electronAPI && data.targetDirectory) {
    // Use path separator based on platform (Windows uses backslash)
    const separator = data.targetDirectory.includes('\\') ? '\\' : '/';
    const fullPath = `${data.targetDirectory}${separator}${filename}`;
    
    // Get PDF as base64
    const base64Data = pdf.output('datauristring').split(',')[1];
    
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save PDF');
    }
  } else {
    // Fallback to browser download
    pdf.save(filename);
  }
}