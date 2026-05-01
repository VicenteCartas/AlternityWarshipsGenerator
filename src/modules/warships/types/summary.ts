/**
 * Summary types for ship description and metadata
 */

/**
 * Ship description and lore information
 */
export interface ShipDescription {
  /** User-written lore/description for the ship */
  lore: string;
  /** Base64-encoded image data (or null if no image) */
  imageData: string | null;
  /** Image MIME type (e.g., 'image/png', 'image/jpeg') */
  imageMimeType: string | null;
  /** Faction or government that operates this design */
  faction: string;
  /** Operational role (e.g., patrol, escort, assault) */
  role: string;
  /** Commissioning date or year */
  commissioningDate: string;
  /** Design classification (e.g., destroyer, frigate) */
  classification: string;
  /** Manufacturer or shipyard */
  manufacturer: string;
}
