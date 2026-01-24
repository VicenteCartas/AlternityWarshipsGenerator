/**
 * Ship class determines overall size, toughness, and firepower category
 */
export type ShipClass = 'small-craft' | 'light' | 'medium' | 'heavy' | 'super-heavy';

/**
 * Hull category: military or civilian
 */
export type HullCategory = 'military' | 'civilian';

/**
 * Ship toughness rating - determines weapon effectiveness
 * Good < Small Craft < Light < Medium < Heavy < Super-heavy
 */
export type ToughnessRating = 'Good' | 'Small Craft' | 'Light' | 'Medium' | 'Heavy' | 'Super-heavy';

/**
 * Maneuverability class (0-4, higher is more maneuverable)
 */
export type ManeuverabilityClass = 0 | 1 | 2 | 3 | 4;

/**
 * Target modifier - bonus/penalty steps to be hit
 */
export type TargetModifier = '-4 steps' | '-3 steps' | '-2 steps' | '-1 step' | '0' | '+1 step' | '+2 steps' | '+3 steps';

/**
 * Damage track values for a hull
 */
export interface DamageTrack {
  /** Stun damage points */
  stun: number;
  /** Wound damage points */
  wound: number;
  /** Mortal damage points */
  mortal: number;
  /** Critical damage points */
  critical: number;
}

/**
 * Hull definition from the Alternity Warships rulebook
 */
export interface Hull {
  /** Unique identifier for the hull type */
  id: string;
  
  /** Display name of the hull type */
  name: string;
  
  /** Ship class category */
  shipClass: ShipClass;
  
  /** Military or civilian hull */
  category: HullCategory;
  
  /** Base hull points available for systems */
  hullPoints: number;
  
  /** Bonus hull points from economy of scale (doesn't count for % calculations) */
  bonusHullPoints: number;
  
  /** 5% of base hull points (for armor/system calculations) */
  fivePercent: number;
  
  /** 10% of base hull points (for armor/system calculations) */
  tenPercent: number;
  
  /** Ship's toughness rating */
  toughness: ToughnessRating;
  
  /** Target modifier (resistance to enemy fire) */
  targetModifier: TargetModifier;
  
  /** Maneuverability class (0-4) */
  maneuverability: ManeuverabilityClass;
  
  /** Damage track values */
  damageTrack: DamageTrack;
  
  /** Typical crew complement */
  crew: number;
  
  /** Hull cost in credits */
  cost: number;
  
  /** Cost display string (e.g., "$300 K", "$20 M") */
  costDisplay: string;
  
  /** Description of the hull type */
  description: string;
}

/**
 * Calculated hull statistics (computed at runtime)
 */
export interface HullStats {
  /** Total hull points (base + bonus) */
  totalHullPoints: number;
  
  /** Hull points for light armor (0) */
  lightArmorCost: number;
  
  /** Hull points for medium armor (5%) */
  mediumArmorCost: number;
  
  /** Hull points for heavy armor (10%) */
  heavyArmorCost: number;
  
  /** Hull points for super-heavy armor (20%) */
  superHeavyArmorCost: number;
}

/**
 * Calculate derived hull statistics
 */
export function calculateHullStats(hull: Hull): HullStats {
  return {
    totalHullPoints: hull.hullPoints + hull.bonusHullPoints,
    lightArmorCost: 0,
    mediumArmorCost: hull.fivePercent,
    heavyArmorCost: hull.tenPercent,
    superHeavyArmorCost: Math.floor(hull.hullPoints * 0.2),
  };
}
