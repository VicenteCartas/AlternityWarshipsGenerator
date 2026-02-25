# Next Steps — Code Quality

Source of truth for code improvements, cleanup, and refactoring opportunities.

## Overall Assessment

The codebase is architecturally sound with clean data flow (JSON → dataLoader → services → components), zero `any` types, zero `TODO/HACK/FIXME` markers, no circular imports, and strict TypeScript throughout. The main issues are scale-related: as features were added, repetitive patterns accumulated instead of being abstracted. The single biggest concern is `App.tsx` as a god component.

---

## Critical

### C1. App.tsx God Component (2,137 lines, 45 useState hooks)

> **User Review:** Yes, do it

`App.tsx` is simultaneously a state manager, business-logic engine, and UI renderer. Every state change re-runs the entire component. The file contains ~1,083 lines of logic and ~887 lines of JSX.

**Proposed decomposition into custom hooks:**

| Hook | What it owns | Est. lines absorbed |
|---|---|---|
| `useWarshipState` | All 27 design state variables + `buildState()` / `applyState()` / `resetState()` helpers | ~200 |
| `useDesignCalculations` | All HP/Power/Cost breakdowns + validation, converted to `useMemo` | ~300 |
| `useSaveLoad` | `loadFromFile`, `saveToFile`, `handleSaveWarship`, `handleSaveWarshipAs`, file path tracking | ~260 |
| `useStepperScroll` | `stepperRef`, scroll arrows, auto-scroll effects | ~60 |
| `useElectronMenuHandlers` | Menu event registration/teardown | ~40 |
| `useNotification` | Snackbar state, `showNotification`, `handleCloseSnackbar` | ~20 |

This would reduce App.tsx to ~800 lines (render + hook wiring).

### C2. WarshipState Assembled/Destructured in 6 Places

> **User Review:** Yes, do it

The same 28-field state object is manually assembled or destructured in:

| Location | Purpose |
|---|---|
| Dirty-check `useEffect` | Pushes undo snapshot |
| `handleDesignTypeConfirm` | `pushImmediate` with empty defaults |
| `saveToFile` | Builds state for serialization |
| `handleSaveWarshipAs` | Builds **identical** state again for `getDefaultFileName` |
| `restoreSnapshot` | Applies 27 setters from state (undo/redo) |
| `loadFromFile` | Applies 27 setters from deserialized state |

Adding a new system type requires updating all 6 places. A single `buildCurrentState()` helper and `applyState(state)` helper would centralize this.

### C3. Missing Memoization — Redundant Calculations per Render

> **User Review:** Yes, do it

Every breakdown/total function is a plain closure called during render, recalculating from scratch on every call. Worst offenders in the app bar area:

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

### H4. Stale Closure Risks in Dependency Arrays

> **User Review:** Yes, do it

| Hook | Issue |
|---|---|
| Dirty-check `useEffect` | Uses `mode` in body but `mode` is **not** in dependency array |
| `loadFromFile` | Empty `[]` dep array but uses `showNotification` (recreated each render) and `undoHistory` |
| `handleDesignTypeConfirm` | Empty `[]` dep array but uses `undoHistory.clear()` and `undoHistory.pushImmediate()` |

These work accidentally due to React re-render behavior but are latent bugs.

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

### M5. 12 Pass-Through Handler Functions in App.tsx

> **User Review:** Yes, do it

These handlers add no logic — they just forward to a setter:

```
handlePowerPlantsChange = (pp) => setInstalledPowerPlants(pp)
handleEnginesChange = (e) => setInstalledEngines(e)
... (12 total)
```

Inconsistently, some setters ARE passed directly as props (e.g., `onFuelTanksChange={setInstalledFuelTanks}`). Either all should be direct or all should have wrappers.

### M6. `calculateHullStats()` Lives in Type File

> **User Review:** Yes, do it

`src/types/hull.ts` contains a calculation function. Per project conventions, calculations belong in services. Should move to `hullService.ts`.

### M7. `formatFTLRating()` Misplaced

> **User Review:** Yes, do it

Lives in `ftlDriveService.ts` but is a display formatter. Should be in `formatters.ts` per project conventions.

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

### L2. Empty Interfaces with eslint-disable

> **User Review:** Yes, do it

7 empty interfaces (weapon.ts, defense.ts, supportSystem.ts) extend base types with no additions. They exist for semantic naming but could be `type` aliases instead, avoiding the need for `eslint-disable` comments.

### L3. Constants Defined Inside App.tsx

> **User Review:** Yes, do it

These should be extracted to dedicated files:

| Item | Should move to |
|---|---|
| `StepId` type, `StepDef` interface | `src/types/common.ts` |
| `ALL_STEPS`, `STEP_FULL_NAMES`, `getStepsForDesign()` | `src/constants/steps.ts` |
| `PL_NAMES` | `src/services/formatters.ts` |
| `AppMode` type | `src/types/common.ts` |
| `DEFAULT_POWER_SCENARIO` | `src/constants/` |

### L4. Inline `capitalize` Pattern (20+ locations)

> **User Review:** Yes, do it

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

1. **C3** (memoization) — Lowest risk, immediate performance benefit, no API changes
2. **C2** (buildState/applyState helpers) — Low risk, removes 4 duplication sites
3. **M5** (pass-through handlers) — Trivial cleanup
4. **H4** (stale closures) — Bug prevention
5. **C1** (extract hooks) — Medium risk, biggest maintainability payoff
6. **H1** (SupportSystems generic tab) — Large LOC reduction, contained to one file
7. **M1** (WeaponSelection generic grid) — Large LOC reduction, contained to one file
8. **H2** (saveService generic deserialize) — Moderate risk, simplifies future system additions
9. Everything else in priority order
