# Changelog

## [0.2.4] - Unreleased

### Todo

- Add an option to open the folder with the data files so user can edit them
- House rules: allow all systems to be extensible like launchers are. Update all json handling to manage this data if it exists, and the UI to show the extension control.

## [0.2.3] - Unreleased

### Fixes

- Bugs: addressed multiple issues with data representation of hp, power and cost.
- Bug: addressed hardcoded values for guns configurations.
- Bug: light armor was using 2.5% HP for size instead of 0% HP (cost stays at 2.5%).
- Bug: weapons now round to the nearest 0.5HP for their size, rounded down.
- Bug: ordnance launchers now show their associated fire control.
- Bug: PDF damage tables were rendering their dice rolls incorrectly.
- Bug: PDF damage zones were not showing all their elements.

### Improvements

- Multiple changes on PDF printing. Ship is now divided in 4 sections: information, damage diagrams, defenses, and weapons. Each on its own page/pages. Damage zones are now visually organized like a real ship.

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
