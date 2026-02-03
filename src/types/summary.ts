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
}
