# Modding Guide

The Alternity Warship Generator supports **mods** that let you customize, add, or replace game data. You can create new hulls, weapons, armor types, engines, and more — or tweak the stats of existing items to match your campaign's house rules.

## Overview

Mods are stored as folders inside your user data directory:

```
<userData>/mods/<mod-folder-name>/
├── mod.json           ← Mod manifest (name, author, version, description, merge modes)
├── hulls.json         ← (optional) Hull data overrides/additions
├── weapons.json       ← (optional) Weapon data overrides/additions
├── armor.json         ← (optional) Armor data overrides/additions
└── ...                ← Any of the 14 supported data files
```

You can find your mods directory from the **Mod Manager** screen (the folder path is shown at the top).

## Quick Start

1. Open the app and go to **Mod Manager** (via the menu or toolbar)
2. Click **Create Mod** and fill in the name, author, version, and description
3. Click **Edit** on your new mod to open the **Mod Editor**
4. Select a data section in the left sidebar (e.g., Beam Weapons)
5. Click **Import from Base Game** to copy existing items into your mod for editing
6. Edit the values in the grid — changes are highlighted with validation
7. Click **Save** when you're done
8. **Enable** your mod in the Mod Manager
9. When creating a new warship design, select your mod in the **Design Type** dialog

> **Important:** Mods are selected when you create a new design and cannot be changed afterward. This ensures design integrity.

## Merge Modes

Each data section in your mod can use one of two merge modes:

### Add Mode (default)
- New items (unique IDs) are **added** to the base data
- Items with matching IDs **override** the base version
- Base items not in your mod remain unchanged

### Replace Mode
- Your mod data **completely replaces** that section
- All base items are removed; only your mod's items exist
- Use this when you want full control over a section (e.g., a total weapon overhaul)

You can set the merge mode per-section using the toggle in the Mod Editor header.

## Data Files & Sections

Mods can modify any of these 14 data files, each containing one or more data sections:

| Data File | Sections |
|-----------|----------|
| `hulls.json` | Ship Hulls, Station Hulls |
| `armor.json` | Armor Types, Armor Weights |
| `powerPlants.json` | Power Plants |
| `fuelTank.json` | Fuel Tank |
| `engines.json` | Engines |
| `ftlDrives.json` | FTL Drives |
| `supportSystems.json` | Life Support, Accommodations, Store Systems, Gravity Systems |
| `weapons.json` | Beam Weapons, Projectile Weapons, Torpedo Weapons, Special Weapons, Mount Modifiers, Gun Configurations, Concealment Modifier |
| `ordnance.json` | Launch Systems, Propulsion Systems, Warheads, Guidance Systems |
| `defenses.json` | Defense Systems |
| `sensors.json` | Sensors |
| `commandControl.json` | Command & Control |
| `hangarMisc.json` | Hangars & Misc |
| `damageDiagram.json` | Damage Diagram |

## Item IDs

Every item must have a unique **ID** in kebab-case format:

- ✅ `my-custom-laser`, `heavy-cruiser-mk2`, `plasma-cannon`
- ❌ `My Custom Laser`, `heavyCruiserMk2`, `PLASMA_CANNON`

IDs are how the merge system matches your mod items to base game items:
- **Same ID as a base item** → your version replaces it
- **New ID** → added as a new item

## House Rules

Some mods can also toggle **house rules** — special boolean flags that change game mechanics:

- **Allow Multiple Armor Layers** — Ships can install one armor type per weight category simultaneously

House rules are edited in the dedicated "House Rules" section of the Mod Editor.

## Mod Priority

When multiple mods are enabled, they're applied in **priority order** (lowest first). Higher-priority mods win ID conflicts. You can adjust priority in the Mod Manager using the priority controls.

## Validation

The Mod Editor validates your data as you edit:
- **Red cell borders** indicate field-level errors (missing required fields, invalid format, etc.)
- **Duplicate ID** warnings appear when two rows share the same ID
- Use the **Validate** button to check all sections at once before saving
- Validation also runs automatically when you save

## Sharing Mods

### Export
Click **Export** in the Mod Manager to save your mod as a `.altmod.json` file. This single file bundles the manifest and all data files for easy sharing.

### Import
Click **Import Mod** in the Mod Manager and select an `.altmod.json` file. The mod will be installed into your mods directory.

### Manual Sharing
You can also copy mod folders directly. Each mod is a self-contained folder with a `mod.json` manifest and optional data files.

## Tips

- **Import from Base Game** copies base items into your mod for editing. Items with matching IDs will be overridden — this is the easiest way to tweak existing items.
- **Import from Active Mods** lets you pull in changes from other enabled mods (only shows items that differ from base data).
- Use **Ctrl+Z** / **Ctrl+Y** to undo/redo changes in the data grid.
- The **Move Up/Down** arrows let you reorder items if order matters.
- You can **duplicate** rows to quickly create variants of existing items.
- Click column headers with dotted underlines to see field descriptions.

## File Format Reference

### mod.json (Manifest)

```json
{
  "name": "My Awesome Mod",
  "author": "Your Name",
  "version": "1.0.0",
  "description": "Adds new weapons and rebalances existing hulls.",
  "fileModes": {
    "beamWeapons": "add",
    "hulls": "replace"
  }
}
```

### Data Files

Data files mirror the base game's JSON structure. For example, a `weapons.json` adding a custom beam weapon:

```json
{
  "beamWeapons": [
    {
      "id": "my-mega-laser",
      "name": "Mega Laser",
      "progressLevel": 7,
      "techTracks": ["G"],
      "hp": 4,
      "cost": 15,
      "power": 3,
      "firepower": "6d8",
      "range": "20/40/—",
      "rateOfFire": 1,
      "arcs": 1,
      "description": "A devastating laser weapon of my own design."
    }
  ]
}
```

Use the **Import from Base Game** feature in the editor to see the exact field structure for any section — this is the easiest way to learn the format.
