import type { TravelDocument } from './travelDocument';

export const TRAVEL_SAVE_FILE_VERSION = '1.0';
export const TRAVEL_FILE_EXTENSION = '.travel.json';

export interface TravelSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  document: TravelDocument;
}
