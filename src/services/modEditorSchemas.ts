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
  /** Short description shown as guidance text in the editor */
  description?: string;
  fileName: ModDataFileName;
  rootKey: string;
  dataType?: 'array' | 'object' | 'record'; // Defaults to 'array'
  columns: ColumnDef[];
  defaultItem: Record<string, unknown>;
}

// ============== Shared column definitions ==============

const COL_ID: ColumnDef = { key: 'id', label: 'ID', type: 'text', required: true, width: 200, description: 'Unique identifier used internally. Must not contain spaces.' };
const COL_NAME: ColumnDef = { key: 'name', label: 'Name', type: 'text', required: true, width: 240, description: 'Display name shown in the builder UI' };
const COL_PL: ColumnDef = {
  key: 'progressLevel', label: 'PL', type: 'progressLevel', required: true, width: 100,
  description: 'Progress Level — the technology era (PL6=Fusion, PL7=Gravity, PL8=Energy, PL9=Matter)',
  options: [
    { value: '6', label: 'PL6' },
    { value: '7', label: 'PL7' },
    { value: '8', label: 'PL8' },
    { value: '9', label: 'PL9' },
  ],
};
const COL_TECH: ColumnDef = { key: 'techTracks', label: 'Tech', type: 'techTracks', width: 100, description: 'Required tech tracks. Empty means available to all tech configurations.' };
const COL_HP: ColumnDef = { key: 'hullPoints', label: 'HP', type: 'number', required: true, min: 0, width: 75, description: 'Hull Points consumed by this system' };
const COL_POWER: ColumnDef = { key: 'powerRequired', label: 'Power', type: 'number', min: 0, width: 80, description: 'Power Points consumed per unit installed' };
const COL_COST: ColumnDef = { key: 'cost', label: 'Cost', type: 'number', required: true, min: 0, width: 120, description: 'Base cost in credits' };
const COL_DESC: ColumnDef = { key: 'description', label: 'Description', type: 'text', width: 400 };
const COL_COST_PER: ColumnDef = {
  key: 'costPer', label: 'Cost Per', type: 'select', width: 90,
  description: 'How cost scales: per unit installed, per system HP, or per linked system HP',
  options: [
    { value: 'unit', label: 'Unit' },
    { value: 'systemHp', label: 'System HP' },
    { value: 'linkedHp', label: 'Linked HP' },
  ],
};
const COL_POWER_PER: ColumnDef = {
  key: 'powerPer', label: 'Power Per', type: 'select', width: 90,
  description: 'How power consumption scales: per unit installed or per system HP',
  options: [
    { value: 'unit', label: 'Unit' },
    { value: 'systemHp', label: 'System HP' },
  ],
};
const COL_EXPANDABLE: ColumnDef = { key: 'expandable', label: 'Expand.', type: 'boolean', width: 80, description: 'Whether additional HP can be added beyond the base amount' };
const COL_EXP_VALUE_PER_HP: ColumnDef = { key: 'expansionValuePerHp', label: 'Exp. Val/HP', type: 'number', min: 0, width: 110, description: 'Effect value gained per additional hull point spent on expansion' };
const COL_EXP_COST_PER_HP: ColumnDef = { key: 'expansionCostPerHp', label: 'Exp. Cost/HP', type: 'number', min: 0, width: 110, description: 'Credit cost per additional hull point spent on expansion' };

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

// Area effect columns (dot-notation into nested area object)
const COL_AREA_AMAZING: ColumnDef = { key: 'area.rangeAmazing', label: 'Area Amz', type: 'text', width: 90, description: 'Area of effect on an Amazing success' };
const COL_AREA_GOOD: ColumnDef = { key: 'area.rangeGood', label: 'Area Good', type: 'text', width: 90, description: 'Area of effect on a Good success' };
const COL_AREA_ORDINARY: ColumnDef = { key: 'area.rangeOrdinary', label: 'Area Ord', type: 'text', width: 90, description: 'Area of effect on an Ordinary success' };
const COL_AREA_NOTES: ColumnDef = { key: 'area.notes', label: 'Notes', type: 'select', width: 90, description: 'Weapon classification: TA=Tactical Arms, MD=Mass Destruction, SA=Strategic Arms', options: [
  { value: '', label: '—' },
  { value: 'TA', label: 'TA' },
  { value: 'MD', label: 'MD' },
  { value: 'SA', label: 'SA' },
] };

// ============== Section Definitions ==============

export const EDITOR_SECTIONS: EditorSection[] = [
  // ---- Hulls ----
  {
    id: 'hulls',
    label: 'Hulls',
    description: 'Ship hull frames — defines size class, hull points, damage track, crew requirements, and base cost for each warship hull.',
    fileName: 'hulls.json',
    rootKey: 'hulls',
    columns: [
      COL_ID, COL_NAME,
      { key: 'shipClass', label: 'Class', type: 'select', required: true, width: 130, description: 'Hull size classification (small-craft to super-heavy)', options: SHIP_CLASS_OPTIONS },
      { key: 'category', label: 'Type', type: 'select', required: true, width: 80, description: 'Military or civilian hull type', options: [{ value: 'military', label: 'Military' }, { value: 'civilian', label: 'Civilian' }] },
      { key: 'hullPoints', label: 'HP', type: 'number', required: true, min: 1, width: 80, description: 'Base hull points available for installations' },
      { key: 'bonusHullPoints', label: 'Bonus HP', type: 'number', min: 0, width: 90, description: 'Additional hull points beyond base value' },
      { key: 'toughness', label: 'Toughness', type: 'select', width: 120, description: 'Hull durability category for damage checks', options: ['Good', 'Small Craft', 'Light', 'Medium', 'Heavy', 'Super-Heavy'].map(v => ({ value: v, label: v })) },
      { key: 'targetModifier', label: 'Target Mod', type: 'number', width: 100, description: 'Modifier to attack rolls against this hull' },
      { key: 'maneuverability', label: 'Maneuver', type: 'select', width: 100, description: 'Base maneuverability rating', options: [0, 1, 2, 3, 4].map(v => ({ value: String(v), label: String(v) })) },
      { key: 'damageTrack.stun', label: 'Stun', type: 'number', min: 0, width: 70, description: 'Stun damage threshold' },
      { key: 'damageTrack.wound', label: 'Wound', type: 'number', min: 0, width: 75, description: 'Wound damage threshold' },
      { key: 'damageTrack.mortal', label: 'Mortal', type: 'number', min: 0, width: 75, description: 'Mortal damage threshold' },
      { key: 'damageTrack.critical', label: 'Crit', type: 'number', min: 0, width: 70, description: 'Critical damage threshold' },
      { key: 'crew', label: 'Crew', type: 'number', required: true, min: 1, width: 80, description: 'Minimum crew required to operate' },
      COL_COST, COL_DESC,
    ],
    defaultItem: { id: '', name: '', shipClass: 'light', category: 'military', hullPoints: 20, bonusHullPoints: 0, toughness: 'Light', targetModifier: 0, maneuverability: 2, damageTrack: { stun: 5, wound: 10, mortal: 5, critical: 5 }, crew: 5, cost: 1000000, description: '' },
  },

  // ---- Station Hulls ----
  {
    id: 'stationHulls',
    label: 'Station Hulls',
    description: 'Station and base hull frames — similar to ship hulls but designed for ground bases, outposts, and space stations.',
    fileName: 'hulls.json',
    rootKey: 'stationHulls',
    columns: [
      COL_ID, COL_NAME,
      { key: 'shipClass', label: 'Class', type: 'select', required: true, width: 130, description: 'Hull size classification (small-craft to super-heavy)', options: SHIP_CLASS_OPTIONS },
      { key: 'category', label: 'Type', type: 'select', required: true, width: 80, description: 'Military or civilian hull type', options: [{ value: 'military', label: 'Military' }, { value: 'civilian', label: 'Civilian' }] },
      { key: 'hullPoints', label: 'HP', type: 'number', required: true, min: 1, width: 80, description: 'Base hull points available for installations' },
      { key: 'bonusHullPoints', label: 'Bonus HP', type: 'number', min: 0, width: 90, description: 'Additional hull points beyond base value' },
      { key: 'toughness', label: 'Toughness', type: 'select', width: 120, description: 'Hull durability category for damage checks', options: ['Good', 'Small Craft', 'Light', 'Medium', 'Heavy', 'Super-Heavy'].map(v => ({ value: v, label: v })) },
      { key: 'targetModifier', label: 'Target Mod', type: 'number', width: 100, description: 'Modifier to attack rolls against this hull' },
      { key: 'maneuverability', label: 'Maneuver', type: 'select', width: 100, description: 'Base maneuverability rating', options: [0, 1, 2, 3, 4].map(v => ({ value: String(v), label: String(v) })) },
      { key: 'damageTrack.stun', label: 'Stun', type: 'number', min: 0, width: 70, description: 'Stun damage threshold' },
      { key: 'damageTrack.wound', label: 'Wound', type: 'number', min: 0, width: 75, description: 'Wound damage threshold' },
      { key: 'damageTrack.mortal', label: 'Mortal', type: 'number', min: 0, width: 75, description: 'Mortal damage threshold' },
      { key: 'damageTrack.critical', label: 'Crit', type: 'number', min: 0, width: 70, description: 'Critical damage threshold' },
      { key: 'crew', label: 'Crew', type: 'number', required: true, min: 1, width: 80, description: 'Minimum crew required to operate' },
      COL_COST, COL_DESC,
    ],
    defaultItem: { id: '', name: '', shipClass: 'light', category: 'military', hullPoints: 100, bonusHullPoints: 10, toughness: 'Light', targetModifier: 0, maneuverability: 0, damageTrack: { stun: 25, wound: 25, mortal: 13, critical: 7 }, crew: 10, cost: 5000000, description: '' },
  },

  // ---- Armor ----
  {
    id: 'armorWeights',
    label: 'Armor Weights',
    description: 'Armor weight categories (light, medium, heavy, etc.) — defines hull percentage used, cost scaling, and minimum ship class requirements.',
    fileName: 'armor.json',
    rootKey: 'armorWeights',
    columns: [
      COL_ID, COL_NAME,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', required: true, min: 0, max: 100, width: 70, description: 'Percentage of hull points used by armor' },
      { key: 'costHullPercentage', label: 'Cost Hull %', type: 'number', min: 0, max: 100, width: 120, description: 'Percentage of hull cost added for armor' },
      { key: 'minShipClass', label: 'Min Class', type: 'select', width: 110, description: 'Minimum ship class that can use this weight', options: SHIP_CLASS_OPTIONS },
      COL_DESC,
    ],
    defaultItem: { id: 'light', name: '', hullPercentage: 10, costHullPercentage: 10, minShipClass: 'small-craft', description: '' },
  },
  {
    id: 'armors',
    label: 'Armor Types',
    description: 'Specific armor technologies — each provides protection dice against low-impact, high-impact, and energy damage types.',
    fileName: 'armor.json',
    rootKey: 'armors',
    columns: [
      COL_ID, COL_NAME,
      { key: 'armorWeight', label: 'Weight', type: 'text', required: true, width: 100, description: 'Weight category (light, medium, heavy, etc.)' },
      COL_PL, COL_TECH,
      { key: 'protectionLI', label: 'Prot LI', type: 'text', width: 100, description: 'Protection dice vs low-impact damage' },
      { key: 'protectionHI', label: 'Prot HI', type: 'text', width: 100, description: 'Protection dice vs high-impact damage' },
      { key: 'protectionEn', label: 'Prot En', type: 'text', width: 100, description: 'Protection dice vs energy damage' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 120, description: 'Cost per hull point of armor installed' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', armorWeight: 'light', progressLevel: 6, techTracks: [], protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1', costPerHullPoint: 10000, description: '' },
  },

  // ---- Power Plants ----
  {
    id: 'powerPlants',
    label: 'Power Plants',
    description: 'Reactor and generator types — produces power points per hull point allocated. Some require fuel.',
    fileName: 'powerPlants.json',
    rootKey: 'powerPlants',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', required: true, min: 0, width: 100, description: 'Power points generated per hull point allocated' },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 90, description: 'Minimum hull points required' },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 100, description: 'Fixed base cost of the power plant' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 100, description: 'Additional cost per hull point allocated' },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60, description: 'Whether this power plant requires fuel' },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 120, description: 'Fuel cost per hull point of power plant' },
      { key: 'fuelEfficiency', label: 'Fuel Eff.', type: 'number', min: 0, width: 90, description: 'Fuel consumption efficiency multiplier' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], powerPerHullPoint: 2, minSize: 1, baseCost: 100000, costPerHullPoint: 50000, requiresFuel: false, fuelCostPerHullPoint: 0, fuelEfficiency: 0, description: '' },
  },

  // ---- Engines ----
  {
    id: 'engines',
    label: 'Engines',
    description: 'Sublight drive systems — acceleration ratings scale with hull percentage allocated. Higher tech engines are more efficient.',
    fileName: 'engines.json',
    rootKey: 'engines',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', min: 0, width: 100, description: 'Power consumed per hull point of engine' },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 90, description: 'Minimum hull points required' },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 100, description: 'Fixed base cost of the engine' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 100, description: 'Additional cost per hull point allocated' },
      { key: 'accelerationRatings.at5Percent', label: '5%', type: 'number', min: 0, width: 70, description: 'Acceleration at 5% hull allocation' },
      { key: 'accelerationRatings.at10Percent', label: '10%', type: 'number', min: 0, width: 70, description: 'Acceleration at 10% hull allocation' },
      { key: 'accelerationRatings.at15Percent', label: '15%', type: 'number', min: 0, width: 70, description: 'Acceleration at 15% hull allocation' },
      { key: 'accelerationRatings.at20Percent', label: '20%', type: 'number', min: 0, width: 70, description: 'Acceleration at 20% hull allocation' },
      { key: 'accelerationRatings.at30Percent', label: '30%', type: 'number', min: 0, width: 70, description: 'Acceleration at 30% hull allocation' },
      { key: 'accelerationRatings.at40Percent', label: '40%', type: 'number', min: 0, width: 70, description: 'Acceleration at 40% hull allocation' },
      { key: 'accelerationRatings.at50Percent', label: '50%', type: 'number', min: 0, width: 70, description: 'Acceleration at 50% hull allocation' },
      { key: 'usesPL6Scale', label: 'PL6 Scale', type: 'boolean', width: 90, description: 'Uses alternative PL6 acceleration scale' },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60, description: 'Whether this engine requires fuel' },
      { key: 'fuelOptional', label: 'Fuel Opt.', type: 'boolean', width: 90, description: 'Fuel is optional but improves performance' },
      { key: 'fuelEfficiency', label: 'Fuel Eff.', type: 'number', min: 0, width: 90, description: 'Fuel consumption efficiency multiplier' },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 120, description: 'Fuel cost per hull point of engine' },
      { key: 'atmosphereSafe', label: 'Atmo Safe', type: 'boolean', width: 90, description: 'Safe for atmospheric operation' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], powerPerHullPoint: 1, minSize: 1, baseCost: 200000, costPerHullPoint: 50000, accelerationRatings: { at5Percent: 0.1, at10Percent: 0.25, at15Percent: 0.5, at20Percent: 0.75, at30Percent: 1.0, at40Percent: 1.5, at50Percent: 2.0 }, usesPL6Scale: false, requiresFuel: false, fuelOptional: false, fuelEfficiency: 0, fuelCostPerHullPoint: 0, atmosphereSafe: false, description: '' },
  },
  {
    id: 'fuelTank',
    label: 'Fuel Tank',
    description: 'Fuel storage configuration — a single shared definition for all fuel tanks. This section is a single object, not a list.',
    fileName: 'fuelTank.json',
    rootKey: 'fuelTank',
    dataType: 'object',
    columns: [
      COL_NAME, COL_PL, COL_TECH,
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 100, description: 'Fixed base cost of fuel tank' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 100, description: 'Additional cost per hull point' },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 0, width: 90, description: 'Minimum hull points required' },
      COL_DESC,
    ],
    defaultItem: { id: 'fuel-tank', name: 'Fuel Tank', progressLevel: 6, techTracks: [], baseCost: 50000, costPerHullPoint: 10000, minSize: 0, description: '' },
  },

  // ---- FTL Drives ----
  {
    id: 'ftlDrives',
    label: 'FTL Drives',
    description: 'Faster-than-light drive systems — FTL speed ratings scale with hull percentage allocated. Some require dedicated fuel.',
    fileName: 'ftlDrives.json',
    rootKey: 'ftlDrives',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'powerPerHullPoint', label: 'Power/HP', type: 'number', min: 0, width: 100, description: 'Power consumed per hull point of FTL drive' },
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 100, width: 70, description: 'Percentage of hull used for FTL drive' },
      { key: 'isFixedSize', label: 'Fixed', type: 'boolean', width: 60, description: 'Whether this has a fixed hull point cost' },
      { key: 'minSize', label: 'Min Size', type: 'number', min: 1, width: 90, description: 'Minimum hull points required' },
      { key: 'baseCost', label: 'Base Cost', type: 'number', min: 0, width: 100, description: 'Fixed base cost' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 100, description: 'Additional cost per hull point allocated' },
      { key: 'performanceUnit', label: 'Perf. Unit', type: 'text', width: 100, description: 'Unit for FTL performance ratings' },
      { key: 'ftlRatings.at5Percent', label: '5%', type: 'number', min: 0, width: 70, description: 'FTL speed at 5% hull allocation' },
      { key: 'ftlRatings.at10Percent', label: '10%', type: 'number', min: 0, width: 70, description: 'FTL speed at 10% hull allocation' },
      { key: 'ftlRatings.at15Percent', label: '15%', type: 'number', min: 0, width: 70, description: 'FTL speed at 15% hull allocation' },
      { key: 'ftlRatings.at20Percent', label: '20%', type: 'number', min: 0, width: 70, description: 'FTL speed at 20% hull allocation' },
      { key: 'ftlRatings.at30Percent', label: '30%', type: 'number', min: 0, width: 70, description: 'FTL speed at 30% hull allocation' },
      { key: 'ftlRatings.at40Percent', label: '40%', type: 'number', min: 0, width: 70, description: 'FTL speed at 40% hull allocation' },
      { key: 'ftlRatings.at50Percent', label: '50%', type: 'number', min: 0, width: 70, description: 'FTL speed at 50% hull allocation' },
      { key: 'requiresFuel', label: 'Fuel?', type: 'boolean', width: 60, description: 'Whether FTL drive requires fuel' },
      { key: 'fuelCostPerHullPoint', label: 'Fuel Cost/HP', type: 'number', min: 0, width: 120, description: 'Fuel cost per hull point of drive' },
      { key: 'minFuelHullPercentage', label: 'Min Fuel %', type: 'number', min: 0, max: 100, width: 100, description: 'Minimum fuel hull percentage for FTL' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], powerPerHullPoint: 1, hullPercentage: 10, isFixedSize: false, minSize: 1, baseCost: 500000, costPerHullPoint: 100000, performanceUnit: 'lightyears/day', ftlRatings: { at5Percent: null, at10Percent: 1, at15Percent: 2, at20Percent: 3, at30Percent: 4, at40Percent: 5, at50Percent: 6 }, requiresFuel: false, fuelCostPerHullPoint: 0, minFuelHullPercentage: 0, description: '' },
  },

  // ---- Support: Life Support ----
  {
    id: 'lifeSupport',
    label: 'Life Support',
    description: 'Atmosphere and environmental systems — provides crew coverage per hull point. Expandable systems can scale with larger ships.',
    fileName: 'supportSystems.json',
    rootKey: 'lifeSupport',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'coveragePerHullPoint', label: 'Coverage/HP', type: 'number', min: 0, width: 110, description: 'Crew capacity per hull point allocated' },
      { key: 'recyclingCapacity', label: 'Recycle Cap.', type: 'number', min: 0, width: 110, description: 'Supply recycling capability' },
      COL_EXPANDABLE, COL_EXP_VALUE_PER_HP, COL_EXP_COST_PER_HP,
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 50000, coveragePerHullPoint: 100, recyclingCapacity: 0, description: '' },
  },

  // ---- Support: Accommodations ----
  {
    id: 'accommodations',
    label: 'Accommodations',
    description: 'Crew quarters, passenger berths, troop barracks, and suspended animation pods. Some include airlocks or stores.',
    fileName: 'supportSystems.json',
    rootKey: 'accommodations',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'capacity', label: 'Capacity', type: 'number', min: 0, width: 90, description: 'Number of people accommodated' },
      { key: 'category', label: 'Category', type: 'select', width: 100, description: 'Type of accommodation', options: [{ value: 'crew', label: 'Crew' }, { value: 'passenger', label: 'Passenger' }, { value: 'troop', label: 'Troop' }, { value: 'suspended', label: 'Suspended' }] },
      { key: 'includesAirlock', label: 'Airlock', type: 'boolean', width: 80, description: 'Whether this includes an airlock' },
      { key: 'storesDaysPerPerson', label: 'Stores Days', type: 'number', min: 0, width: 100, description: 'Days of stores per person included' },
      COL_EXPANDABLE, COL_EXP_VALUE_PER_HP, COL_EXP_COST_PER_HP,
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 10000, capacity: 1, category: 'crew', includesAirlock: false, storesDaysPerPerson: 0, description: '' },
  },

  // ---- Support: Store Systems ----
  {
    id: 'storeSystems',
    label: 'Store Systems',
    description: 'Food production, storage, and supply systems — can feed crew, reduce consumption rates, or add days of stores.',
    fileName: 'supportSystems.json',
    rootKey: 'storeSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'effectValue', label: 'Effect Value', type: 'number', min: 0, width: 110, description: 'Magnitude of the effect' },
      { key: 'affectedPeople', label: 'Affected', type: 'number', min: 0, width: 90, description: 'Number of people affected' },
      COL_EXPANDABLE, COL_EXP_VALUE_PER_HP, COL_EXP_COST_PER_HP,
      { key: 'effect', label: 'Effect', type: 'select', width: 200, description: 'Type of effect on stores/supplies', options: [{ value: 'feeds', label: 'Feeds' }, { value: 'reduces-consumption', label: 'Reduces Consumption' }, { value: 'adds-stores', label: 'Adds Stores' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 10000, effect: 'feeds', effectValue: 1, affectedPeople: 0, description: '' },
  },

  // ---- Support: Gravity Systems ----
  {
    id: 'gravitySystems',
    label: 'Gravity Systems',
    description: 'Artificial gravity generators — sized as a percentage of hull. Ground bases with natural gravity may not need these.',
    fileName: 'supportSystems.json',
    rootKey: 'gravitySystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 100, width: 70, description: 'Percentage of hull used' },
      { key: 'isFixedSize', label: 'Fixed', type: 'boolean', width: 60, description: 'Whether this has a fixed hull point cost' },
      { key: 'costPerHullPoint', label: 'Cost/HP', type: 'number', min: 0, width: 80, description: 'Cost per hull point allocated' },
      COL_POWER, COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPercentage: 5, isFixedSize: false, costPerHullPoint: 10000, powerRequired: 1, description: '' },
  },

  // ---- Defenses ----
  {
    id: 'defenseSystems',
    label: 'Defenses',
    description: 'Screens, countermeasures, shields, and repair systems — provide damage reduction, arc coverage, or damage check bonuses.',
    fileName: 'defenses.json',
    rootKey: 'defenseSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 120, description: 'Defense system category', options: [{ value: 'screen', label: 'Screen' }, { value: 'countermeasure', label: 'Countermeasure' }, { value: 'repair', label: 'Repair' }, { value: 'shield-component', label: 'Shield Component' }] },
      COL_HP,
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 100, width: 70, description: 'Percentage of hull used' },
      COL_POWER, COL_POWER_PER, COL_COST, COL_COST_PER,
      { key: 'coverage', label: 'Coverage', type: 'number', min: 0, width: 100, description: 'Number of arcs covered' },
      { key: 'damageCheckBonus', label: 'Dmg Bonus', type: 'number', width: 120, description: 'Bonus to damage check rolls' },
      { key: 'shieldPoints', label: 'Shield Pts', type: 'number', min: 0, width: 100, description: 'Shield hit points' },
      { key: 'coverageMultiples', label: 'Cov. Mult.', type: 'boolean', width: 90, description: 'Allows multiple coverage purchases' },
      { key: 'fixedCoverage', label: 'Fixed Cov.', type: 'boolean', width: 90, description: 'Coverage cannot be expanded' },
      { key: 'effect', label: 'Effect', type: 'text', width: 250, description: 'Special effect description' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'screen', hullPoints: 1, hullPercentage: 0, powerRequired: 1, powerPer: 'unit', cost: 50000, costPer: 'unit', coverage: 0, effect: '', damageCheckBonus: 0, shieldPoints: 0, coverageMultiples: false, fixedCoverage: false, description: '' },
  },

  // ---- Command & Control ----
  {
    id: 'commandSystems',
    label: 'Command & Control',
    description: 'Command, communication, and computer systems — provides ship coordination, fire control links, and sensor integration.',
    fileName: 'commandControl.json',
    rootKey: 'commandSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 110, description: 'C4 system type', options: [{ value: 'command', label: 'Command' }, { value: 'communication', label: 'Communication' }, { value: 'computer', label: 'Computer' }] },
      COL_HP,
      { key: 'coveragePerHullPoint', label: 'Coverage/HP', type: 'number', min: 0, width: 120, description: 'Command coverage per hull point' },
      { key: 'maxHullPoints', label: 'Max HP', type: 'number', min: 0, width: 70, description: 'Maximum hull points allocatable' },
      COL_POWER, COL_COST, COL_COST_PER,
      { key: 'linkedSystemType', label: 'Linked', type: 'select', width: 80, description: 'System type this links to', options: [{ value: '', label: '—' }, { value: 'weapon', label: 'Weapon' }, { value: 'sensor', label: 'Sensor' }] },
      { key: 'maxQuantity', label: 'Max Qty', type: 'number', min: 0, width: 90, description: 'Maximum number installable' },
      { key: 'quality', label: 'Quality', type: 'select', width: 80, description: 'System quality level', options: [{ value: '', label: '—' }, { value: 'Ordinary', label: 'Ordinary' }, { value: 'Good', label: 'Good' }, { value: 'Amazing', label: 'Amazing' }] },
      { key: 'effect', label: 'Effect', type: 'text', width: 250, description: 'Special effect description' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'command', hullPoints: 1, coveragePerHullPoint: 0, maxHullPoints: 0, powerRequired: 0, cost: 50000, costPer: 'unit', linkedSystemType: '', maxQuantity: 0, quality: '', effect: '', description: '' },
  },

  // ---- Sensors ----
  {
    id: 'sensors',
    label: 'Sensors',
    description: 'Detection and targeting systems — active, passive, remote, and special sensors with range bands and tracking capability.',
    fileName: 'sensors.json',
    rootKey: 'sensors',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 80, description: 'Sensor type (active, passive, remote, special)', options: [{ value: 'active', label: 'Active' }, { value: 'passive', label: 'Passive' }, { value: 'remote', label: 'Remote' }, { value: 'special', label: 'Special' }] },
      COL_HP, COL_POWER, COL_COST,
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 90, description: 'Detection range at short distance' },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 90, description: 'Detection range at medium distance' },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 90, description: 'Detection range at long distance' },
      { key: 'arcsCovered', label: 'Arcs', type: 'number', min: 0, width: 70, description: 'Number of fire arcs covered' },
      { key: 'trackingCapability', label: 'Tracking', type: 'number', min: 0, width: 90, description: 'Number of targets trackable' },
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Modifier to accuracy checks' },
      { key: 'effect', label: 'Effect', type: 'text', width: 250, description: 'Special effect description' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'active', hullPoints: 1, powerRequired: 1, cost: 50000, rangeShort: 1, rangeMedium: 2, rangeLong: 5, arcsCovered: 1, trackingCapability: 1, accuracyModifier: 0, accuracyDescription: '', effect: '', description: '' },
  },

  // ---- Hangar & Misc ----
  {
    id: 'hangarMiscSystems',
    label: 'Hangar & Misc',
    description: 'Hangars, cargo bays, emergency systems, facilities, and utility installations.',
    fileName: 'hangarMisc.json',
    rootKey: 'hangarMiscSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'category', label: 'Category', type: 'select', required: true, width: 90, description: 'System category', options: [{ value: 'hangar', label: 'Hangar' }, { value: 'cargo', label: 'Cargo' }, { value: 'emergency', label: 'Emergency' }, { value: 'facility', label: 'Facility' }, { value: 'utility', label: 'Utility' }] },
      COL_HP, COL_POWER, COL_POWER_PER, COL_COST, COL_COST_PER,
      { key: 'expandable', label: 'Expand.', type: 'boolean', width: 80, description: 'Can be expanded with more hull points' },
      { key: 'hullPercentage', label: 'Hull %', type: 'number', min: 0, max: 100, width: 70, description: 'Percentage of hull used' },
      { key: 'effect', label: 'Effect', type: 'text', width: 250, description: 'Special effect description' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], category: 'cargo', hullPoints: 1, powerRequired: 0, powerPer: 'unit', cost: 10000, costPer: 'unit', expandable: false, hullPercentage: 0, effect: '', description: '' },
  },

  // ---- Weapon Modifiers ----
  {
    id: 'mountModifiers',
    label: 'Weapon Mounts',
    description: 'Weapon mounting types (turret, fixed, bay, etc.) — each defines cost/HP multipliers, standard arcs, and which weapon categories are allowed.',
    fileName: 'weapons.json',
    rootKey: 'mountModifiers',
    dataType: 'record',
    columns: [
      COL_ID,
      { key: 'costMultiplier', label: 'Cost Mult.', type: 'number', required: true, min: 0, width: 100, description: 'Multiplier applied to weapon cost' },
      { key: 'hpMultiplier', label: 'HP Mult.', type: 'number', required: true, min: 0, width: 100, description: 'Multiplier applied to weapon hull points' },
      { key: 'standardArcs', label: 'Std Arcs', type: 'number', min: 0, width: 90, description: 'Number of standard fire arcs' },
      { key: 'allowsZeroArc', label: 'Zero Arc', type: 'boolean', width: 90, description: 'Allows zero-range arc mounting' },
      { key: 'allowedCategories', label: 'Categories', type: 'multiselect', width: 120, description: 'Weapon categories this mount supports', options: [
        { value: 'beam', label: 'Beam' },
        { value: 'projectile', label: 'Projectile' },
        { value: 'torpedo', label: 'Torpedo' },
        { value: 'special', label: 'Special' },
        { value: 'ordnance', label: 'Ordnance' }
      ] },
      { key: 'minProgressLevel', label: 'Min PL', type: 'progressLevel', width: 80, description: 'Minimum progress level required', options: [
        { value: '', label: 'Any' },
        { value: '6', label: 'PL6' },
        { value: '7', label: 'PL7' },
        { value: '8', label: 'PL8' },
        { value: '9', label: 'PL9' }
      ] },
      COL_DESC,
    ],
    defaultItem: { id: 'new-mount', costMultiplier: 1, hpMultiplier: 1, standardArcs: 1, allowsZeroArc: true, description: '' },
  },
  {
    id: 'gunConfigurations',
    label: 'Gun Configs',
    description: 'Multi-barrel weapon configurations (single, dual, triple, quad) — maps actual gun count to effective damage output.',
    fileName: 'weapons.json',
    rootKey: 'gunConfigurations',
    dataType: 'record',
    columns: [
      COL_ID,
      { key: 'effectiveGunCount', label: 'Effective Guns', type: 'number', required: true, min: 1, width: 120, description: 'Effective number of guns for damage' },
      { key: 'actualGunCount', label: 'Actual Guns', type: 'number', required: true, min: 1, width: 120, description: 'Physical number of gun barrels' },
      COL_DESC,
    ],
    defaultItem: { id: 'new-config', effectiveGunCount: 1, actualGunCount: 1, description: '' },
  },
  {
    id: 'concealmentModifier',
    label: 'Concealment',
    description: 'Cost and HP multipliers for concealed weapon installations. This section is a single object.',
    fileName: 'weapons.json',
    rootKey: 'concealmentModifier',
    dataType: 'object',
    columns: [
      { key: 'costMultiplier', label: 'Cost Mult.', type: 'number', required: true, min: 0, width: 100, description: 'Cost multiplier for concealment' },
      { key: 'hpMultiplier', label: 'HP Mult.', type: 'number', required: true, min: 0, width: 100, description: 'Hull point multiplier for concealment' },
      COL_DESC,
    ],
    defaultItem: { id: 'concealment', costMultiplier: 1.5, hpMultiplier: 1.5, description: '' },
  },

  // ---- Weapons: Beam ----
  {
    id: 'beamWeapons',
    label: 'Beam Weapons',
    description: 'Energy weapons — lasers, particle beams, plasma cannons, and similar. Deal energy damage with various fire modes.',
    fileName: 'weapons.json',
    rootKey: 'beamWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Modifier to attack accuracy' },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 90, description: 'Short range in hexes' },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 90, description: 'Medium range in hexes' },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 90, description: 'Long range in hexes' },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 90, description: 'Damage type (LI, HI, En)' },
      { key: 'firepower', label: 'FP', type: 'select', width: 70, description: 'Firepower rating (S, M, L, X)', options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 200, description: 'Damage dice expression' },
      COL_AREA_AMAZING, COL_AREA_GOOD, COL_AREA_ORDINARY, COL_AREA_NOTES,
      { key: 'fireModes', label: 'Fire Modes', type: 'multiselect', width: 120, description: 'Available fire mode options', options: [{ value: 'F', label: 'F (Single-Shot)' }, { value: 'B', label: 'B (Burst)' }, { value: 'A', label: 'A (Automatic)' }, { value: 'G', label: 'G (Battery)' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 100000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 3, rangeLong: 10, damageType: 'En', firepower: 'S', damage: 'd4s/d4w/d4m', area: { rangeAmazing: '', rangeGood: '', rangeOrdinary: '', notes: '' }, fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Projectile ----
  {
    id: 'projectileWeapons',
    label: 'Projectile Weapons',
    description: 'Kinetic weapons — railguns, mass drivers, autocannons, and similar. Typically deal HI or LI damage.',
    fileName: 'weapons.json',
    rootKey: 'projectileWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Modifier to attack accuracy' },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 90, description: 'Short range in hexes' },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 90, description: 'Medium range in hexes' },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 90, description: 'Long range in hexes' },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 90, description: 'Damage type (LI, HI, En)' },
      { key: 'firepower', label: 'FP', type: 'select', width: 70, description: 'Firepower rating (S, M, L, X)', options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 200, description: 'Damage dice expression' },
      COL_AREA_AMAZING, COL_AREA_GOOD, COL_AREA_ORDINARY, COL_AREA_NOTES,
      { key: 'fireModes', label: 'Fire Modes', type: 'multiselect', width: 120, description: 'Available fire mode options', options: [{ value: 'F', label: 'F (Single-Shot)' }, { value: 'B', label: 'B (Burst)' }, { value: 'A', label: 'A (Automatic)' }, { value: 'G', label: 'G (Battery)' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 50000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 2, rangeLong: 5, damageType: 'HI', firepower: 'S', damage: 'd4s/d4w/d4m', area: { rangeAmazing: '', rangeGood: '', rangeOrdinary: '', notes: '' }, fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Torpedo ----
  {
    id: 'torpedoWeapons',
    label: 'Torpedo Weapons',
    description: 'Self-propelled warheads — torpedoes and similar heavy ordnance fired from built-in launchers.',
    fileName: 'weapons.json',
    rootKey: 'torpedoWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Modifier to attack accuracy' },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 90, description: 'Short range in hexes' },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 90, description: 'Medium range in hexes' },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 90, description: 'Long range in hexes' },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 90, description: 'Damage type (LI, HI, En)' },
      { key: 'firepower', label: 'FP', type: 'select', width: 70, description: 'Firepower rating (S, M, L, X)', options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 200, description: 'Damage dice expression' },
      COL_AREA_AMAZING, COL_AREA_GOOD, COL_AREA_ORDINARY, COL_AREA_NOTES,
      { key: 'fireModes', label: 'Fire Modes', type: 'multiselect', width: 120, description: 'Available fire mode options', options: [{ value: 'F', label: 'F (Single-Shot)' }, { value: 'B', label: 'B (Burst)' }, { value: 'A', label: 'A (Automatic)' }, { value: 'G', label: 'G (Battery)' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 200000, accuracyModifier: 0, rangeShort: 2, rangeMedium: 5, rangeLong: 15, damageType: 'En', firepower: 'M', damage: 'd6s/d6w/d6m', area: { rangeAmazing: '', rangeGood: '', rangeOrdinary: '', notes: '' }, fireModes: ['F'], description: '' },
  },

  // ---- Weapons: Special ----
  {
    id: 'specialWeapons',
    label: 'Special Weapons',
    description: 'Unique weapon systems with special effects — EMP, tractor beams, disruptors, and other unconventional armaments.',
    fileName: 'weapons.json',
    rootKey: 'specialWeapons',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Modifier to attack accuracy' },
      { key: 'rangeShort', label: 'Range S', type: 'number', min: 0, width: 90, description: 'Short range in hexes' },
      { key: 'rangeMedium', label: 'Range M', type: 'number', min: 0, width: 90, description: 'Medium range in hexes' },
      { key: 'rangeLong', label: 'Range L', type: 'number', min: 0, width: 90, description: 'Long range in hexes' },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 90, description: 'Damage type (LI, HI, En)' },
      { key: 'firepower', label: 'FP', type: 'select', width: 70, description: 'Firepower rating (S, M, L, X)', options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 200, description: 'Damage dice expression' },
      COL_AREA_AMAZING, COL_AREA_GOOD, COL_AREA_ORDINARY, COL_AREA_NOTES,
      { key: 'fireModes', label: 'Fire Modes', type: 'multiselect', width: 120, description: 'Available fire mode options', options: [{ value: 'F', label: 'F (Single-Shot)' }, { value: 'B', label: 'B (Burst)' }, { value: 'A', label: 'A (Automatic)' }, { value: 'G', label: 'G (Battery)' }] },
      { key: 'specialEffect', label: 'Special', type: 'text', width: 250, description: 'Special weapon effect description' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 7, techTracks: [], hullPoints: 1, powerRequired: 1, cost: 200000, accuracyModifier: 0, rangeShort: 1, rangeMedium: 3, rangeLong: 10, damageType: 'En', firepower: 'M', damage: 'd6s/d6w/d6m', area: { rangeAmazing: '', rangeGood: '', rangeOrdinary: '', notes: '' }, fireModes: ['F'], specialEffect: '', description: '' },
  },

  // ---- Ordnance: Launch Systems ----
  {
    id: 'launchSystems',
    label: 'Launch Systems',
    description: 'Missile bays, bomb racks, and mine layers — defines capacity, rate of fire, and compatible ordnance types.',
    fileName: 'ordnance.json',
    rootKey: 'launchSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_HP, COL_POWER, COL_COST,
      { key: 'capacity', label: 'Capacity', type: 'number', min: 0, width: 90, description: 'Ordnance storage capacity' },
      COL_EXPANDABLE,
      COL_EXP_VALUE_PER_HP,
      COL_EXP_COST_PER_HP,
      { key: 'rateOfFire', label: 'RoF', type: 'number', min: 0, width: 70, description: 'Ordnance launched per round' },
      { key: 'spaceReload', label: 'Space Rld', type: 'boolean', width: 90, description: 'Can reload in space' },
      { key: 'ordnanceTypes', label: 'Ord. Types', type: 'multiselect', width: 120, description: 'Compatible ordnance types', options: [{ value: 'missile', label: 'Missile' }, { value: 'bomb', label: 'Bomb' }, { value: 'mine', label: 'Mine' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], hullPoints: 1, powerRequired: 0, cost: 50000, capacity: 1, expandable: false, expansionValuePerHp: 0, expansionCostPerHp: 0, rateOfFire: 1, spaceReload: false, ordnanceTypes: ['missile'], description: '' },
  },

  // ---- Ordnance: Propulsion ----
  {
    id: 'propulsionSystems',
    label: 'Propulsion Systems',
    description: 'Ordnance propulsion modules — rocket motors and drives that give missiles speed, endurance, and accuracy.',
    fileName: 'ordnance.json',
    rootKey: 'propulsionSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'applicableTo', label: 'Applies To', type: 'multiselect', width: 120, description: 'Ordnance types this works with', options: [{ value: 'missile', label: 'Missile' }, { value: 'bomb', label: 'Bomb' }, { value: 'mine', label: 'Mine' }] },
      { key: 'size', label: 'Size', type: 'number', min: 0, width: 70, description: 'Propulsion system size' },
      { key: 'maxWarheadSize', label: 'Max WH Size', type: 'number', min: 0, width: 120, description: 'Maximum warhead size supported' },
      COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Accuracy modifier for ordnance' },
      { key: 'endurance', label: 'Endurance', type: 'number', width: 90, description: 'Duration in combat rounds' },
      { key: 'acceleration', label: 'Accel', type: 'number', width: 90, description: 'Ordnance acceleration rating' },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], applicableTo: ['missile'], size: 1, maxWarheadSize: 1, cost: 10000, accuracyModifier: 0, endurance: null, acceleration: null, description: '' },
  },

  // ---- Ordnance: Warheads ----
  {
    id: 'warheads',
    label: 'Warheads',
    description: 'Ordnance warhead payloads — explosive, nuclear, antimatter, and other warhead types with damage and firepower ratings.',
    fileName: 'ordnance.json',
    rootKey: 'warheads',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH,
      { key: 'size', label: 'Size', type: 'number', min: 0, width: 70, description: 'Warhead size' },
      COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Accuracy modifier' },
      { key: 'damageType', label: 'Dmg Type', type: 'text', width: 90, description: 'Damage type (LI, HI, En)' },
      { key: 'firepower', label: 'FP', type: 'select', width: 70, description: 'Firepower rating (S, M, L, X)', options: FIREPOWER_OPTIONS },
      { key: 'damage', label: 'Damage', type: 'text', width: 200, description: 'Damage dice expression' },
      COL_AREA_AMAZING, COL_AREA_GOOD, COL_AREA_ORDINARY, COL_AREA_NOTES,
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], size: 1, cost: 5000, accuracyModifier: 0, damageType: 'HI', firepower: 'S', damage: 'd4s/d4w/d4m', area: { rangeAmazing: '', rangeGood: '', rangeOrdinary: '', notes: '' }, description: '' },
  },

  // ---- Ordnance: Guidance ----
  {
    id: 'guidanceSystems',
    label: 'Guidance Systems',
    description: 'Ordnance targeting and guidance packages — provides accuracy modifiers for missiles, bombs, and mines.',
    fileName: 'ordnance.json',
    rootKey: 'guidanceSystems',
    columns: [
      COL_ID, COL_NAME, COL_PL, COL_TECH, COL_COST,
      { key: 'accuracyModifier', label: 'Acc Mod', type: 'number', width: 90, description: 'Accuracy modifier for guided ordnance' },
      { key: 'applicableTo', label: 'Applies To', type: 'multiselect', width: 120, description: 'Ordnance types this works with', options: [{ value: 'missile', label: 'Missile' }, { value: 'bomb', label: 'Bomb' }, { value: 'mine', label: 'Mine' }] },
      COL_DESC,
    ],
    defaultItem: { id: '', name: '', progressLevel: 6, techTracks: [], cost: 5000, accuracyModifier: 0, applicableTo: ['missile'], description: '' },
  },
];

// ============== Section Groups (sidebar navigation) ==============

export interface EditorSectionGroup {
  id: string;
  label: string;
  sectionIds: string[];
}

export const EDITOR_SECTION_GROUPS: EditorSectionGroup[] = [
  { id: 'hulls', label: 'Hulls', sectionIds: ['hulls', 'stationHulls'] },
  { id: 'armor', label: 'Armor', sectionIds: ['armorWeights', 'armors'] },
  { id: 'propulsion', label: 'Propulsion', sectionIds: ['powerPlants', 'engines', 'fuelTank', 'ftlDrives'] },
  { id: 'support', label: 'Support Systems', sectionIds: ['lifeSupport', 'accommodations', 'storeSystems', 'gravitySystems'] },
  { id: 'combat', label: 'Combat Systems', sectionIds: ['defenseSystems', 'commandSystems', 'sensors', 'hangarMiscSystems'] },
  { id: 'weapons', label: 'Weapons', sectionIds: ['mountModifiers', 'gunConfigurations', 'concealmentModifier', 'beamWeapons', 'projectileWeapons', 'torpedoWeapons', 'specialWeapons'] },
  { id: 'ordnance', label: 'Ordnance', sectionIds: ['launchSystems', 'propulsionSystems', 'warheads', 'guidanceSystems'] },
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

// ============== House Rules ==============

/**
 * A house rule is a top-level boolean/scalar flag in a data file
 * that can be toggled via the mod editor.
 */
export interface HouseRule {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Description shown to users */
  description: string;
  /** Which data file contains this flag */
  fileName: ModDataFileName;
  /** Top-level key in the JSON file */
  jsonKey: string;
  /** Default value (when not set) */
  defaultValue: boolean;
}

/**
 * All available house rules that mods can toggle.
 */
export const HOUSE_RULES: HouseRule[] = [
  {
    id: 'allowMultipleLayers',
    label: 'Allow Multiple Armor Layers',
    description: 'Ships can install one armor type per weight category (light, medium, heavy, super-heavy) simultaneously. Protection dice are listed separately per layer.',
    fileName: 'armor.json',
    jsonKey: 'allowMultipleLayers',
    defaultValue: false,
  },
];
