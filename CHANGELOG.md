# Changelog

## [0.2.6] - Unreleased

### House rules

- Allow all systems to be extensible like launchers are. Update all json handling to manage this data if it exists, and the UI to show the extension control.
- Support multiple layers of armors of different categories
- Add a Thrust gravity option which doesn't consume HP.

### Ideas

- Bug on assigning and sorting zones.

### Future ideas

- Mods support.
- Add stations.

## [0.2.5] - TODO

### Important

- Save file version is now 1.2. Older saves should migrate automatically.

### Improvements

- Power Plants and Engine section will show how many HP is 5% of the hull.
- Fuel tanks renamed from "Engine/Power/FTL Fuel tank" to "Fuel tank Engine/Power/FTL" so it's easier to distinguish them.
- Fuel tank and power plant/engine chips will explain better what the fuel number represents.

### Fixes

- Bug: artificial gravity with G technology now requires PL6 instead of PL7.
- Bug: some characters were not encoded correctly.

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
