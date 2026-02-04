# Alternity Warships Generator - TODO & Technical Debt

This document tracks technical debt, refactoring opportunities, and planned features.

---

## 1. Missing Features

### Phase 1: Complete Core Features

- [ ] Add real-time validation for HP/Power budgets
- [ ] Show Area of Effect weapons information

### Phase 2: Quality of Life

- [ ] Ship templates from rulebook
- [ ] Variant cloning (duplicate ship)
- [ ] Component search/filter in tables

### Validation Gaps

| Gap | Impact |
| ----- | -------- |
| No HP overflow prevention | Users can over-allocate hull points |
| No power budget enforcement | Systems can exceed power generation |
| No crew capacity validation | Life support vs actual crew needs |
| No fuel endurance calculation | Users can't determine operational range |
| No minimum requirements check | Ship may not meet basic requirements |

---

## 2. Code Quality Issues

Analysis of technical debt and code quality problems in the codebase.

### 2.1 Inconsistencies

| Issue | Location | Description |
|-------|----------|-------------|
| State variable naming | LaunchSystemEditForm.tsx vs OrdnanceSelection.tsx | Uses `quantity` (lowercase) vs `sensorQuantity` - inconsistent naming for the same concept |
| Selectable row styling | WeaponSelection, OrdnanceSelection | `selectableRowSx` constant exists in tableStyles.ts but components define inline hover/cursor styles |
| Event handler unused params | Various components | Mix of `_event`, `_e`, and `_` for unused event parameters |
| 'id' suffix casing | editingInstallationId vs editingSensorId | Inconsistent 'id' vs 'Id' suffix in state variable names |

### 2.2 Magic Numbers/Strings

| Issue | Location | Value | Should Be |
|-------|----------|-------|-----------|
| Computer coverage | commandControlService.ts | `200` | HULL_POINTS_PER_COMPUTER_CORE constant |
| Progress level names | SummarySelection.tsx | Hardcoded PL record | Shared constants file |
| Stepper paper height | App.tsx | `minHeight: 400` | Named constant |

### 2.3 Code Duplication

| Issue | Location | Recommendation |
|-------|----------|----------------|
| WarshipState construction | App.tsx | `buildSaveObject()` and `resetAll()` both construct identical state objects - create helper |
| Stats recalculation | App.tsx | Same service functions called multiple times with same args - memoize results |
| Fuel tank handlers | EngineSelection, PowerPlantSelection | Nearly identical add/edit/remove patterns - could be abstracted |

### 2.4 Error Handling Gaps

| Issue | Location | Risk |
|-------|----------|------|
| JSON parsing without validation | saveService.ts | `loadWarship()` returns parsed JSON as `any` without schema validation |
| Explicit `any` cast | damageDiagramService.ts | Uses eslint-disable for `@typescript-eslint/no-explicit-any` to bypass type checking |

### 2.5 Performance Concerns

| Issue | Location | Impact |
|-------|----------|--------|
| Repeated calculations | App.tsx | `getUsedHullPointsBeforePowerPlants()`, `getRemainingHullPoints()` called multiple times per render |
| Missing useMemo | App.tsx | Stats calculation functions recalculate from scratch each call |
| Inline sx objects | SummarySelection.tsx, others | Large sx objects recreated on every render - should be constants |
| Handler recreation | Most components | Event handlers without useCallback cause unnecessary child re-renders |

### 2.6 Type Safety Issues

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Empty interfaces | weapon.ts, defense.ts, supportSystem.ts | `BeamWeaponType extends BaseWeaponType {}` could be type aliases |
| Type assertions without validation | saveService.ts | Multiple `as` casts assume correct structure |

---

## 3. Test

Use ships from this thread:

https://www.alternityrpg.net/onlineforums/index.php?s=0&showtopic=8562

---

Last updated: February 2026
