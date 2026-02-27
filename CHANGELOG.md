# Changelog

## [0.2.5] - TODO

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

### UI

- Summary Description tab: reorganized layout — metadata and image side by side at the top, full-width lore text area below.
- PDF export reorganized into BattleTech TRO-style layout: (1) Lore & Identity, (2) Systems Detail, (3) Combat Sheet (weapons + defenses combined), (4) Damage Zones.
- Removed fire arcs diagram from PDF Combat Sheet — arc data is already in the weapons table.
- PDF Lore & Identity page: metadata fields now render in two columns (Faction/Manufacturer/Commissioned left, Classification/Role right).
- Sensors now require explicit arc assignment using the same arc selector as weapons (standard arcs only, no zero-range). Old saves auto-assign default arcs on load with a migration warning.
- Summary Systems tab now shows sensor arc assignments in brackets, matching weapon display format.
- PDF Combat Sheet: sensor and weapon tables now use consistent column order and short arc abbreviations (F S A P) with spaces between letters.

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
