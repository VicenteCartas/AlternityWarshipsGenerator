/**
 * Mod Editor Schemas
 *
 * Defines column definitions and section configurations for the mod editor.
 * Each section maps to an array within a JSON data file.
 */

import type { ModDataFileName } from '../types/mod';

/**
 * Column type determines the editor widget shown in cells.
 */
export type ColumnType = 'text' | 'number' | 'boolean' | 'select' | 'progressLevel' | 'techTracks' | 'multiselect' | 'json';

/**
 * A column definition for the editable data grid.
 */
export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  required?: boolean;
  min?: number;
  max?: number;
  width?: number;
  options?: { value: string; label: string }[];
  description?: string;
}

/**
 * An editor section represents one editable array within a data file.
 */
export interface EditorSection {
  id: string;
  label: string;
  fileName: ModDataFileName;
  rootKey: string;
  columns: ColumnDef[];
  defaultItem: Record<string, unknown>;
}

// ============== Shared column definitions ==============

const COL_ID: ColumnDef = { key: 'id', label: 'ID', type: 'text', required: true, width: 140 };
const COL_NAME: ColumnDef = { key: 'name', label: 'Name', type: 'text', required: true, width: 160 };
const COL_PL: ColumnDef = {
  key: 'progressLevel', label: 'PL', type: 'progressLevel', required: true, width: 70,
  options: [
    { value: '6', label: 'PL6' },
    { value: '7', label: 'PL7' },
    { value: '8', label: 'PL8' },
    { value: '9', label: 'PL9' },
  ],
};
const COL_TECH: ColumnDef = { key: 'techTracks', label: 'Tech', type: 'techTracks', width: 100 };
const COL_HP: ColumnDef = { key: 'hullPoints', label: 'HP', type: 'number', required: true, min: 0, width: 60 };
const COL_POWER: ColumnDef = { key: 'powerRequired', label: 'Power', type: 'number', min: 0, width: 70 };
const COL_COST: ColumnDef = { key: 'cost', label: 'Cost', type: 'number', required: true, min: 0, width: 90 };
const COL_DESC: ColumnDef = { key: 'description', label: 'Description', type: 'text', width: 200 };
const COL_COST_PER: ColumnDef = {
  key: 'costPer', label: 'Cost Per', type: 'select', width: 90,
  options: [
    { value: 'unit', label: 'Unit' },
    { value: 'systemHp', label: 'System HP' },
    { value: 'linkedHp', label: 'Linked HP' },
  ],
};
const COL_POWER_PER: ColumnDef = {
  key: 'powerPer', label: 'Power Per', type: 'select', width: 90,
  options: [
    { value: 'unit', label: 'Unit' },
    { value: 'systemHp', label: 'System HP' },
  ],
};

const SHIP_CLASS_OPTIONS = [
  { value: 'small-craft', label: 'Small Craft' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'super-heavy', label: 'Super-Heavy' },
];

const FIREPOWER_OPTIONS = [
  { value: 'Gd', label: 'Gd' },
  { value: 'S', label: 'S' },
  { value: 'L', label: 'L' },
  { value: 'M', label: 'M' },
  { value: 'H', label: 'H' },
  { value: 'SH', label: 'SH' },
];

// ============== Section Definitions ==============

export const EDITOR_SECTIONS: EditorSection[] = [
  // ---- Hulls ----
  {
    id: 'hulls',
    label: 'Hulls',
    fileName: 'hulls.json',
    rootKey: 'hulls',
    columns: [
      COL_ID, COL_NAME,
      { key: 'shipClass', label: 'Class', type: 'select', required: true, width: 110, options: SHIP_CLASS_OPTIONS },
      { key: 'category', label: 'Type', type: 'select', required: true, width: 80, options: [{ value: 'military', label: 'Military' }, { value: 'civilian', label: 'Civilian' }] },
      { key: 'hullPoints', label: 'HP', type: 'number', required: true, min: 1, width: 60 },
      { key: 'bonusHullPoints', label: 'Bonus HP', type: 'number', min: 0, width: 70 },
      { key: 'toughness', label: 'Toughness', type: 'select', width: 100, options: ['Good', 'Small Craft', 'Light', 'Medium', 'Heavy', 'Super-heavy'].map(v => ({ value: v, label: v })) },
      { key: 'targetModifier', label: 'Target Mod', type: 'number', width: 80 },
      { key: 'maneuverability', label: 'Maneuver', type: 'select', width: 80, options: [0, 1, 2, 3, 4].map(v => ({ value: String(v), label: String(v) })) },
      { key: 'damageTrack', label: 'Damage Track', type: 'json', width: 150 },
      { key: 'crew', label: 'Crew', type: 'number', required: true, min: 1, width: 60 },
      COL_COST, COL_DESC,
    ],
    defaultItem: { id: '', name: '', shipClass: 'light', category: 'military', hullPoints: 20, bonusHullPoints: 0, toughness: 'Light', targetModifier: 0, maneuverability: 2, damageTrack: { stun: 5, wound: 10, mortal: 5, critical: 5 }, crew: 5, cost: 1000000, description: '' },
  },

  // ---- Armor ----
  {
    id: 'armors',
    label: 'Armor Types',
    fileName: 'armor.json',
    rootKey: 'armors',
    columns: [
      COL_ID, COL_NAME,
      { key: 'armorWeight', label: 'Weight', type: 'select', required: true, width: 100, options: [{ value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' }, { value: 'super-heavy', label: 'Super-Heavy' }] },
      COL_PL, COL_TECH,
      { key: 'protectionLI', label: 'Prot LI', type: 'text', width: 70 },
      { key: 'protectionHI', label: 'Prot HI', type: 'text', width: 70 },
      { key: 'protectionEn', label: 'Prot En', type: 'text', width: 70 },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', armorWeight: 'light', progressLevel: 6, techTracks: [], protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1', costPerHullPoint: 10000, description: '' },
  },
  {
    id: 'armorWeights',
    label: 'Armor Weights',
    fileName: 'armor.json',
    rootKey: 'armorWeights',
    columns: [
      { key: 'weight', label: 'Weight', type: 'select', required: true, width: 100, options: [{ value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' }, { value: 'super-heavy', label: 'Super-Heavy' }] },
      COL_NAME,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', required: true, min: 0, max: 1, width: 70 },
      { key: 'costHullPercentage', label: 'Cost Hull %', type: 'number', min: 0, max: 1, width: 90 },
      { key: 'minShipClass', label: 'Min Class', type: 'select', width: 110, options: SHIP_CLASS_OPTIONS },
      COL_DESC,
    ],
    defaultItem: { weight: 'light', name: '', hullPercentage: 0.1, costHullPercentage: 0.1, minShipClass: 'small-craft', description: '' },
  },

  // ---- Power Plants ----
  {
    id: 'powerPlants',
    label: 'Power Plants',
    fileName: 'powerPlants.json',
    rootKey: 'powerPlants',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', required: true, min: 0, width: 80 },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 70 },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 90 },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80 },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60 },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 90 },
      { key: 'fuelEfficiency', label: 'Fuel Eff.', type: 'number', min: 0, width: 80 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], powerPerHullPoint: 2, minSize: 1, baseCost: 100000, costPerHullPoint: 50000, requiresFuel: false, fuelCostPerHullPoint: 0, fuelEfficiency: 0, description: '' },
  },

  // ---- Engines ----
  {
    id: 'engines',
    label: 'Engines',
    fileName: 'engines.json',
    rootKey: 'engines',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', min: 0, width: 80 },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 70 },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 90 },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80 },
      { key: 'accelerationRatings', label: 'Accel. Ratings', type: 'json', width: 140 },
      { key: 'usesPL6Scale', label: 'PL6 Scale', type: 'boolean', width: 70 },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60 },
      { key: 'fuelOptional', label: 'Fuel Opt.', type: 'boolean', width: 70 },
      { key: 'fuelEfficiency', label: 'Fuel Eff.', type: 'number', min: 0, width: 80 },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 90 },
      { key: 'atmosphereSafe', label: 'Atmo Safe', type: 'boolean', width: 70 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], powerPerHullPoint: 1, minSize: 1, baseCost: 200000, costPerHullPoint: 50000, accelerationRatings: { at5Percent: 0.1, at10Percent: 0.25, at15Percent: 0.5, at20Percent: 0.75, at25Percent: 1.0 }, usesPL6Scale: false, requiresFuel: false, fuelOptional: false, fuelEfficiency: 0, fuelCostPerHullPoint: 0, atmosphereSafe: false, description: '' },
  },

  // ---- FTL Drives ----
  {
    id: 'ftlDrives',
    label: 'FTL Drives',
    fileName: 'ftlDrives.json',
    rootKey: 'ftlDrives',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', min: 0, width: 80 },
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 1, width: 70 },
      { key: 'isFixedSize', label: 'Fixed', type: 'boolean', width: 60 },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 70 },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 90 },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80 },
      { key: 'performanceUnit', label: 'Perf. Unit', type: 'text', width: 100 },
      { key: 'ftlRatings', label: 'FTL Ratings', type: 'json', width: 140 },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60 },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 90 },
      { key: 'minFuelHullPercentage', label: 'Min Fuel %', type: 'number', min: 0, max: 1, width: 80 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], powerPerHullPoint: 1, hullPercentage: 0.1, isFixedSize: false, minSize: 1, baseCost: 500000, costPerHullPoint: 100000, performanceUnit: 'lightyears/day', ftlRatings: {}, requiresFuel: false, fuelCostPerHullPoint: 0, minFuelHullPercentage: 0, description: '' },
  },

  // ---- Support: Life Support ----
  {
    id: 'lifeSupport',
    label: 'Life Support',
    fileName: 'supportSystems.json',
    rootKey: 'lifeSupport',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'coveragePerHullPoint', label: 'Coverage/HP', type: 'number', min: 0, width: 90 },
      { key: 'recyclingCapacity', label: 'Recycle Cap.', type: 'number', min: 0, width: 90 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 50000, coveragePerHullPoint: 100, recyclingCapacity: 0, description: '' },
  },

  // ---- Support: Accommodations ----
  {
    id: 'accommodations',
    label: 'Accommodations',
    fileName: 'supportSystems.json',
    rootKey: 'accommodations',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'capacity', label: 'Capacity', type: 'number', min: 0, width: 70 },
      { key: 'category', label: 'Category', type: 'select', width: 90, options: [{ value: 'crew', label: 'Crew' }, { value: 'passenger', label: 'Passenger' }, { value: 'troop', label: 'Troop' }, { value: 'suspended', label: 'Suspended' }] },
      { key: 'includesAirlock', label: 'Airlock', type: 'boolean', width: 60 },
      { key: 'storesDaysPerPerson', label: 'Stores Days', type: 'number', min: 0, width: 90 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 10000, capacity: 1, category: 'crew', includesAirlock: false, storesDaysPerPerson: 0, description: '' },
  },

  // ---- Support: Store Systems ----
  {
    id: 'storeSystems',
    label: 'Store Systems',
    fileName: 'supportSystems.json',
    rootKey: 'storeSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'effect', label: 'Effect', type: 'select', width: 120, options: [{ value: 'feeds', label: 'Feeds' }, { value: 'reduces-consumption', label: 'Reduces Consumption' }, { value: 'adds-stores', label: 'Adds Stores' }] },
      { key: 'effectValue', label: 'Effect Value', type: 'number', min: 0, width: 90 },
      { key: 'affectedPeople', label: 'Affected', type: 'number', min: 0, width: 70 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 10000, effect: 'feeds', effectValue: 1, affectedPeople: 0, description: '' },
  },

  // ---- Support: Gravity Systems ----
  {
    id: 'gravitySystems',
    label: 'Gravity Systems',
    fileName: 'supportSystems.json',
    rootKey: 'gravitySystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 1, width: 70 },
      { key: 'isFixedSize', label: 'Fixed', type: 'boolean', width: 60 },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80 },
      COL_POWER, COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPercentage: 0.05, isFixedSize: false, costPerHullPoint: 10000, powerRequired: 1, description: '' },
  },

  // ---- Defenses ----
  {
    id: 'defenseSystems',
    label: 'Defenses',
    fileName: 'defenses.json',
    rootKey: 'defenseSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 120, options: [{ value: 'screen', label: 'Screen' }, { value: 'countermeasure', label: 'Countermeasure' }, { value: 'repair', label: 'Repair' }, { value: 'shield-component', label: 'Shield Component' }] },
      COL_HP,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 1, width: 70 },
      COL_POWER, COL_POWER_PER, COL_COST, COL_COST_PER,
      { key: 'coverage', label: 'Coverage', type: 'number', min: 0, width: 70 },
      { key: 'effect', label: 'Effect', type: 'text', width: 150 },
      { key: 'damageCheckBonus', label: 'Dmg Bonus', type: 'number', width: 70 },
      { key: 'shieldPoints', label: 'Shield Pts', type: 'number', min: 0, width: 80 },
      { key: 'coverageMultiples', label: 'Cov. Mult.', type: 'boolean', width: 70 },
      { key: 'fixedCoverage', label: 'Fixed Cov.', type: 'boolean', width: 70 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'screen', hullPoints: 1, hullPercentage: 0, powerRequired: 1, powerPer: 'unit', cost: 50000, costPer: 'unit', coverage: 0, effect: '', damageCheckBonus: 0, shieldPoints: 0, coverageMultiples: false, fixedCoverage: false, description: '' },
  },

  // ---- Command & Control ----
  {
    id: 'commandSystems',
    label: 'Command & Control',
    fileName: 'commandControl.json',
    rootKey: 'commandSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 110, options: [{ value: 'command', label: 'Command' }, { value: 'communication', label: 'Communication' }, { value: 'computer', label: 'Computer' }] },
      COL_HP,
      { key: 'coveragePerHullPoint', label: 'Coverage/HP', type: 'number', min: 0, width: 90 },
      { key: 'maxHullPoints', label: 'Max HP', type: 'number', min: 0, width: 70 },
      COL_POWER, COL_COST, COL_COST_PER,
      { key: 'linkedSystemType', label: 'Linked', type: 'select', width: 80, options: [{ value: '', label: '—' }, { value: 'weapon', label: 'Weapon' }, { value: 'sensor', label: 'Sensor' }] },
      { key: 'maxQuantity', label: 'Max Qty', type: 'number', min: 0, width: 70 },
      { key: 'quality', label: 'Quality', type: 'select', width: 80, options: [{ value: '', label: '—' }, { value: 'Ordinary', label: 'Ordinary' }, { value: 'Good', label: 'Good' }, { value: 'Amazing', label: 'Amazing' }] },
      { key: 'effect', label: 'Effect', type: 'text', width: 150 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'command', hullPoints: 1, coveragePerHullPoint: 0, maxHullPoints: 0, powerRequired: 0, cost: 50000, costPer: 'unit', linkedSystemType: '', maxQuantity: 0, quality: '', effect: '', description: '' },
  },

  // ---- Sensors ----
  {
    id: 'sensors',
    label: 'Sensors',
    fileName: 'sensors.json',
    rootKey: 'sensors',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 80, options: [{ value: 'active', label: 'Active' }, { value: 'passive', label: 'Passive' }, { value: 'remote', label: 'Remote' }, { value: 'special', label: 'Special' }] },
      COL_HP, COL_POWER, COL_COST,
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 70 },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 70 },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 70 },
      { key: 'arcsCovered', label: 'Arcs', type: 'number', min: 0, width: 60 },
      { key: 'trackingCapability', label: 'Tracking', type: 'number', min: 0, width: 70 },
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'effect', label: 'Effect', type: 'text', width: 150 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'active', hullPoints: 1, powerRequired: 1, cost: 50000, rangeShort: 1, rangeMedium: 2, rangeLong: 5, arcsCovered: 1, trackingCapability: 1, accuracyModifier: 0, accuracyDescription: '', effect: '', description: '' },
  },

  // ---- Hangar & Misc ----
  {
    id: 'hangarMiscSystems',
    label: 'Hangar & Misc',
    fileName: 'hangarMisc.json',
    rootKey: 'hangarMiscSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 90, options: [{ value: 'hangar', label: 'Hangar' }, { value: 'cargo', label: 'Cargo' }, { value: 'emergency', label: 'Emergency' }, { value: 'facility', label: 'Facility' }, { value: 'utility', label: 'Utility' }] },
      COL_HP, COL_POWER, COL_POWER_PER, COL_COST, COL_COST_PER,
      { key: 'expandable', label: 'Expand.', type: 'boolean', width: 60 },
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 1, width: 70 },
      { key: 'effect', label: 'Effect', type: 'text', width: 150 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'cargo', hullPoints: 1, powerRequired: 0, powerPer: 'unit', cost: 10000, costPer: 'unit', expandable: false, hullPercentage: 0, effect: '', description: '' },
  },

  // ---- Weapons: Beam ----
  {
    id: 'beamWeapons',
    label: 'Beam Weapons',
    fileName: 'weapons.json',
    rootKey: 'beamWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 70 },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 70 },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 70 },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 70 },
      { key: 'firepower', label: 'FP', type: 'select', width: 60, options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 80 },
      { key: 'fireModes', label: 'Fire Modes', type: 'json', width: 100 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 100000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 3, rangeLong: 10, damageType: 'En', firepower: 'S', damage: 'd4s/d4w/d4m', fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Projectile ----
  {
    id: 'projectileWeapons',
    label: 'Projectile Weapons',
    fileName: 'weapons.json',
    rootKey: 'projectileWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 70 },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 70 },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 70 },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 70 },
      { key: 'firepower', label: 'FP', type: 'select', width: 60, options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 80 },
      { key: 'fireModes', label: 'Fire Modes', type: 'json', width: 100 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 50000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 2, rangeLong: 5, damageType: 'HI', firepower: 'S', damage: 'd4s/d4w/d4m', fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Torpedo ----
  {
    id: 'torpedoWeapons',
    label: 'Torpedo Weapons',
    fileName: 'weapons.json',
    rootKey: 'torpedoWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 70 },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 70 },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 70 },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 70 },
      { key: 'firepower', label: 'FP', type: 'select', width: 60, options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 80 },
      { key: 'fireModes', label: 'Fire Modes', type: 'json', width: 100 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 200000, accuracyModifier: 0, rangeShort: 2, rangeMedium: 5, rangeLong: 15, damageType: 'En', firepower: 'M', damage: 'd6s/d6w/d6m', fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Special ----
  {
    id: 'specialWeapons',
    label: 'Special Weapons',
    fileName: 'weapons.json',
    rootKey: 'specialWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 70 },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 70 },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 70 },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 70 },
      { key: 'firepower', label: 'FP', type: 'select', width: 60, options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 80 },
      { key: 'fireModes', label: 'Fire Modes', type: 'json', width: 100 },
      { key: 'specialEffect', label: 'Special', type: 'text', width: 120 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 200000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 3, rangeLong: 10, damageType: 'En', firepower: 'M', damage: 'd6s/d6w/d6m', fireModes: ['F'], specialEffect: '', description: '' },
  },

  // ---- Ordnance: Launch Systems ----
  {
    id: 'launchSystems',
    label: 'Launch Systems',
    fileName: 'ordnance.json',
    rootKey: 'launchSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'capacity', label: 'Capacity', type: 'number', min: 0, width: 70 },
      { key: 'expandable', label: 'Expand.', type: 'boolean', width: 60 },
      { key: 'expansionCapacityPerHp', label: 'Exp. Cap/HP', type: 'number', min: 0, width: 90 },
      { key: 'expansionCostPerHp', label: 'Exp. Cost/HP', type: 'number', min: 0, width: 90 },
      { key: 'rateOfFire', label: 'RoF', type: 'number', min: 0, width: 60 },
      { key: 'spaceReload', label: 'Space Rld', type: 'boolean', width: 70 },
      { key: 'ordnanceTypes', label: 'Ord. Types', type: 'json', width: 120 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 50000, capacity: 1, expandable: false, expansionCapacityPerHp: 0, expansionCostPerHp: 0, rateOfFire: 1, spaceReload: false, ordnanceTypes: ['missile'], description: '' },
  },

  // ---- Ordnance: Propulsion ----
  {
    id: 'propulsionSystems',
    label: 'Propulsion Systems',
    fileName: 'ordnance.json',
    rootKey: 'propulsionSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'applicableTo', label: 'Applies To', type: 'json', width: 100 },
      { key: 'size', label: 'Size', type: 'number', min: 0, width: 60 },
      { key: 'maxWarheadSize', label: 'Max WH Size', type: 'number', min: 0, width: 80 },
      COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'endurance', label: 'Endurance', type: 'number', width: 80 },
      { key: 'acceleration', label: 'Accel', type: 'number', width: 70 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], applicableTo: ['missile'], size: 1, maxWarheadSize: 1, cost: 10000, accuracyModifier: 0, endurance: null, acceleration: null, description: '' },
  },

  // ---- Ordnance: Warheads ----
  {
    id: 'warheads',
    label: 'Warheads',
    fileName: 'ordnance.json',
    rootKey: 'warheads',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'size', label: 'Size', type: 'number', min: 0, width: 60 },
      COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 70 },
      { key: 'firepower', label: 'FP', type: 'select', width: 60, options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 80 },
      { key: 'area', label: 'Area Effect', type: 'json', width: 120 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], size: 1, cost: 5000, accuracyModifier: 0, damageType: 'HI', firepower: 'S', damage: 'd4s/d4w/d4m', area: null, description: '' },
  },

  // ---- Ordnance: Guidance ----
  {
    id: 'guidanceSystems',
    label: 'Guidance Systems',
    fileName: 'ordnance.json',
    rootKey: 'guidanceSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 70 },
      { key: 'applicableTo', label: 'Applies To', type: 'json', width: 100 },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], cost: 5000, accuracyModifier: 0, applicableTo: ['missile'], description: '' },
  },
];

/**
 * Get the editor section definition by section ID.
 */
export function getEditorSection(sectionId: string): EditorSection | undefined {
  return EDITOR_SECTIONS.find(s => s.id === sectionId);
}

/**
 * Get all sections that belong to a given file.
 */
export function getSectionsForFile(fileName: ModDataFileName): EditorSection[] {
  return EDITOR_SECTIONS.filter(s => s.fileName === fileName);
}
