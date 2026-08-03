import type {
  CityTownLocation,
  CivilizationDesign,
  CivilizationLevelDefinition,
  InstallationLocation,
  InstallationFacilityDefinition,
  LawLevelDefinition,
  TradeCommodityDefinition,
} from '../types/worldbuilding';

export const TRADE_COMMODITIES: TradeCommodityDefinition[] = [
  { id: 'air-vehicles', name: 'Air vehicles', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'alcohol', name: 'Alcohol', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'art-objects', name: 'Art objects', value: 'High', bulk: 'Low', restricted: true },
  { id: 'animals-exotic', name: 'Animals, exotic', value: 'High', bulk: 'Medium', restricted: true },
  { id: 'animals-working', name: 'Animals, working', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'beef-grain-products', name: 'Beef/grain products', value: 'Low', bulk: 'Medium', restricted: false },
  { id: 'building-supplies', name: 'Building supplies', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'clothing', name: 'Clothing', value: 'Low', bulk: 'Low', restricted: false },
  { id: 'coffee-tea', name: 'Coffee/tea', value: 'Moderate', bulk: 'Low', restricted: false },
  { id: 'computers', name: 'Computers', value: 'High', bulk: 'Low', restricted: true },
  { id: 'contraband', name: 'Contraband', value: 'Very High', bulk: 'Low', restricted: true },
  { id: 'electronics', name: 'Electronics', value: 'High', bulk: 'Low', restricted: false },
  { id: 'entertainment-goods', name: 'Entertainment goods', value: 'Moderate', bulk: 'Low', restricted: false },
  { id: 'farm-machinery', name: 'Farm machinery', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'fruits-vegetables', name: 'Fruits/vegetables', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'furniture', name: 'Furniture', value: 'Varies', bulk: 'High', restricted: false },
  { id: 'fusion-generators', name: 'Fusion generators', value: 'Very High', bulk: 'Medium', restricted: false },
  { id: 'gas', name: 'Gas (H, He, etc.)', value: 'Low', bulk: 'High', restricted: false },
  { id: 'grain-rice', name: 'Grain/rice', value: 'Low', bulk: 'High', restricted: false },
  { id: 'ground-vehicles', name: 'Ground vehicles', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'heavy-machinery', name: 'Heavy machinery', value: 'High', bulk: 'Very High', restricted: false },
  { id: 'industrial-chemicals', name: 'Industrial chemicals', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'leather-goods', name: 'Leather goods', value: 'Moderate', bulk: 'Low', restricted: false },
  { id: 'lubricants', name: 'Lubricants', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'lumber', name: 'Lumber', value: 'Low', bulk: 'Medium', restricted: false },
  { id: 'machine-tools', name: 'Machine tools', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'medical-supplies', name: 'Medical supplies', value: 'Very High', bulk: 'Low', restricted: true },
  { id: 'military-vehicles', name: 'Military vehicles', value: 'Very High', bulk: 'High', restricted: true },
  { id: 'motors-engines', name: 'Motors/engines', value: 'High', bulk: 'Medium', restricted: false },
  { id: 'munitions', name: 'Munitions', value: 'Very High', bulk: 'Medium', restricted: true },
  { id: 'ore-raw', name: 'Ore, raw', value: 'Low', bulk: 'Very High', restricted: false },
  { id: 'petroleum', name: 'Petroleum', value: 'Moderate', bulk: 'Very High', restricted: false },
  { id: 'plastics', name: 'Plastics', value: 'Moderate', bulk: 'High', restricted: false },
  { id: 'radioactives', name: 'Radioactives', value: 'High', bulk: 'Medium', restricted: true },
  { id: 'refined-metals', name: 'Refined metals', value: 'High', bulk: 'High', restricted: false },
  { id: 'rubber', name: 'Rubber', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'soft-drinks', name: 'Soft drinks', value: 'Moderate', bulk: 'Medium', restricted: false },
  { id: 'stardrive-units', name: 'Stardrive units', value: 'Very High', bulk: 'Medium', restricted: true },
  { id: 'water', name: 'Water', value: 'Low', bulk: 'Very High', restricted: false },
  { id: 'weapons', name: 'Weapons', value: 'Very High', bulk: 'Medium', restricted: true },
];

export const INSTALLATION_FACILITIES: InstallationFacilityDefinition[] = [
  { id: 'access', name: 'Access: airlock or main gates' },
  { id: 'power', name: 'Power generation and distribution' },
  { id: 'life-support', name: 'Life support and environmental systems' },
  { id: 'defenses', name: 'Defenses, armories, turrets, or missile bays' },
  { id: 'vehicles', name: 'Vehicle storage and maintenance' },
  { id: 'quarters', name: 'Living quarters and lavatories' },
  { id: 'common-areas', name: 'Common areas and conference rooms' },
  { id: 'food', name: 'Food preparation and storage' },
  { id: 'communications', name: 'Communications, surveillance, and security posts' },
  { id: 'workspaces', name: 'Offices, laboratories, or workspaces' },
  { id: 'emergency', name: 'Emergency and firefighting facilities' },
  { id: 'industrial', name: 'Industrial machinery and control systems' },
  { id: 'entertainment', name: 'Entertainment facilities' },
];

export const PROGRESS_LEVELS = [
  { level: 0, label: 'PL 0', description: 'Prehistoric technology' },
  { level: 1, label: 'PL 1', description: 'Early metalworking societies' },
  { level: 2, label: 'PL 2', description: 'Preindustrial societies' },
  { level: 3, label: 'PL 3', description: 'Industrial societies' },
  { level: 4, label: 'PL 4', description: 'Information-age technology' },
  { level: 5, label: 'PL 5', description: 'Advanced near-future technology' },
  { level: 6, label: 'PL 6 - Fusion Age', description: 'Routine interplanetary spaceflight' },
  { level: 7, label: 'PL 7 - Gravity Age', description: 'Gravity manipulation and interstellar travel' },
  { level: 8, label: 'PL 8 - Energy Age', description: 'Energy transformation technology' },
  { level: 9, label: 'PL 9 - Matter Age', description: 'Matter transformation technology' },
] as const;

export const CIVILIZATION_LEVELS: CivilizationLevelDefinition[] = [
  { level: 0, name: 'Uninhabited', scale: 'No settlements or installations', population: 'None', resourceModifier: null },
  { level: 1, name: 'Unique', scale: 'One small settlement or outpost', population: '1,000 or fewer', resourceModifier: 3 },
  { level: 2, name: 'Scattered', scale: 'Several small settlements or outposts', population: 'About 10,000', resourceModifier: 2 },
  { level: 3, name: 'City', scale: 'One large settlement or several towns', population: 'More than 100,000', resourceModifier: 1 },
  { level: 4, name: 'Nation', scale: 'Several large cities or colonies', population: 'Up to 10 million', resourceModifier: 0 },
  { level: 5, name: 'Continent', scale: 'Several nations with most industries', population: 'About 100 million', resourceModifier: -1 },
  { level: 6, name: 'World', scale: 'Several settled continents and major exports', population: 'About 1 billion', resourceModifier: -2 },
  { level: 7, name: 'Improved World', scale: 'Dense continental settlement plus frontier habitats', population: 'About 10 billion', resourceModifier: -3, minimumProgressLevel: 5 },
  { level: 8, name: 'Megapolitan World', scale: 'Planetwide settlement with orbital and submarine habitats', population: '25 to 50 billion', resourceModifier: -4, minimumProgressLevel: 6 },
];

export const LAW_LEVELS: LawLevelDefinition[] = [
  { level: 0, name: 'Anarchy', description: 'No law exists beyond local force or custom.', lawModifier: -4 },
  { level: 1, name: 'Tribal', description: 'Justice follows custom, family, or clan authority.', lawModifier: -3 },
  { level: 2, name: 'Feudal', description: 'Individuals hold power and law depends on status.', lawModifier: -2 },
  { level: 3, name: 'Civic', description: 'Communities share basic civil rights and limited policing.', lawModifier: -1 },
  { level: 4, name: 'State', description: 'Communities share common laws and enforcement agencies.', lawModifier: 0 },
  { level: 5, name: 'National', description: 'A central government defines law across the society.', lawModifier: 1 },
  { level: 6, name: 'Totalitarian', description: 'Authorities may ignore civil rights in pursuit of order.', lawModifier: 2 },
  { level: 7, name: 'Technocracy', description: 'Surveillance and institutional control reach everyday life.', lawModifier: 3 },
  { level: 8, name: 'Nonhuman', description: 'The society follows an order alien to human expectations.', lawModifier: 4 },
];

export const DEFAULT_CIVILIZATION_DESIGN: CivilizationDesign = {
  name: '',
  origin: 'human',
  progressLevel: 6,
  civilizationLevel: 4,
  alienCivilizationLevel: 4,
  lawLevel: 4,
  hostileWorld: false,
  population: '',
  government: '',
  homeland: '',
  foodAndShelter: '',
  industries: '',
  externalContact: '',
  leisureAndArt: '',
  values: '',
  rivals: '',
  enemies: '',
  heroes: '',
  currency: '',
  resources: '',
  imports: '',
  exports: '',
  shortages: '',
  tradeImportIds: [],
  tradeExportIds: [],
  settlements: '',
  cities: [],
  installations: [],
  alienGoals: '',
  alienOrganization: '',
  alienAppearance: '',
  campaignRole: '',
  notes: '',
};

export function getCivilizationLevel(level: number): CivilizationLevelDefinition {
  return CIVILIZATION_LEVELS.find((definition) => definition.level === level) ?? CIVILIZATION_LEVELS[0]!;
}

export function getLawLevel(level: number): LawLevelDefinition {
  return LAW_LEVELS.find((definition) => definition.level === level) ?? LAW_LEVELS[0]!;
}

export function validateCivilizationDesign(design: CivilizationDesign): string[] {
  const warnings: string[] = [];
  const civilizationLevel = getCivilizationLevel(design.civilizationLevel);
  const alienCivilizationLevel = getCivilizationLevel(design.alienCivilizationLevel);
  const highestCivilizationLevel = design.origin === 'mixed'
    ? Math.max(design.civilizationLevel, design.alienCivilizationLevel)
    : design.civilizationLevel;
  if (highestCivilizationLevel >= 3 && design.lawLevel < highestCivilizationLevel) {
    warnings.push('Law Level is below Civilization Level; the GMG states that a large society falls into anarchy.');
  }
  if (design.origin === 'mixed' && design.civilizationLevel + design.alienCivilizationLevel > 10) {
    warnings.push('Human and alien Civilization Levels total more than the GMG mixed-society guideline of 10.');
  }
  if (civilizationLevel.minimumProgressLevel !== undefined
    && design.progressLevel < civilizationLevel.minimumProgressLevel) {
    warnings.push(`${civilizationLevel.name} requires at least Progress Level ${civilizationLevel.minimumProgressLevel}.`);
  }
  if (design.origin === 'mixed'
    && alienCivilizationLevel.minimumProgressLevel !== undefined
    && design.progressLevel < alienCivilizationLevel.minimumProgressLevel) {
    warnings.push(`Alien ${alienCivilizationLevel.name} requires at least Progress Level ${alienCivilizationLevel.minimumProgressLevel}.`);
  }
  if (design.hostileWorld && design.progressLevel < 6 && highestCivilizationLevel > 0) {
    warnings.push('A civilization on a world extremely hostile to human life requires at least Progress Level 6.');
  }
  if (design.civilizationLevel === 0 && design.population.trim()) {
    warnings.push('CL 0 is uninhabited, but a population has been entered.');
  }
  return warnings;
}

export function formatCivilizationSummary(design: CivilizationDesign): string {
  const civilizationLevel = getCivilizationLevel(design.civilizationLevel);
  const lawLevel = getLawLevel(design.lawLevel);
  const lines = [
    design.name.trim() || 'Unnamed Civilization',
    `${design.origin === 'mixed' ? 'Mixed' : design.origin === 'alien' ? 'Alien' : 'Human'} society`,
    design.origin === 'mixed'
      ? `PL ${design.progressLevel} | Human CL ${civilizationLevel.level}: ${civilizationLevel.name} | Alien CL ${design.alienCivilizationLevel}: ${getCivilizationLevel(design.alienCivilizationLevel).name} | LL ${lawLevel.level}: ${lawLevel.name}`
      : `PL ${design.progressLevel} | CL ${civilizationLevel.level}: ${civilizationLevel.name} | LL ${lawLevel.level}: ${lawLevel.name}`,
    design.population.trim() ? `Population: ${design.population.trim()}` : `Population guideline: ${civilizationLevel.population}`,
  ];
  const details: Array<[string, string]> = [
    ['Government', design.government], ['Homeland', design.homeland], ['Food and shelter', design.foodAndShelter],
    ['Industries', design.industries], ['External contact', design.externalContact], ['Leisure and art', design.leisureAndArt],
    ['Values', design.values], ['Rivals', design.rivals], ['Enemies', design.enemies], ['Heroes', design.heroes],
    ['Currency', design.currency], ['Resources', design.resources], ['Imports', design.imports], ['Exports', design.exports],
    ['Trade imports', commodityNames(design.tradeImportIds)], ['Trade exports', commodityNames(design.tradeExportIds)],
    ['Shortages', design.shortages], ['Settlements', design.settlements],
    ['Goals', design.alienGoals],
    ['Organization', design.alienOrganization], ['Appearance', design.alienAppearance], ['Campaign role', design.campaignRole],
    ['Notes', design.notes],
  ];
  for (const [label, value] of details) if (value.trim()) lines.push(`${label}: ${value.trim()}`);
  for (const city of design.cities) lines.push('', formatCityTownSummary(city));
  for (const installation of design.installations) lines.push('', formatInstallationSummary(installation));
  return lines.join('\n');
}

export function createCityTown(id: string, kind: CityTownLocation['kind'] = 'city'): CityTownLocation {
  return {
    id, name: kind === 'city' ? 'New City' : 'New Town', kind, population: '', overview: '', layout: '',
    lodging: '', foodAndDrink: '', equipmentAccess: '', criminalUnderworld: '', lawEnforcement: '',
    specialFacilities: '', campaignRole: '', notes: '',
  };
}

export function createInstallation(id: string, kind: InstallationLocation['kind'] = 'station'): InstallationLocation {
  return {
    id, name: kind === 'station' ? 'New Station' : 'New Installation', kind, purpose: '', location: '',
    occupants: '', isolation: '', facilityIds: [], layout: '', contacts: '', rivals: '', campaignRole: '', notes: '',
  };
}

export function formatCityTownSummary(city: CityTownLocation): string {
  const lines = [`${city.kind === 'city' ? 'City' : 'Town'}: ${city.name || 'Unnamed'}`];
  const values: Array<[string, string]> = [
    ['Population', city.population], ['Overview', city.overview], ['Layout', city.layout], ['Lodging', city.lodging],
    ['Food and drink', city.foodAndDrink], ['Equipment and services', city.equipmentAccess],
    ['Criminal underworld', city.criminalUnderworld], ['Law enforcement', city.lawEnforcement],
    ['Special facilities', city.specialFacilities], ['Campaign role', city.campaignRole], ['Notes', city.notes],
  ];
  for (const [label, value] of values) if (value.trim()) lines.push(`${label}: ${value.trim()}`);
  return lines.join('\n');
}

export function formatInstallationSummary(installation: InstallationLocation): string {
  const lines = [`${installation.kind === 'station' ? 'Station' : 'Installation'}: ${installation.name || 'Unnamed'}`];
  const values: Array<[string, string]> = [
    ['Purpose', installation.purpose], ['Location', installation.location], ['Occupants', installation.occupants],
    ['Isolation', installation.isolation], ['Facilities', facilityNames(installation.facilityIds)],
    ['Layout', installation.layout], ['Contacts', installation.contacts], ['Rivals', installation.rivals],
    ['Campaign role', installation.campaignRole], ['Notes', installation.notes],
  ];
  for (const [label, value] of values) if (value.trim()) lines.push(`${label}: ${value.trim()}`);
  return lines.join('\n');
}

function commodityNames(ids: string[]): string {
  const selected = new Set(ids);
  return TRADE_COMMODITIES.filter((commodity) => selected.has(commodity.id)).map((commodity) => commodity.name).join(', ');
}

function facilityNames(ids: string[]): string {
  const selected = new Set(ids);
  return INSTALLATION_FACILITIES.filter((facility) => selected.has(facility.id)).map((facility) => facility.name).join(', ');
}