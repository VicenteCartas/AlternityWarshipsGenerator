# Next Steps — Code Quality

Source of truth for code improvements, cleanup, and refactoring opportunities.

## Overall Assessment

The codebase is architecturally sound with clean data flow (JSON → dataLoader → services → components), zero `any` types, zero `TODO/HACK/FIXME` markers, no circular imports, and strict TypeScript throughout. The main issues are scale-related: as features were added, repetitive patterns accumulated instead of being abstracted. The single biggest concern is `App.tsx` as a god component.

---

## Critical

### C1. App.tsx God Component (2,137 lines, 45 useState hooks) ✅ DONE

> **User Review:** Yes, do it

**Completed:** Extracted 6 custom hooks — `useNotification`, `useStepperScroll`, `useElectronMenuHandlers`, `useDesignCalculations`, `useSaveLoad`, `useWarshipState` — reducing App.tsx from ~1985 to ~1291 lines (~35% reduction). All calculation logic, save/load operations, state management, stepper scroll, notifications, and Electron menu handling now live in dedicated hooks under `src/hooks/`.

### C2. WarshipState Assembled/Destructured in 6 Places ✅ DONE

> **User Review:** Yes, do it

**Completed:** Created `buildCurrentState()` and `applyState(state)` helpers as `useCallback` hooks. Replaced all 6 duplication sites (dirty-check useEffect, handleDesignTypeConfirm, saveToFile, handleSaveWarshipAs, restoreSnapshot/undo-redo, loadFromFile) with calls to these two helpers.

### C3. Missing Memoization — Redundant Calculations per Render ✅ DONE

> **User Review:** Yes, do it

**Completed:** Converted `getPowerBreakdown`, `getHPBreakdown`, `getCostBreakdown` from inline closures to `useMemo` with proper dependency arrays. Eliminates ~100+ redundant service calls per render.

Every breakdown/total function was a plain closure called during render, recalculating from scratch on every call. Worst offenders in the app bar area:

| Function | Times called per render | Service calls per invocation |
|---|---|---|
| `getHPBreakdown()` | **10×** (once per popover row) | ~10 |
| `getCostBreakdown()` | **11×** (once per popover row) | ~10 |
| `getPowerBreakdown()` | **8×** (once per popover row) | ~8 |
| `getRemainingHullPoints()` | 3× | ~10 |
| `getTotalCost()` | 2× | ~10 |

Estimated: **~100+ redundant service function calls per render** from `getHPBreakdown()` alone. All should be `useMemo` with appropriate dependency arrays.

---

## High

### H1. SupportSystemsSelection.tsx — 3× Tab Duplication (1,446 lines)

> **User Review:** Yes, do it

Life Support, Accommodations, and Store Systems tabs each duplicate ~400 lines of nearly identical code: state variables, CRUD handlers, inline edit forms, and available-types tables. A generic `SubsystemTab<T>` component parameterized by system type would cut this file by ~60% (~800 lines reducible).

### H2. saveService.ts — `deserializeWarship` is ~500 Lines

> **User Review:** Yes, do it

The deserialization function follows the same loop-find-build-push pattern for every system type, repeated ~15 times. Four weapon category branches (beam, projectile, torpedo, special) are particularly identical. A generic `deserializeSystemArray<TSaved, TInstalled>()` helper would eliminate most repetition (~250 lines reducible).

### H3. dataLoader.ts — 30+ Identical Getter Functions

> **User Review:** Yes, do it

Every data getter checks `dataLoaded`, warns if not, and returns from cache. The cache reset in `reloadAllGameData()` manually nulls ~30 properties. The three parallel caches (`cache`, `pureBaseCache`, `rawBaseData`) with identical structures amplify the problem. A generic getter factory or Proxy-based cache would centralize this (~200 lines reducible).

### H4. Stale Closure Risks in Dependency Arrays ✅ DONE

> **User Review:** Yes, do it

**Completed:** Wrapped `showNotification` in `useCallback([])`, `handleCloseSnackbar` uses functional updater, added `mode, buildCurrentState` to dirty-check useEffect deps, added `showNotification` to 7 useCallback dependency arrays.

---

## Medium

### M1. WeaponSelection.tsx — 4× Identical Grid Render Functions (1,040 lines)

> **User Review:** Yes, do it

`renderBeamWeaponsGrid`, `renderProjectileWeaponsGrid`, `renderTorpedoWeaponsGrid`, and `renderSpecialWeaponsGrid` are 90%+ identical. Same for the 4 tab content functions. A single `renderWeaponGrid(weapons, extraColumns?)` would eliminate ~300 lines.

### M2. DamageDiagramSelection.tsx — Repetitive System Collection

> **User Review:** Yes, do it

`buildUnassignedSystemsList` contains 17 nearly identical `for` loops building `UnassignedSystem` objects from different installed arrays. A data-driven approach mapping system arrays to config objects (category, name formatter, id prefix) would be cleaner (~80 lines reducible).

`handleAutoAssign` and `handleAutoAssignCategory` share ~80% of their zone assignment strategy.

### M3. pdfExportService.ts — Largest File (1,568 lines)

> **User Review:** Yes, do it

The main `exportShipToPDF` does layout, data gathering, and rendering in one monolithic function. Splitting into sub-functions per PDF section would improve maintainability.

Contains a private `capitalize` helper that should be promoted to shared utilities.

### M4. ordnanceService.ts — 3 Near-Identical Create Functions

> **User Review:** Yes, do it

`createMissileDesign`, `createBombDesign`, `createMineDesign` share ~80% logic. A single factory with a category parameter would reduce repetition.

### M5. 12 Pass-Through Handler Functions in App.tsx ✅ DONE

> **User Review:** Yes, do it

**Completed:** Removed all 12 pass-through handlers. Step components now receive direct setters as props.

### M6. `calculateHullStats()` Lives in Type File ✅ DONE

> **User Review:** Yes, do it

**Completed:** Moved from `types/hull.ts` to `hullService.ts`.

### M7. `formatFTLRating()` Misplaced ✅ DONE

> **User Review:** Yes, do it

**Completed:** Moved from `ftlDriveService.ts` to `formatters.ts`.

---

## Low

### L1. Loose String Types

> **User Review:** Skip — these are strings intentionally for mod extensibility (mods can introduce new armor weights, mount types, etc. via JSON)

Several types use `string` where a union type would add compile-time safety:

| Type | File | Could be |
|---|---|---|
| `ArmorWeight` | armor.ts | `'light' \| 'medium' \| 'heavy'` etc. |
| `MountType` | weapon.ts | `'standard' \| 'fixed' \| 'turret' \| 'sponson' \| 'bank'` |
| `GunConfiguration` | weapon.ts | `'single' \| 'twin' \| 'triple' \| 'quadruple'` |

### L2. Empty Interfaces with eslint-disable ✅ DONE

> **User Review:** Yes, do it

**Completed:** Converted all 7 empty interfaces to type aliases in `weapon.ts`, `defense.ts`, `supportSystem.ts`. Removed all `eslint-disable` comments.

### L3. Constants Defined Inside App.tsx ✅ DONE

> **User Review:** Yes, do it

**Completed:** Extracted `AppMode`, `StepId`, `StepDef` to `types/common.ts`. Extracted `ALL_STEPS`, `STEP_FULL_NAMES`, `getStepsForDesign()` to `src/constants/steps.ts`. Moved `PL_NAMES` to `formatters.ts`.

### L4. Inline `capitalize` Pattern (20+ locations) ✅ DONE

> **User Review:** Yes, do it

**Completed:** Promoted `capitalize` from a private const in `pdfExportService.ts` to an exported function in `utilities.ts`. Updated import in pdfExportService.

`.charAt(0).toUpperCase() + .slice(1)` appears across components and services. The `capitalize` helper in pdfExportService should be promoted to `src/services/utilities.ts` and reused.

### L5. Duplicated SVG Path Generation

> **User Review:** Yes, do it

`createSectorPath` in ArcRadarSelector.tsx and `createArcPath` in FireDiagram.tsx are identical arc-drawing functions with different names. Should be a shared utility.

### L6. Console Logging in Production Code

> **User Review:** Yes, do it

~20 `console.log`/`console.warn`/`console.error` calls in `dataLoader.ts` and `modService.ts`. Should be gated behind a debug flag or use a minimal logger.

### L7. Naming Inconsistencies

> **User Review:** Yes, do it

- `editingid` (lowercase) vs `editingInstallationId` (camelCase) across components
- `generateEngineInstallationId` (long) vs `generateWeaponId` / `generateDefenseId` (short) — inconsistent ID generator naming

### L8. Hardcoded Fallback Defaults in Services

> **User Review:** Yes, do it

`weaponService.ts` and `sensorService.ts` contain inline fallback data objects that duplicate JSON values. If JSON fails to load, these silently mask the error rather than failing visibly.

---

## What's Already Good

- **Zero `any` types** across the entire codebase
- **Zero `TODO/HACK/FIXME`** markers
- **No circular imports**
- **Pure functional services** — no classes, no parameter mutation, good testability
- **Consistent service naming** — `calculateXxxStats` pattern throughout
- **Clean data flow** — JSON → dataLoader → services → components
- **Excellent shared components** — `EditableDataGrid`, `TechTrackCell`, `ArcRadarSelector`, `StepHeader`
- **Robust mod system** with dual-cache architecture
- **Save file versioning** with forward-compatible migration
- **Strong type coverage** — every component has a typed `*Props` interface

---

## Recommended Refactoring Order

1. **C3** \u2705 DONE
2. **C2** \u2705 DONE
3. **M5** \u2705 DONE
4. **H4** (stale closures) — Bug prevention
5. **C1** (extract hooks) — Medium risk, biggest maintainability payoff
6. **H1** (SupportSystems generic tab) — Large LOC reduction, contained to one file
7. **M1** (WeaponSelection generic grid) — Large LOC reduction, contained to one file
8. **H2** (saveService generic deserialize) — Moderate risk, simplifies future system additions
9. Everything else in priority order
