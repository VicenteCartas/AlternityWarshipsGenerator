import rulesData from '../data/characterRules.json';
import characterOptionsData from '../data/characterOptions.json';
import mutationsData from '../data/mutations.json';
import cybergearData from '../data/cybergear.json';
import personalEquipmentData from '../data/personalEquipment.json';
import servicesData from '../data/services.json';
import computersData from '../data/computers.json';
import weaponsData from '../data/weapons.json';
import armorData from '../data/armor.json';
import professionsData from '../data/professions.json';
import psionicsData from '../data/psionics.json';
import sourcePacksData from '../data/sourcePacks.json';
import speciesData from '../data/species.json';
import skillsData from '../data/skills.json';
import type {
  AbilityId,
  ArmorDefinition,
  CharacterOptionDefinition,
  CharacterRules,
  CybergearDefinition,
  EquipmentDefinition,
  MutationDefinition,
  ProfessionDefinition,
  PsionicRules,
  PsionicSkillDefinition,
  SkillDefinition,
  SkillRankBenefit,
  SpeciesDefinition,
  WeaponDefinition,
} from '../types/character';
import type { CharacterSourcePackDefinition } from '../types/sourcePack';

const rules = rulesData as unknown as CharacterRules;
const characterOptions = characterOptionsData.options as unknown as CharacterOptionDefinition[];
const mutations = mutationsData.mutations as unknown as MutationDefinition[];
const cybergear = cybergearData.gear as unknown as CybergearDefinition[];
const personalEquipment = personalEquipmentData.equipment as unknown as EquipmentDefinition[];
const computers = computersData.computers as unknown as EquipmentDefinition[];
const services = (servicesData.services as unknown as [string, string, number, number, string | null][])
  .map(([id, name, progressLevel, cost, costUnit]): EquipmentDefinition => ({
    id,
    name,
    sourcePackId: 'phb',
    category: 'service',
    progressLevel,
    mass: null,
    costMode: costUnit?.startsWith('+') ? 'formula' : 'fixed',
    cost,
    costText: costUnit?.startsWith('+') ? `${cost} ${costUnit}` : undefined,
    costUnit: costUnit || undefined,
    effectIds: [],
  }));
const species = speciesData.species as unknown as SpeciesDefinition[];
const professions = professionsData.professions as unknown as ProfessionDefinition[];
const sourcePacks = sourcePacksData.sourcePacks as unknown as CharacterSourcePackDefinition[];
const skills = skillsData.skills as unknown as SkillDefinition[];
const psionicRules = psionicsData.rules as unknown as PsionicRules;
const psionicSkills = psionicsData.skills as unknown as PsionicSkillDefinition[];
const weapons = weaponsData.weapons as unknown as WeaponDefinition[];
const armor = armorData.armor as unknown as ArmorDefinition[];

export function getCharacterRules(): CharacterRules {
  return rules;
}

export function getAllCharacterOptions(): CharacterOptionDefinition[] {
  return characterOptions;
}

export function getCharacterOptionById(id: string): CharacterOptionDefinition | undefined {
  return characterOptions.find((entry) => entry.id === id);
}

export function getAllMutations(): MutationDefinition[] {
  return mutations;
}

export function getMutationById(id: string): MutationDefinition | undefined {
  return mutations.find((entry) => entry.id === id);
}

export function getAllCybergear(): CybergearDefinition[] {
  return cybergear;
}

export function getCybergearById(id: string): CybergearDefinition | undefined {
  return cybergear.find((entry) => entry.id === id);
}

export function getCybergearTrainingSkillPointCost(): number {
  return cybergearData.trainingSkillPointCost;
}

export function getAllPersonalEquipment(): EquipmentDefinition[] {
  return personalEquipment;
}

export function getAllServices(): EquipmentDefinition[] {
  return services;
}

export function getAllComputers(): EquipmentDefinition[] {
  return computers;
}

export function getAllEquipment(): EquipmentDefinition[] {
  return [...personalEquipment, ...services, ...computers];
}

export function getEquipmentById(id: string): EquipmentDefinition | undefined {
  return getAllEquipment().find((entry) => entry.id === id);
}

export function getAllSpecies(): SpeciesDefinition[] {
  return species;
}

export function getSpeciesById(id: string): SpeciesDefinition | undefined {
  return species.find((entry) => entry.id === id);
}

export function getAllProfessions(): ProfessionDefinition[] {
  return professions;
}

export function getProfessionById(id: string): ProfessionDefinition | undefined {
  return professions.find((entry) => entry.id === id);
}

export function getAllCharacterSourcePacks(): CharacterSourcePackDefinition[] {
  return sourcePacks;
}

export function getAllSkills(): SkillDefinition[] {
  return skills;
}

export function getSkillById(id: string): SkillDefinition | undefined {
  return skills.find((entry) => entry.id === id);
}

export function getSkillRankBenefits(skill: SkillDefinition): SkillRankBenefit[] {
  const parentBenefits = skill.parentSkillId
    ? getSkillById(skill.parentSkillId)?.rankBenefits || []
    : [];
  return [...parentBenefits, ...(skill.rankBenefits || [])];
}

export function getBroadSkillsByAbility(ability: AbilityId): SkillDefinition[] {
  return skills.filter((entry) => entry.kind === 'broad' && entry.ability === ability);
}

export function getSpecialtySkillsForBroadSkill(broadSkillId: string): SkillDefinition[] {
  return skills.filter((entry) => entry.kind === 'specialty' && entry.parentSkillId === broadSkillId);
}

export function getPsionicRules(): PsionicRules {
  return psionicRules;
}

export function getAllPsionicSkills(): PsionicSkillDefinition[] {
  return psionicSkills;
}

export function getPsionicSkillById(id: string): PsionicSkillDefinition | undefined {
  return psionicSkills.find((entry) => entry.id === id);
}

export function getPsionicSpecialtySkills(broadSkillId: string): PsionicSkillDefinition[] {
  return psionicSkills.filter((entry) => entry.kind === 'specialty' && entry.parentSkillId === broadSkillId);
}

export function getAllWeapons(): WeaponDefinition[] {
  return weapons;
}

export function getWeaponById(id: string): WeaponDefinition | undefined {
  return weapons.find((entry) => entry.id === id);
}

export function getAllArmor(): ArmorDefinition[] {
  return armor;
}

export function getArmorById(id: string): ArmorDefinition | undefined {
  return armor.find((entry) => entry.id === id);
}