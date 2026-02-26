/**
 * Centralized domain color tokens for the Alternity Warships Generator.
 *
 * All hardcoded hex colors used across components should be defined here so
 * they can be maintained, themed, and reused from a single source of truth.
 */

import type { SystemDamageCategory } from '../types/damageDiagram';

// ---------------------------------------------------------------------------
// Budget / step-level category colors (used in BudgetChart, SummarySelection)
// ---------------------------------------------------------------------------
export const BUDGET_CATEGORY_COLORS: Record<string, string> = {
  armor: '#78909c',          // blue-grey
  powerPlants: '#ff9800',    // orange
  engines: '#009688',        // teal
  ftl: '#9c27b0',            // purple
  support: '#795548',        // brown
  weapons: '#f44336',        // red
  defenses: '#4caf50',       // green
  commandControl: '#2196f3', // blue
  sensors: '#00bcd4',        // cyan
  hangarMisc: '#607d8b',     // grey
  hull: '#455a64',           // dark grey (cost-only)
};

// ---------------------------------------------------------------------------
// Damage zone system-category colors (used in DamageDiagramSelection)
// ---------------------------------------------------------------------------
export const DAMAGE_CATEGORY_COLORS: Record<SystemDamageCategory, string> = {
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

export const DAMAGE_CATEGORY_TEXT_COLORS: Record<SystemDamageCategory, string> = {
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

// ---------------------------------------------------------------------------
// Fire diagram arc heat-map colors (used in FireDiagram)
// ---------------------------------------------------------------------------
export const FIRE_ARC_STANDARD = {
  empty: '#e0e0e0',
  low: '#90caf9',     // 1-4 weapons
  medium: '#42a5f5',  // 5-8 weapons
  high: '#1976d2',    // 9-12 weapons
  max: '#0d47a1',     // 13+ weapons
} as const;

export const FIRE_ARC_ZERO = {
  empty: '#e0e0e0',
  low: '#ffcc80',     // 1-2 weapons
  medium: '#ffa726',  // 3-4 weapons
  high: '#f57c00',    // 5-6 weapons
  max: '#e65100',     // 7+ weapons
} as const;

// ---------------------------------------------------------------------------
// Fill-level / capacity indicator colors (used in DamageDiagramSelection)
// ---------------------------------------------------------------------------
export const FILL_LEVEL_COLORS = {
  over: '#f44336',    // red — over capacity
  high: '#ff9800',    // orange — 90%+
  medium: '#ffc107',  // amber — 50-89%
  low: '#4caf50',     // green — under 50%
} as const;

// ---------------------------------------------------------------------------
// Mod editor indicator
// ---------------------------------------------------------------------------
export const MOD_ROW_BORDER_COLOR = '#1976d2';
