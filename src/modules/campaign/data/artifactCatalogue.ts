import type {
  ArtifactBalancePackage,
  ArtifactDrawbackDefinition,
  ArtifactFormDefinition,
  ArtifactPowerDefinition,
  ArtifactPurposeDefinition,
  ArtifactQuality,
} from '../types/artifact';

const rolls = (start: number, end = start): number[] => (
  Array.from({ length: end - start + 1 }, (_value, index) => start + index)
);

const effects = (
  ordinary: string,
  good: string,
  amazing: string,
): Record<ArtifactQuality, string> => ({ ordinary, good, amazing });

export const ARTIFACT_FORMS: ArtifactFormDefinition[] = [
  {
    id: 'appliance-machine',
    name: 'Appliance or Machine',
    description: 'A substantial installed device, from a console to room-sized machinery.',
    primaryRolls: rolls(1, 3),
    subtypes: [],
  },
  {
    id: 'carried-device',
    name: 'Carried Device',
    description: 'A portable tool, weapon, instrument, or other object carried by one person.',
    primaryRolls: rolls(4, 9),
    subtypes: [
      { id: 'baton', name: 'Baton', rolls: rolls(1, 2) },
      { id: 'book', name: 'Book', rolls: [3] },
      { id: 'disk', name: 'Disk', rolls: [4] },
      { id: 'case-kit', name: 'Case/kit', rolls: [5] },
      { id: 'instrument', name: 'Instrument', rolls: [6] },
      { id: 'pack', name: 'Pack', rolls: [7] },
      { id: 'pistol', name: 'Pistol', rolls: rolls(8, 9) },
      { id: 'rifle', name: 'Rifle', rolls: [10] },
      // G51 prints an overlapping 12 for Shield and Sphere; use 11 for Shield so each d20 result is unique.
      { id: 'shield', name: 'Shield', rolls: [11] },
      { id: 'sphere', name: 'Sphere', rolls: [12] },
      { id: 'staff', name: 'Staff', rolls: [13] },
      { id: 'sword', name: 'Sword', rolls: [14] },
      { id: 'tool-small', name: 'Tool, small', rolls: rolls(15, 16) },
      { id: 'tool-medium', name: 'Tool, medium', rolls: rolls(17, 18) },
      { id: 'tool-large', name: 'Tool, large', rolls: rolls(19, 20) },
    ],
  },
  {
    id: 'clothing-worn',
    name: 'Clothing or Worn Device',
    description: 'A garment, armor piece, accessory, or jewelry worn by the user.',
    primaryRolls: rolls(10, 14),
    subtypes: [
      { id: 'amulet', name: 'Amulet', rolls: rolls(1, 2) },
      { id: 'armor', name: 'Armor', rolls: rolls(3, 5) },
      { id: 'bracelet', name: 'Bracelet', rolls: [6] },
      { id: 'cloak-cape', name: 'Cloak/cape', rolls: rolls(7, 9) },
      { id: 'footwear-boots', name: 'Footwear/boots', rolls: [10] },
      { id: 'handwear-glove', name: 'Handwear/glove', rolls: rolls(11, 12) },
      { id: 'harness-belt', name: 'Harness/belt', rolls: rolls(13, 14) },
      { id: 'headgear-helmet', name: 'Headgear/helmet', rolls: rolls(15, 16) },
      { id: 'jacket-coat', name: 'Jacket/coat', rolls: rolls(17, 18) },
      { id: 'jumpsuit', name: 'Jumpsuit', rolls: [19] },
      { id: 'ring', name: 'Ring', rolls: [20] },
    ],
  },
  {
    id: 'graft-implant',
    name: 'Graft or Implant',
    description: 'Alien technology implanted in or integrated with the user’s body.',
    primaryRolls: rolls(15, 16),
    subtypes: [
      { id: 'right-arm', name: 'Right arm', rolls: rolls(1, 2) },
      { id: 'left-arm', name: 'Left arm', rolls: rolls(3, 4) },
      { id: 'right-leg', name: 'Right leg', rolls: [5] },
      { id: 'left-leg', name: 'Left leg', rolls: [6] },
      { id: 'torso', name: 'Torso', rolls: rolls(7, 10) },
      { id: 'head', name: 'Head', rolls: rolls(11, 14) },
      { id: 'full-skeletal', name: 'Full body, skeletal', rolls: rolls(15, 16) },
      { id: 'full-muscular', name: 'Full body, muscular', rolls: rolls(17, 18) },
      { id: 'full-vascular', name: 'Full body, vascular', rolls: [19] },
      { id: 'full-nervous', name: 'Full body, nervous', rolls: [20] },
    ],
  },
  {
    id: 'procedure-treatment',
    name: 'Procedure or Treatment',
    description: 'A lasting alteration produced by alien training, exposure, or treatment.',
    primaryRolls: rolls(17, 18),
    subtypes: [],
  },
  {
    id: 'site-installation',
    name: 'Site or Installation',
    description: 'A fixed facility or place whose artifact effects cannot be carried away.',
    primaryRolls: [19],
    subtypes: [
      { id: 'well-known', name: 'Well known', rolls: rolls(1, 10) },
      { id: 'not-well-known', name: 'Not well known', rolls: rolls(11, 20) },
    ],
  },
  {
    id: 'vehicle',
    name: 'Vehicle',
    description: 'A mobile artifact too large to carry, whether or not transportation is its main purpose.',
    primaryRolls: [20],
    subtypes: [
      { id: 'ground', name: 'Ground vehicle', rolls: rolls(1, 10) },
      { id: 'water', name: 'Water vehicle', rolls: rolls(11, 15) },
      { id: 'air', name: 'Air vehicle', rolls: rolls(16, 18) },
      { id: 'space', name: 'Space vehicle', rolls: rolls(19, 20) },
    ],
  },
];

export const ARTIFACT_PURPOSES: ArtifactPurposeDefinition[] = [
  { id: 'communication', name: 'Communication', description: 'Exchange information across unusual media or distances.', primaryRolls: rolls(1, 2), secondaryRolls: [1] },
  { id: 'control', name: 'Control', description: 'Command machines, systems, forces, or probability.', primaryRolls: [3], secondaryRolls: [2] },
  { id: 'defense', name: 'Defense', description: 'Shield the user from weapons or harmful forces.', primaryRolls: rolls(4, 6), secondaryRolls: rolls(3, 4) },
  { id: 'environment', name: 'Environment', description: 'Manipulate surrounding physical conditions or concealment.', primaryRolls: rolls(7, 8), secondaryRolls: [5] },
  { id: 'information', name: 'Information', description: 'Analyze, retrieve, or perceive otherwise unavailable knowledge.', primaryRolls: rolls(9, 10), secondaryRolls: [6] },
  { id: 'medical', name: 'Medical', description: 'Heal injury, restore life, or greatly extend biological survival.', primaryRolls: [11], secondaryRolls: [] },
  { id: 'mental-enhancement', name: 'Mental Enhancement', description: 'Improve cognition, personality, will, or simultaneous action.', primaryRolls: [12], secondaryRolls: [] },
  { id: 'offense', name: 'Offense', description: 'Attack targets directly with forces beyond current technology.', primaryRolls: rolls(13, 15), secondaryRolls: rolls(7, 8) },
  { id: 'physical-enhancement', name: 'Physical Enhancement', description: 'Improve the user’s body or environmental adaptation.', primaryRolls: rolls(16, 17), secondaryRolls: [9] },
  { id: 'transmutation', name: 'Transmutation', description: 'Convert, create, or transform matter and energy.', primaryRolls: [18], secondaryRolls: [10] },
  { id: 'transportation', name: 'Transportation', description: 'Move the user through distance, dimensions, or time.', primaryRolls: rolls(19, 20), secondaryRolls: rolls(11, 12) },
];

export const ARTIFACT_POWERS: ArtifactPowerDefinition[] = [
  { id: 'cyberconscious', name: 'Cyberconscious', purpose: 'communication', roll: 1, summary: 'Projects the user’s consciousness into computers and networks.', effects: effects('Contact required; -2 Computer Operation bonus.', '500 m range; -3 bonus.', '50 km range; -4 bonus.') },
  { id: 'empathy', name: 'Empathy', purpose: 'communication', roll: 2, summary: 'Senses emotional states without spending psionic energy.', effects: effects('Once daily as the ESP broad skill.', 'Once hourly as empathy rank 1.', 'Once hourly as empathy rank 6.') },
  { id: 'star-transceiver', name: 'Star Transceiver', purpose: 'communication', roll: 3, summary: 'Creates instantaneous psionic communication across interstellar distances.', effects: effects('10 light-years; 1 minute daily.', '50 light-years; 10 minutes daily.', '500 light-years; 1 hour daily.') },
  { id: 'telepathy', name: 'Telepathy', purpose: 'communication', roll: 4, summary: 'Sends and receives thoughts without psionic energy cost.', effects: effects('Once daily as the Telepathy broad skill.', 'Once hourly as contact rank 1.', 'Once hourly as contact rank 6.') },

  { id: 'cybercontrol', name: 'Cybercontrol', purpose: 'control', roll: 1, summary: 'Interrupts or commands computerized machinery through a skill check.', effects: effects('10 m range; -2 relevant skill bonus.', '100 m range; -3 bonus.', '1 km range; -4 bonus.') },
  { id: 'dark-matter-control', name: 'Dark Matter Control', purpose: 'control', roll: 2, summary: 'Suppresses or destabilizes dark-matter mass reactions in an area.', effects: effects('20 m radius; once daily.', '50 m radius; four uses daily.', '1 km radius; six uses daily.') },
  { id: 'kinetic-control', name: 'Kinetic Control', purpose: 'control', roll: 3, summary: 'Adds or removes kinetic energy from attacks and moving objects.', effects: effects('Adjust damage by 2; affect 100 kg; 20 m; 3 phases daily.', 'Adjust damage by 4; alter speed up to 500 kg; 40 m; 6 phases daily.', 'Adjust damage by 6; immobilize 500 kg or alter 2,000 kg; 12 phases daily.') },
  { id: 'probability-control', name: 'Probability Control', purpose: 'control', roll: 4, summary: 'Manipulates chance around the user for d6 rounds once per day.', effects: effects('-1 bonus to the user’s actions.', '-2 bonus to the user’s actions.', '-3 bonus to the user’s actions.') },

  { id: 'armor', name: 'Armor', purpose: 'defense', roll: 1, summary: 'Absorbs incoming damage before normal armor is applied.', effects: effects('Absorbs d6+1 hits.', 'Absorbs 2d4 hits; Good toughness.', 'Absorbs 2d4+1 hits; Amazing toughness.') },
  { id: 'displacement', name: 'Displacement', purpose: 'defense', roll: 2, summary: 'Bends light so attacks suffer a +2 penalty; mental attacks are unaffected.', effects: effects('3 rounds of use daily.', '6 rounds of use daily.', '12 rounds of use daily.') },
  { id: 'energy-dispersal', name: 'Energy Dispersal', purpose: 'defense', roll: 3, summary: 'Negates energy damage before armor.', effects: effects('Negates 4 per hit; 20 points daily.', 'Negates 6 per hit; 30 points daily.', 'Negates 8 per hit; 40 points daily.') },
  { id: 'kinetic-dispersal', name: 'Kinetic Dispersal', purpose: 'defense', roll: 4, summary: 'Negates low- and high-impact damage before armor.', effects: effects('Negates 4 per hit; 20 points daily.', 'Negates 6 per hit; 30 points daily.', 'Negates 8 per hit; 40 points daily.') },

  { id: 'magnetic-control', name: 'Magnetic Control', purpose: 'environment', roll: 1, summary: 'Creates magnetic fields that hinder metal weapons and hold magnetic objects.', effects: effects('10 m radius; effective STR 14; 5 rounds daily.', '20 m radius; effective STR 16; 10 minutes daily.', '50 m radius; effective STR 20; 1 hour daily.') },
  { id: 'molecular-manipulation', name: 'Molecular Manipulation', purpose: 'environment', roll: 2, summary: 'Changes temperature by regulating molecular activity.', effects: effects('100 kg or 10 m area; +/-5 C.', '500 kg or 20 m area; +/-10 C.', '2,000 kg or 30 m area; +/-20 C.') },
  { id: 'photonic-manipulation', name: 'Photonic Manipulation', purpose: 'environment', roll: 3, summary: 'Creates illumination, darkness, color shifts, or interference with light-based systems.', effects: effects('100 m range; 10 m radius; 10 minutes daily.', '400 m range; 20 m radius; 30 minutes daily.', '1 km range; 40 m radius; 4 hours daily.') },
  { id: 'stealth-field', name: 'Stealth Field', purpose: 'environment', roll: 4, summary: 'Bends electromagnetic energy to hide objects; motion leaves a visible shimmer.', effects: effects('1 m radius; 5 minutes daily.', '4 m radius; 20 minutes daily.', '6 m radius; 2 hours daily.') },

  { id: 'analysis', name: 'Analysis', purpose: 'information', roll: 1, summary: 'Analyzes a target or 6 m area and grants a -3 related Science or Investigate bonus.', effects: effects('Completely analyzes energy forms and relationships.', 'Also analyzes inanimate matter and compounds.', 'Also analyzes living organisms.') },
  { id: 'omnidata-computer', name: 'Omnidata Computer', purpose: 'information', roll: 2, summary: 'Provides a vast alien data store with an effective Knowledge score.', effects: effects('Knowledge score 12.', 'Knowledge score 15.', 'Knowledge score 18.') },
  { id: 'precognition', name: 'Precognition', purpose: 'information', roll: 3, summary: 'Provides a warning or vision of a possible future through Awareness-intuition.', effects: effects('-2 intuition bonus.', '-3 intuition bonus.', '-4 intuition bonus.') },
  { id: 'postcognition', name: 'Postcognition', purpose: 'information', roll: 4, summary: 'Shows past events visible from the user’s current location, once daily.', effects: effects('Looks back up to 10 days.', 'Looks back up to 1 year.', 'Can reveal anything that ever happened there.') },

  { id: 'healing-touch', name: 'Healing Touch', purpose: 'medical', roll: 1, summary: 'Heals another creature without spending psionic energy.', effects: effects('Once daily as the Biokinesis broad skill.', 'Once hourly as heal rank 1.', 'Once hourly as heal rank 6.') },
  { id: 'immortality', name: 'Immortality', purpose: 'medical', roll: 2, summary: 'Extends lifespan and improves survival of mortal damage.', effects: effects('Fivefold lifespan; -2 mortal endurance bonus.', 'Tenfold lifespan; -4 bonus.', 'Unlimited lifespan; automatic mortal endurance success; death requires bodily annihilation or a chosen vulnerability.') },
  { id: 'regenerator', name: 'Regenerator', purpose: 'medical', roll: 3, summary: 'Repairs one point in each damage category per round, including lost limbs and paralysis.', effects: effects('6 rounds of regeneration daily.', '9 rounds daily.', '12 rounds daily.') },
  { id: 'resuscitator', name: 'Resuscitator', purpose: 'medical', roll: 4, summary: 'Lets a deceased target attempt Resolve-mental resolve to return to life.', effects: effects('-1 check bonus; Ordinary recovery restores 1 mortal point.', '-2 bonus; Good recovery leaves 1 mortal point.', '-3 bonus; Amazing recovery restores mortal damage plus 1 wound and stun.') },

  { id: 'heightened-intelligence', name: 'Heightened Intelligence', purpose: 'mental-enhancement', roll: 1, summary: 'Raises Intelligence.', effects: effects('+1 INT.', '+2 INT.', '+3 INT.') },
  { id: 'heightened-personality', name: 'Heightened Personality', purpose: 'mental-enhancement', roll: 2, summary: 'Raises Personality.', effects: effects('+1 PER.', '+2 PER.', '+3 PER.') },
  { id: 'heightened-will', name: 'Heightened Will', purpose: 'mental-enhancement', roll: 3, summary: 'Raises Will.', effects: effects('+1 WIL.', '+2 WIL.', '+3 WIL.') },
  { id: 'multitasking', name: 'Multitasking', purpose: 'mental-enhancement', roll: 4, summary: 'Improves Action Check and permits simultaneous actions.', effects: effects('-1 Action Check bonus; two related actions together.', '-2 bonus; two unrelated actions together.', '-3 bonus; three unrelated actions together.') },

  { id: 'anti-life-ray', name: 'Anti-life Ray', purpose: 'offense', roll: 1, summary: 'Emits armor-ignoring bioelectric disruption with Ordinary firepower.', effects: effects('Single target at 20 m; once daily.', '1 m by 40 m path; three uses daily.', '2 m by 60 m path; six uses daily.') },
  { id: 'dark-matter-attack', name: 'Dark Matter Attack', purpose: 'offense', roll: 2, summary: 'Forms dark-matter bolts or blades, usable once per hour.', effects: effects('2d4s/2d4w/d6m En/G; 100 m.', '3d4s/3d4w/2d4m En/G; 200 m.', '3d4s/3d4w/2d4m En/A; 500 m.') },
  { id: 'disintegration-field', name: 'Disintegration Field', purpose: 'offense', roll: 3, summary: 'Breaks matter into particles; d4m/d6m/d8m En/G by success and ignores armor.', effects: effects('20 m; once daily.', '50 m; once per 6 hours.', '100 m; once per hour.') },
  { id: 'gravity-generation', name: 'Gravity Generation', purpose: 'offense', roll: 4, summary: 'Moves or crushes targets with directional gravity for up to 12 phases daily.', effects: effects('100 kg at 50 m.', '500 kg at 100 m.', '2,000 kg at 200 m.') },

  { id: 'heightened-constitution', name: 'Heightened Constitution', purpose: 'physical-enhancement', roll: 1, summary: 'Raises Constitution.', effects: effects('+1 CON.', '+2 CON.', '+3 CON.') },
  { id: 'heightened-dexterity', name: 'Heightened Dexterity', purpose: 'physical-enhancement', roll: 2, summary: 'Raises Dexterity.', effects: effects('+1 DEX.', '+2 DEX.', '+3 DEX.') },
  { id: 'heightened-strength', name: 'Heightened Strength', purpose: 'physical-enhancement', roll: 3, summary: 'Raises Strength.', effects: effects('+1 STR.', '+2 STR.', '+3 STR.') },
  { id: 'hyper-adaptation', name: 'Hyper Adaptation', purpose: 'physical-enhancement', roll: 4, summary: 'Adapts the user to hostile GRAPH conditions while ordinary needs still apply.', effects: effects('Offsets up to 2 environmental grades.', 'Offsets up to 4 grades.', 'Offsets up to 8 grades.') },

  { id: 'elemental-conversion', name: 'Elemental Conversion', purpose: 'transmutation', roll: 1, summary: 'Converts one chemical element into another once daily.', effects: effects('10 m; 10 kg or 1,000 cubic meters of gas; 1 hour.', '50 m; 100 kg or 10,000 cubic meters; 6 hours.', '200 m; 1,000 kg or 100,000 cubic meters; 1 day.') },
  { id: 'molecular-transformation', name: 'Molecular Transformation', purpose: 'transmutation', roll: 2, summary: 'Creates or breaks molecular compounds from existing matter once daily; complex changes use Physical Science-chemistry.', effects: effects('10 m; 10 kg or 1,000 cubic meters of gas.', '50 m; 100 kg or 10,000 cubic meters of gas.', '200 m; 1,000 kg or 100,000 cubic meters of gas.') },
  { id: 'oxidation-reduction', name: 'Oxidation/Reduction', purpose: 'transmutation', roll: 3, summary: 'Rapidly corrodes objects or ignites flammable matter, three uses daily.', effects: effects('40 m; 6/4/2 m effect radii by success.', 'Higher damage at the same range and radii.', '200 m; 12/8/4 m effect radii.') },
  { id: 'virtual-matter-creation', name: 'Virtual Matter Creation', purpose: 'transmutation', roll: 4, summary: 'Creates temporary nonmechanical, nonelectronic simulated matter.', effects: effects('Up to 10 kg; 10 minutes daily.', 'Up to 100 kg; 1 hour.', 'Up to 1,000 kg; 6 hours.') },

  { id: 'carrier-wave', name: 'Carrier Wave', purpose: 'transportation', roll: 1, summary: 'Converts user and gear into an electrical, photonic, acoustic, seismic, or psionic wave.', effects: effects('Once daily for up to 1 minute.', 'Five uses daily, up to 10 minutes each.', 'Once per 2 hours, up to 15 minutes each.') },
  { id: 'dimensional-shift', name: 'Dimensional Shift', purpose: 'transportation', roll: 2, summary: 'Moves through an insubstantial parallel dimension at ten times normal distance.', effects: effects('User and carried gear; up to 1 hour daily.', 'Up to 6 people or 1,000 kg; 4 hours daily.', 'Up to 20 people or 20 metric tons; 12 hours daily.') },
  { id: 'time-travel', name: 'Time Travel', purpose: 'transportation', roll: 3, summary: 'Moves users through time as a campaign-scale story effect.', effects: effects('Up to 1 year into past or future.', 'Up to 100 years.', 'Any time period.') },
  { id: 'teleportation', name: 'Teleportation', purpose: 'transportation', roll: 4, summary: 'Instantly crosses intervening space while retaining velocity; three uses daily.', effects: effects('1 km; user and carried gear.', '10 km; plus 100 kg.', '100 km; plus 1,000 kg.') },
];

export const ARTIFACT_DRAWBACKS: ArtifactDrawbackDefinition[] = [
  { id: 'blackouts', name: 'Blackouts', roll: 1, summary: 'A condition causes stun loss and unconsciousness.', effects: { slight: 'Unusual trigger every two or three adventures.', moderate: 'Trigger occurs about once per adventure.', extreme: 'Trigger is likely several times per adventure.' } },
  { id: 'compulsory-behavior', name: 'Compulsory Behavior', roll: 2, summary: 'The artifact imposes an ongoing behavioral condition that Will can temporarily suppress.', effects: { slight: 'Rarely inconvenient except in unusual situations.', moderate: 'Forces unwanted actions but rarely removes the hero from play.', extreme: 'Forces action against the hero’s interests at least once per adventure.' } },
  { id: 'damping-field', name: 'Damping Field', roll: 3, summary: 'Artifact use may drain nearby power sources instead of helping the user.', effects: { slight: '50% on use; 10 m radius for 1 minute.', moderate: '75% on use; 20 m radius for 1 hour.', extreme: '90% on use and can trigger on Critical Failure; 50 m for 1 day.' } },
  { id: 'decreased-ability', name: 'Decreased Ability', roll: 4, summary: 'A persistent alien side effect lowers one Ability Score.', effects: { slight: '-1 to the chosen Ability.', moderate: '-2 to the chosen Ability.', extreme: '-3 to the chosen Ability.' } },
  { id: 'degeneration', name: 'Degeneration', roll: 5, summary: 'Alien radiation or microbes periodically threaten illness through Constitution checks.', effects: { slight: 'Check once per adventure or month.', moderate: 'Check whenever powers are used or a skill check critically fails.', extreme: 'As Moderate, with +3 penalty on the initial Constitution check.' } },
  { id: 'disruptive-consciousness', name: 'Disruptive Consciousness', roll: 6, summary: 'Activation inflicts psychic trauma, causing +2 to actions for d6 hours or the scene.', effects: { slight: 'Only the user is affected.', moderate: 'All creatures within 6 m are affected.', extreme: 'All creatures within 20 m are affected.' } },
  { id: 'energy-cost', name: 'Energy Cost', roll: 7, summary: 'The device drains the user’s bioelectric energy while operating.', effects: { slight: '1 stun per unit of use.', moderate: '2 stuns per unit.', extreme: '3 stuns per unit.' } },
  { id: 'infamous-device', name: 'Infamous Device', roll: 8, summary: 'Powerful enemies, cults, or authorities continually seek the artifact.', effects: { slight: 'Serious pursuit every two or three adventures.', moderate: 'A threat or theft attempt every adventure.', extreme: 'The artifact broadcasts or displays a feature that makes concealment impossible.' } },
  { id: 'leech', name: 'Leech', roll: 9, summary: 'Like Energy Cost, but drains wound points from a randomly selected nearby creature.', effects: { slight: 'Drains 1 wound per unit of use.', moderate: 'Drains 2 wounds per unit.', extreme: 'Drains 3 wounds per unit.' } },
  { id: 'mental-instability', name: 'Mental Instability', roll: 10, summary: 'The device provokes periodic Resolve-mental resolve checks against serious disorders.', effects: { slight: 'Check once per adventure or month.', moderate: 'Check on power use or a Critical Failure.', extreme: 'As Moderate, with +3 penalty on the Resolve check.' } },
  { id: 'power-spike', name: 'Power Spike', roll: 11, summary: 'Failed artifact use shuts down or destroys nearby powered equipment.', effects: { slight: 'Affected device is disabled for d6 hours.', moderate: 'Affected device is damaged until repaired.', extreme: 'Affected item is ruined and must be replaced.' } },
  { id: 'uncontrolled-function', name: 'Uncontrolled Function', roll: 12, summary: 'The artifact may refuse commands or activate harmfully after Critical Failures.', effects: { slight: '1-in-4 refusal; 1-in-6 erroneous activation after a Critical Failure.', moderate: 'Erroneous activation chance becomes 2-in-6.', extreme: 'Erroneous activation chance becomes 3-in-6.' } },
];

const balance = (
  acquisition: ArtifactBalancePackage['acquisition'],
  roll: number,
  primary: ArtifactBalancePackage['primaryPowers'],
  secondary: ArtifactBalancePackage['secondaryPowers'],
  drawbacks: ArtifactBalancePackage['drawbacks'],
): ArtifactBalancePackage => ({ acquisition, roll, primaryPowers: primary, secondaryPowers: secondary, drawbacks });

const power = (quality: ArtifactQuality, count: number) => ({ quality, count });
const drawback = (severity: 'slight' | 'moderate' | 'extreme', count: number) => ({ severity, count });

export const ARTIFACT_BALANCE_PACKAGES: ArtifactBalancePackage[] = [
  balance('perk', 1, [power('ordinary', 1)], [], []),
  balance('perk', 2, [power('ordinary', 1)], [power('ordinary', 1)], []),
  balance('perk', 3, [power('ordinary', 2)], [power('ordinary', 1)], [drawback('slight', 1)]),
  balance('perk', 4, [power('good', 1)], [power('ordinary', 1)], [drawback('slight', 1)]),
  balance('perk', 5, [power('good', 2)], [power('ordinary', 1)], [drawback('slight', 2)]),
  balance('perk', 6, [power('amazing', 1)], [power('ordinary', 1)], [drawback('moderate', 1)]),
  balance('perk', 7, [power('amazing', 1)], [power('good', 1)], [drawback('moderate', 1), drawback('slight', 1)]),
  balance('perk', 8, [power('amazing', 2)], [power('good', 1)], [drawback('moderate', 2)]),
  balance('flaw', 1, [], [], [drawback('moderate', 1)]),
  balance('flaw', 2, [power('ordinary', 1)], [], [drawback('moderate', 1), drawback('slight', 1)]),
  balance('flaw', 3, [power('ordinary', 1)], [power('ordinary', 1)], [drawback('moderate', 2)]),
  balance('flaw', 4, [power('ordinary', 2)], [power('ordinary', 1)], [drawback('moderate', 2), drawback('slight', 1)]),
  balance('flaw', 5, [power('good', 1)], [power('ordinary', 1)], [drawback('extreme', 1), drawback('slight', 1)]),
  balance('flaw', 6, [power('good', 2)], [power('ordinary', 1)], [drawback('extreme', 1), drawback('moderate', 1)]),
  balance('flaw', 7, [power('amazing', 1)], [power('ordinary', 1)], [drawback('extreme', 2), drawback('moderate', 1)]),
  balance('flaw', 8, [power('amazing', 1)], [power('good', 1)], [drawback('extreme', 3), drawback('moderate', 1)]),
];
