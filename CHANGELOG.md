# Changelog

## [0.2.5] - TODO

### Bug Fixes

- Fixed "Browse Folder" dialog in the Ship Library (and Craft Picker) opening to a default OS location instead of the currently selected library folder. The directory picker now defaults to the current library path.
- The Craft Picker dialog (for hangars and docking clamps) now pre-filters designs that violate berthing rules: hangars hide craft >= 100 HP, docking clamps hide craft exceeding 10% of the carrier's hull HP.
- Fixed random crash during drag-and-drop in the Damage Zones step caused by the canonical name sync effect leaking a `changed` flag across zone iterations, causing unnecessary zone object recreation and cascading state recomputation during active drags. Now uses per-zone change tracking.
- Fixed weapons being movable to arc-incompatible zones via zone-to-zone drag-and-drop (arc compatibility was only checked for pool-to-zone drags).
- Zone-to-zone weapon drags now show arc incompatibility visual feedback (red border, blocked cursor) matching pool-to-zone drag behavior.
- Drag-and-drop event handlers now include try-catch guards to prevent uncaught exceptions from crashing the app. Drop cleanup (drag state reset) now runs in a `finally` block to prevent stuck drag state on errors.
- Fixed fixedCoverage screens (Magnetic Screen, Deflection Inducer, Particle Screen) being unassignable on large ships where total HP exceeds the zone limit. Screens can now be split into 2 or 4 sections for independent zone assignment.

### New Features

- **Accelerator & Heavy Accelerator Weapons**: Added the Accelerator (PL 7) and Heavy Accelerator (PL 7) as projectile weapons. These hybrid weapons use a linear accelerator to throw unguided warheads at the enemy. Each has an integrated magazine measured in warhead size points (16 for Accelerator, 32 for Heavy Accelerator) that can be expanded with extra HP. Warheads are loaded directly from the warhead table — no propulsion or guidance needed. The magazine UI appears inline when editing an installed accelerator, following the same pattern as ordnance launchers.
- **Data-Driven Weapon Magazines**: Any weapon (including modded weapons) can have an integrated magazine by setting `magazineCapacity` and `maxWarheadSize` fields. The expandable magazine mechanic uses the existing `expandable`/`expansionValuePerHp`/`expansionCostPerHp` system. Modders can create custom accelerator-type weapons entirely through the Mod Editor UI.
- **Defense System Splitting**: Fixed-coverage screens that exceed the zone limit now show an "Exceeds Zone Limit" warning chip and offer Split ×2 / Split ×4 buttons. Splitting creates sub-sections that appear independently in the Damage Zones step, while remaining a single system for removal/cost/power purposes. A Merge button allows reverting to the unsplit state.
- **Per-System Embarked Craft**: Hangars and docking clamps now manage their own craft individually (like ordnance in launchers). Each installed hangar/docking clamp has its own loadout, with capacity tracking, add/remove controls, and inline craft management. When a system is destroyed in a damage zone, you know exactly which craft were in it. The previous pooled embarked craft system has been replaced.
- **Magazine Ordnance Loading**: Magazines now track their loaded ordnance individually (like launchers). Each installed magazine shows its loadout summary, capacity chip, and an inline ordnance loading form when editing — with the same +1/+5/+10/Max controls as launchers.

### UI

- Reordered welcome page buttons: Browse Library now appears before Load Design.
- Removed compact Combat Reference PDF export option. The full ship sheet export already covers all combat data — users can print only the pages they need.

### Important

- Save file version is now 1.2. Older saves (1.0 and 1.1) migrate automatically.

### Mod System

Full mod support added. Mods live in the user data folder and are managed through a dedicated Mod Manager screen.

- Create mods that overwrite any component from the Warships sourcebook.
- Create your own custom components and systems.
- Custom systems can be added alongside Warships data, or replace it entirely for total conversions.
- Multiple armor types in a single ship can be enabled or disabled via mods.
- Weapon configurations and mounts can be modified.
- Support systems can be made expandable (HP-based sizing) like launchers.
- Mod validation with clear error reporting.

### New Features

- **Ship Library:** Browse and search all saved designs with thumbnail cards showing key stats (hull, HP, power, cost, class). Filter by name, hull class, and progress level. Scan any directory for saved designs.
- **Stations & Bases:** Full support for space stations, ground bases, and outposts. Ground bases can have breathable atmosphere and natural gravity. Outposts must provide their own life support. Space stations have optional engines/FTL.
- **Ordnance Design Sharing:** Export and import ordnance designs independently for reuse across ships.
- **Carrier Complement:** Assign saved small-craft designs to hangars and docking clamps. Warns if the referenced file is missing. Validates rules (hangars: craft < 100 HP; docking: craft ≤ 10% carrier hull). Craft costs roll up into the carrier's total cost and appear in Summary, Copy Stats, and PDF export.
- **Damage Diagram Redesign:** New UI for assigning systems to damage zones with keyboard shortcuts for quick assignment.
- **Light/Dark Theme:** Light theme option with system preference detection.
- **Undo/Redo:** Full undo/redo history for all design changes.
- **Keyboard Shortcuts:** Dialog listing all available shortcuts (Ctrl+S, Ctrl+Z/Y, damage zone keys, etc.).
- **Auto-save / Crash Recovery:** Periodic auto-save to a temp location. Offers recovery on relaunch after a crash.
- **Clone/Duplicate Design:** Duplicate the current design to create variants without rebuilding from scratch.
- **Budget Visualization:** Bar charts showing HP, Power, and Cost allocation by category in the Summary tab.
- **Compact Combat Reference Sheet:** 1-page PDF optimized for the game table with weapons, defenses, damage track, fire arcs, and key stats.
- **Copy Stats to Clipboard:** One-click formatted text for forums, Discord, or campaign docs.
- **Fire Control & Sensor Control Validation:** Warnings when weapons lack fire control, fire controls have no linked weapons, or sensors lack sensor control (and vice versa).
- **Ship Description Fields:** Optional metadata: faction, role, commissioning date, classification, manufacturer. Freeform lore text preserved.

### Improvements

- Accessibility improvements: keyboard navigation for fire arc selection, color + icon indicators for color-blind support.
- Empty state messages in all steps to guide new users.
- Computer core prerequisite guidance in Command & Control.
- Fuel tank tooltips explaining what the fuel number represents.
- Confirmation dialogs for all destructive bulk operations (Clear All, Remove All, Unassign All).
- Hull change warning that all systems will be removed.
- Dependency removal warnings (e.g. removing a power plant that causes a power deficit).
- Wide tables use horizontal scroll with a sticky first column across all steps.
- Welcome page with a collapsible "Getting Started" section for new users.
- PDF export shows a progress indicator during generation.
- Info banners when ground bases have breathable atmosphere or natural gravity.
- Power Plants and Engine sections show how many HP is 5% of the hull for minimum size reference.
- Fuel tanks renamed from "Engine/Power/FTL Fuel tank" to "Fuel tank Engine/Power/FTL" for easier identification.
- Step count indicator (N/M) in the stepper.
- Issues tab in Summary is always visible.
- Dozens of other minor UI and performance improvements.

### Fixes

- Bug: artificial gravity with G technology now requires PL6 instead of PL7.
- Bug: some characters were not encoded correctly.
- Bug: missing state variable in Engine step caused a runtime error.
- Bug: PDF damage track boxes (mortal/critical) not rendering when they overflow to a new page.
- Bug: PDF total cost was missing ordnance design costs (only launcher hardware was counted).

### UI

- Summary Description tab: reorganized layout — metadata and image side by side at the top, full-width lore text area below.
- PDF export reorganized into BattleTech TRO-style layout: (1) Lore & Identity, (2) Systems Detail, (3) Combat Sheet (weapons + defenses combined), (4) Damage Zones.
- Removed fire arcs diagram from PDF Combat Sheet — arc data is already in the weapons table.
- PDF Lore & Identity page: metadata fields now render in two columns (Faction/Manufacturer/Commissioned left, Classification/Role right).
- PDF combat tables: Sensors and Weapons first column renamed to "Name" with consistent width across all three tables. Column order for Sensors: Name, Range, Arcs, Control, Accuracy, Tracking, Qty. Column order for Weapons: Name, Range, Arcs, FC, Accuracy, Type/FP, Damage, Qty. Sensor accuracy now displays as a number (+3, 0, etc.) instead of text. Ordnance table: removed Cost column, redistributed space to Damage and Area columns.
- Sensors now require explicit arc assignment using the same arc selector as weapons (standard arcs only, no zero-range). Old saves auto-assign default arcs on load with a migration warning.
- Summary Systems tab now shows sensor arc assignments in brackets, matching weapon display format.
- PDF Combat Sheet: sensor and weapon tables now use consistent column order and short arc abbreviations (F S A P) with spaces between letters.
- PDF Systems Detail: ordnance loaded in launchers now shows per-design cost; a separate "Ordnance" summary row shows total ordnance cost. Embarked Craft costs already displayed.

### Code Quality

- Removed `as unknown` type casts in production code: widened event handler type in EditableDataGrid, centralized data boundary casts in dataLoader and ModEditor with typed helpers.

## [0.2.4] - 02/11/2025

### Important

- Save file version is now 1.1. Older saves should migrate automatically.

### Fixes

- Bug: when a system contains multiple tech tracks now it only gets filtered out if none of the tracks are selected on the tech track filter.
- Bug: auto/burst weapons were assigned the wrong fire modes and were duplicated. So now instead of Laser (Auto) or Laser (Burst), it is Laser (Mod) with B/A fire modes.
- Bug: multiple UI bugs with Add/Edit dialogs not having the correct styling.
- Bug: PDF damage will not get cut in weapon and ordnance lists.
- Bug: PDF launchers will now show their associate ordnance.

### Improvements

- [Data] The View menu now contains "View Data Files" which opens the file explorer in the folder with the .json data files.
- [Data] Crew and troops are now two different categories. Added new accommodations to support carrying troops separated from crew.
- [Data] Added a new stateroom for crew/troops that can support 4 people to duplicate the second class passenger suites.
- [UI] Reviewed all Add/Edit forms.
- [UI] Reviewed and updated all Installed systems lists.
- [UI] Add a duplicate system button for Installed systems.
- [PDF] PDF now prints how many troops, passengers or suspended a ship carries.
- [PDF] PDF now prints detailed systems list (optional).

## [0.2.3] - 2/8/2026

### Fixes

- Bugs: addressed multiple issues with data representation of hp, power and cost.
- Bug: addressed hardcoded values for guns configurations.
- Bug: light armor was using 2.5% HP for size instead of 0% HP (cost stays at 2.5%).
- Bug: weapons now round to the nearest 0.5HP for their size, rounded down.
- Bug: ordnance launchers now show their associated fire control.
- Bug: PDF damage tables were rendering their dice rolls incorrectly.
- Bug: PDF damage zones were not showing all their elements.

### Improvements

- [Export] Multiple changes on PDF printing. Ship is now divided in 4 sections: information, damage diagrams, defenses, and weapons. Each on its own page/pages. Damage zones are now visually organized like a real ship.

## [0.2.2] - 2/6/2026

### Fixes

- Fix the release number.
- Bug: PowerPlants power generation is no longer rounded.
- Bug: correct acceleration calculation with engines less than 5% of the ship size.
- Bug: Repair systems power cost is now based on the system size, not on the ship size.
- Bug: ordnance launchers data was incorrect in the json data file.
- Bug: launchers now appear in the possible systems that can use fire control.
- Bug: sensor and fire control installed systems were missing the edit button.
- Bug: computer cores could be set to invalid sizes.
- Bug: ships can now have more than 1 computer core.
- Bug: multiple of the same support system can now be installed.
- Bug: logo was not referenced correctly.

### Additions

- Mac and Linux builds

## [0.2.1] - 2026-02-04

### Added

- First public release. Implements all construction rules.
