# Architecture Review — v0.2.5 Release Readiness

**Reviewer scope:** Full codebase audit across ~30k lines of TypeScript/React (46 source modules, 26 test files, Electron main/preload).

Priority scale:
- **P1 — Critical:** Blocks release or risks data loss / security issues
- **P2 — High:** Significant code quality / maintainability issues to address soon
- **P3 — Medium:** Technical debt that increases cost of future changes
- **P4 — Low:** Minor improvements, style nits, nice-to-haves

---

## P1 — Critical

### ~~1.1 Design totals have three competing sources of truth, and they already disagree~~ ✅ RESOLVED

**Fixed in:** `designSnapshotService.ts` — introduced `computeDesignSnapshot()`, the single authoritative computation for all derived design values. All three consumers (`useDesignCalculations`, `SummarySelection`, `pdfExportService`) now delegate to this function. Tech tracks are passed correctly everywhere, and cost formulas (including ordnance + magazine warhead costs) are consistent across all views.

**Remaining related work (deferred to future items):**
- **Prop reduction (see 2.4):** SummarySelection still receives individual arrays as props rather than a single state object
- **WarshipState restructuring (see 3.1):** `designTechTracks` and `designProgressLevel` could move into `WarshipState` to simplify the snapshot input
- **Test coverage for snapshot service:** The new `designSnapshotService.ts` has no dedicated unit tests yet (covered indirectly via existing integration tests)

---

## P2 — High

### ~~2.1 Auto-save recovery can delete the only recovery artifact before recovery succeeds~~ ✅ RESOLVED

**Fixed in:** `WelcomePage.tsx` + `App.tsx` — Recovery is now fully async-safe. The WelcomePage Recover handler awaits `onRecoverAutoSave` (which returns `Promise<boolean>`). `clearAutoSave()` is only called by `App.tsx` after successful recovery. A `recovering` state disables both Recover and Dismiss buttons while recovery is in-flight. On failure, the recovery UI remains visible so the user can retry or dismiss.

### ~~2.2 Save serialization depends on global mod cache state, not the design being saved~~ ✅ RESOLVED

**Fixed in:** `saveService.ts`, `useWarshipState.ts`, `App.tsx` — `activeMods` is now a field on `WarshipState`. `serializeWarship()` reads `state.activeMods` (the per-design mods) instead of calling the global `getActiveMods()` from the data-loader singleton. `useWarshipState` receives `designActiveMods` from App.tsx and includes it in `buildCurrentState()`. The `getActiveMods` import was removed from saveService.ts entirely.

### ~~2.3 App.tsx is a 1,409-line god component with zero test coverage~~ ✅ RESOLVED

**Fixed in:** `stepCompletionService.ts`, `resourceBarConfigs.ts`, `StepContentRenderer.tsx`, `App.tsx`

Extracted the four key sub-issues identified in the review:
- **Step completion logic** → `stepCompletionService.ts` — pure `calculateStepCompletion()` + `hasAnyInstalledComponents()` functions, with 36 unit tests covering all 13 steps and edge cases (damage zone assignment, C4 required vs optional, summary validation states).
- **ResourceBarChip segment duplication** → `resourceBarConfigs.ts` — `buildHpSegments()`, `buildCostSegments()`, `buildPowerSegments()` + shared `POWER_CATEGORIES` constant. Eliminates ~120 lines of duplicate segment/breakdownRows arrays.
- **renderStepContent switch-case** → `StepContentRenderer` component — the 13-case switch (previously ~220 lines inline) now lives in its own file.
- **Non-memoized inline functions** → wrapped `hasAnyInstalledComponents` in `useMemo`, `clearAllComponents`/`handleHullSelect`/`handleArmorSelect`/`handleArmorClear`/`handleArmorRemoveLayer`/`handleStepClick`/`handleNext`/`handleBack` in `useCallback`.

App.tsx reduced from 1,409 lines to ~1,180 lines. Remaining structural issues (27 `useState` calls → reducer, prop drilling) tracked in ~~2.4~~, 3.10.

### ~~2.4 SummarySelection receives 32 props — extreme prop drilling~~ ✅ RESOLVED

**Fixed in:** `useWarshipState.ts`, `StepContentRenderer.tsx`, `SummarySelection.tsx`, `DamageDiagramSelection.tsx`, `App.tsx`

Replaced individual installed-system-array props with a single `state: WarshipState` object:
- **SummarySelection**: 29 props → 4 (`state` + `onShipDescriptionChange` + `currentFilePath` + `onShowNotification`)
- **DamageDiagramSelection**: 20 props → 3 (`state` + `zones` + `onZonesChange`)
- **StepContentRenderer**: ~81 props → ~63 (data arrays replaced by single `state` prop; callbacks + derived values remain individual)
- **App.tsx StepContentRenderer call site**: ~60 prop assignments → ~35

`useWarshipState` now exposes a memoized `currentState: WarshipState` object alongside `buildCurrentState()`. App.tsx uses `currentState` for step completion and installed-component checks, eliminating two `eslint-disable` comments for exhaustive-deps. Components destructure `WarshipState` fields into local aliases (e.g., `powerPlants: installedPowerPlants`) so all internal code stays unchanged.

### ~~2.5 `cockpitLifeSupportCoverageHp` calculation repeated 9 times across 7 files~~ ✅ RESOLVED

**Fixed in:** `commandControlService.ts`, `designSnapshotService.ts`, `StepContentRenderer.tsx`, `CraftPickerDialog.tsx`

Extracted `calculateCommandControlLifeSupportCoverageHp()` into `commandControlService.ts` — a single helper that sums `lifeSupportCoverageHp` across all installed command & control systems. Named without "cockpit" since the field is data-driven and mods can add it to any command system. Replaced 3 inline `reduce` expressions with calls to the new function. Consumer sites (`SupportSystemsSelection`, `supportSystemService`) already received the computed number as a parameter and needed no changes. Unit tests added covering empty arrays, missing fields, and multi-system summation.

**Note:** The original review listed 9 occurrences across 7 files, but prior refactoring (issues 1.1, 2.4) had already consolidated several of those sites. The remaining 3 inline reduce expressions were the ones eliminated here.

### 2.6 ~~No test coverage for pdfExportService.ts (1,665 lines)~~ ✅ RESOLVED

**File:** [src/services/pdfExportService.ts](src/services/pdfExportService.ts)

~~The largest service file in the codebase has zero test coverage. It contains `computeShipStats` (duplicated and divergent business logic per 1.3), complex damage track rendering, page layout calculations, and format-sensitive string generation.~~

**Resolution:** Added 44 tests in `pdfExportService.test.ts` across four layers: (1) pure logic unit tests for `formatArcsShort`, `enrichSystemDisplayName`, and `computeShipStats`; (2) option toggling tests verifying `includeCombat`/`includeDamageDiagram`/`includeDetailedSystems` flags; (3) mock-based rendering verification for all PDF sections (lore, systems detail, combat, damage diagram, footer, page management); (4) snapshot regression tests capturing the full sequence of `pdf.text()` calls. Exported `formatArcsShort`, `enrichSystemDisplayName`, `computeShipStats`, and `ShipStats` for testability. Note: `computeShipStats` duplication (per 1.3) was already resolved by delegating to `computeDesignSnapshot`.

### ~~2.7 Direct `console.error` calls in production code (DamageDiagramSelection)~~ ✅ RESOLVED

**File:** [src/components/DamageDiagramSelection.tsx](src/components/DamageDiagramSelection.tsx)

~~Three `console.error` calls in drag-and-drop handlers bypass the `logger` utility (which gates on `import.meta.env.DEV`). These will emit in production builds. All other modules correctly use `logger.error`.~~

**Fixed in:** `DamageDiagramSelection.tsx` — Replaced all three `console.error` calls in drag-and-drop handlers (`handleDragStartUnassigned`, `handleDragStartZoneSystem`, `handleDrop`) with `logger.error` from `utilities.ts`. Added the missing `logger` import. Production builds no longer emit console output from these error paths.

### ~~2.8 No integration tests for App.tsx~~ ✅ RESOLVED

**Fixed in:** `App.test.tsx`, `electronMock.ts`

Added 23 integration tests that render the full App component with a mocked Electron IPC layer (via `src/test/electronMock.ts`) and real bundled game data. Tests cover:
- **Loading & Welcome:** data loading → welcome transition, version display
- **New Warship Flow:** DesignTypeDialog open, create warship → builder mode with correct defaults
- **Step Navigation:** Next/Back buttons, stepper click, hull-required guard, first/last step button visibility
- **Hull Selection & Change Confirmation:** hull select, confirmation dialog on change with components, cancel preserves state, confirm clears components
- **Undo/Redo:** initial disabled states, enables after change
- **Save Flow:** save dialog requires hull, save without hull shows warning, full save/load round-trip with file content capture
- **Return to Welcome:** Electron menu event triggers mode transition
- **Station Design:** ground base creation with correct default name, engines step excluded from stepper

**Not covered (jsdom limitation):** Clicking undo/redo buttons through MUI Tooltip's `<span>` wrapper doesn't propagate `onClick` in jsdom. Undo logic itself is tested via `useUndoHistory.test.ts` unit tests.

---

## P3 — Medium

### ~~3.1 The state model (`WarshipState`) lives in the persistence layer~~ ✅ RESOLVED

**Fixed in:** `src/types/warshipState.ts`, `src/services/saveService.ts`, and 8 consumer files.

Moved the `WarshipState` interface from `saveService.ts` into a dedicated `src/types/warshipState.ts` module. All consumers (App.tsx, useWarshipState, useAutoSave, DamageDiagramSelection, StepContentRenderer, SummarySelection, stepCompletionService) now import from the types layer. `saveService.ts` re-exports the type for backward compatibility and retains only serialization/deserialization logic. Also cleaned up unused type imports left behind in `saveService.ts` and fixed pre-existing missing type imports in `DamageDiagramSelection.tsx` and `pdfExportService.test.ts`.

### ~~3.2 Installed tech tracks summary is incomplete~~ ✅ RESOLVED

**File:** [src/hooks/useDesignCalculations.ts](src/hooks/useDesignCalculations.ts#L291-L301)

~~`uniqueTechTracks` (displayed in the app bar) aggregates tech tracks from armor, power plants, engines, FTL, life support, accommodations, stores, defenses, command/control, sensors, and hangar/misc — but **omits** `installedGravitySystems`, `installedWeapons`, and `installedLaunchSystems`. All three types have `techTracks` fields.~~

~~The UI presents the chip as if it reflects the whole design, but it is only a partial aggregate.~~

**Fixed in:** `useDesignCalculations.ts` — Added the three missing subsystem categories to the `uniqueTechTracks` aggregation: `installedGravitySystems` (via `.type.techTracks`), `installedWeapons` (via `.weaponType.techTracks`), and `installedLaunchSystems` (looked up from `getLaunchSystems()` definitions by `launchSystemType` id, since the installed item only stores a string type identifier). The app bar tech tracks chip now reflects every installed subsystem.

### ~~3.3 Module-level mutable singletons in dataLoader.ts~~ ✅ RESOLVED

**Fixed in:** `dataLoader.ts` — All mutable state (`cache`, `pureBaseCache`, `rawBaseData`, `dataLoaded`, `loadPromise`, `activeMods`) is now encapsulated inside a `createDataStore()` factory function that returns a `DataStore` instance. A `DataStore` interface defines the public API. A default instance is created at module level and all named exports (`getHullsData`, `loadAllGameData`, etc.) delegate to it, so no consumer changes were needed. Tests can create independent instances via `createDataStore()` for isolation. Also extracted a shared `populateCache()` helper to eliminate duplicated cache-assignment code between initial load and mod-merge paths.

### ~~3.4 Module-level ID counters in services~~ ✅ RESOLVED

**Fixed in:** `embarkedCraftService.ts`, `damageDiagramService.ts` — Replaced module-level mutable counters (`let nextId = 1`, `let zoneRefCounter = 0`) with `crypto.randomUUID()`. IDs are now globally unique without shared mutable state, eliminating non-deterministic test behavior and cross-design counter leakage. Prefixes (`craft-`, `zsr-`) retained for debuggability.

### ~~3.5 Undo history stores full state snapshots without structural sharing~~ ✅ RESOLVED (by design)

**File:** [src/hooks/useUndoHistory.ts](src/hooks/useUndoHistory.ts)

**Closed as acceptable by design.** Structural sharing already occurs naturally via JavaScript reference semantics: `buildCurrentState()` assembles a new object literal but each property is a direct React state reference. Unchanged arrays/objects share the same reference across consecutive snapshots. Only the property that was actually modified gets a new allocation. The per-snapshot overhead is ~500 bytes of object wrapper; with 50 snapshots, total waste is ~25 KB. `shipDescription.imageData` (base64) could theoretically be large, but it is only duplicated when the user actually changes the image — which is correct undo behavior.

### ~~3.6 `any` type usage in DamageDiagramSelection's SystemCollectorConfig~~ ✅ RESOLVED

**Fixed in:** `DamageDiagramSelection.tsx` — Made `SystemCollectorConfig` generic over `T`, added a type-erased `SystemCollectorEntry` alias, and introduced a `collector<T extends InstalledItemBase>()` factory function. Each entry in the `collectors` array now uses the factory, which infers `T` from the items array and verifies callbacks at compile time. Explicit callback parameter annotations removed (inferred). All `eslint-disable @typescript-eslint/no-explicit-any` pragmas removed.

### ~~3.7 Non-memoized inline handlers in App.tsx~~ ✅ RESOLVED

**Fixed in:** `App.tsx` — All handlers wrapped in `useCallback`; `hasAnyInstalledComponents` wrapped in `useMemo`; `renderStepContent` extracted to `StepContentRenderer` component. See 2.3 resolution.

### ~~3.8 `scanWarshipFilesSync` uses synchronous fs operations on the main process~~ ✅ RESOLVED

**Fixed in:** `electron/main.ts` — Renamed to `scanWarshipFiles` and converted all synchronous `fs` calls (`readdirSync`, `statSync`, `readFileSync`, `existsSync`) to their async `fs/promises` counterparts (`readdir`, `stat`, `readFile`, `access`). The function now returns a `Promise` and the IPC handler `await`s it, keeping the main-process event loop unblocked during library scans. No renderer-side changes needed since the IPC contract was already async.

### ~~3.9 `react-hooks/set-state-in-effect` suppressions across multiple components~~ ✅ RESOLVED

**Files:** [src/components/DesignTypeDialog.tsx](src/components/DesignTypeDialog.tsx), [src/components/ModManager.tsx](src/components/ModManager.tsx), [src/components/OrdnanceDesignDialog.tsx](src/components/OrdnanceDesignDialog.tsx), [src/components/shared/EditableDataGrid.tsx](src/components/shared/EditableDataGrid.tsx)

**Fixed in:** `useAsyncData.ts`, `DesignTypeDialog.tsx`, `ModManager.tsx`, `OrdnanceDesignDialog.tsx`, `OrdnanceSelection.tsx`, `EditableDataGrid.tsx`, `ModEditor.tsx` — All 7 lint suppressions across 4 components eliminated using three strategies:
- **Async data loading** (DesignTypeDialog, ModManager): Created a reusable `useAsyncData` hook (`src/hooks/useAsyncData.ts`) that encapsulates the loading/fetch/data pattern with cancellation and imperative `refresh()`. Both components now use the hook instead of manual `useEffect`+`setState`.
- **Key-prop remounting** (OrdnanceDesignDialog): Replaced the 27-line `useEffect` state-sync block with `useState` initializers that derive values from props. The parent (`OrdnanceSelection`) increments a `dialogKey` counter on each open, causing React to remount the dialog with fresh initial state.
- **Key-prop remounting** (EditableDataGrid): Removed both column-change reset `useEffect` blocks (undo stacks + editing cell/popover state). The parent (`ModEditor`) now passes `key={activeSection.id}` so the grid remounts cleanly on section switch.

### ~~3.10 Migrate `useWarshipState` to a single reducer-backed object~~ ✅ RESOLVED

**Fixed in:** `useWarshipState.ts` — Replaced 31 individual `useState` calls with a single `useReducer` backed by a `DesignState` object (= `WarshipState` minus `activeMods`). A typed `SET_FIELD` action union + `APPLY_STATE` action replace all individual setters. `buildCurrentState()` is now `{ ...state, activeMods }`, `applyState()` is a single dispatch, and the dirty-tracking `useEffect` depends on `[state]` instead of a 27-item array. Setter functions are created via a `createSetter()` factory and are referentially stable (dispatch never changes). The hook's return interface is unchanged — zero modifications to App.tsx, StepContentRenderer, or any step component.

---

## P4 — Low

### 4.1 `createdAt` is rewritten on every save

**File:** [src/services/saveService.ts](src/services/saveService.ts#L83-L93)

`serializeWarship()` sets both `createdAt` and `modifiedAt` to `new Date().toISOString()` on every save. The library preserves both fields, but `createdAt` is not trustworthy metadata since it changes on every save.

**Recommendation:** Preserve the original `createdAt` from the loaded save file; only update `modifiedAt`.

### 4.2 Image upload validation is duplicated with blocking `alert()` calls

**Files:** [src/components/SummarySelection.tsx](src/components/SummarySelection.tsx#L146-L170), [src/components/summary/DescriptionTab.tsx](src/components/summary/DescriptionTab.tsx#L35-L59)

The image-upload handler is duplicated line-for-line, both using `alert()` for validation failures instead of the snackbar/notification system used everywhere else.

**Recommendation:** Extract a shared image-upload helper and route errors through the notification path.

### 4.3 `@types/html2canvas` is deprecated

**File:** [package.json](package.json)

The `@types/html2canvas` package (v0.5.35) provides types for an old API. Current `html2canvas` (v1.4.1) ships its own types. This dev dependency is unnecessary.

### 4.4 Logger no-ops remain in production bundles

**File:** [src/services/utilities.ts](src/services/utilities.ts#L17-L19)

The `logger` checks `import.meta.env.DEV` at runtime, so the calls remain in production (arguments are still evaluated). Negligible overhead but could be eliminated with build-time constant replacement.

### 4.5 Step completion logic switch should be a registry

**File:** [src/App.tsx](src/App.tsx#L220-L262)

The step completion `useMemo` uses a 13-case `switch`. A `Map<StepId, (state) => boolean>` registry in `steps.ts` would be more extensible and testable.

### 4.6 Theme mode persistence uses localStorage instead of Electron store

**File:** [src/main.tsx](src/main.tsx#L13-L16)

Theme preference is stored in `localStorage`. Clearing browser data resets it. Low priority since it's cosmetic.

### 4.7 Unused variable suppression in EngineSelection and SensorSelection

**Files:** [src/components/EngineSelection.tsx](src/components/EngineSelection.tsx#L76), [src/components/SensorSelection.tsx](src/components/SensorSelection.tsx#L168)

Two components suppress `@typescript-eslint/no-unused-vars`. Should remove the unused variables rather than suppress.

### 4.8 `createMenu()` rebuilds the entire menu on every mode change

**File:** [electron/main.ts](electron/main.ts#L474-L478)

The `set-builder-mode` IPC handler calls `createMenu()` on every mode transition, which also re-reads recent files from disk each time.

### 4.9 Electron IPC file handlers accept arbitrary paths (defense-in-depth)

**File:** [electron/main.ts](electron/main.ts#L395-L422)

The `read-file`, `save-file`, `save-pdf-file`, `open-path`, and `read-data-file` IPC handlers accept renderer-supplied paths without validation. In practice this is **not exploitable** in the current app: production loads only local bundled HTML, save files are data-only JSON (no field is ever used as a file path), and all file paths reaching these handlers originate from OS dialogs or app-written state. There is no mechanism for external input to reach these handlers.

Still worth adding path validation as defense-in-depth (trivial: allowlist data file names for `read-data-file`, restrict `read-file`/`save-file` to user-selected dialog paths).

---

## Summary

| Priority | Count | Key Themes |
|----------|-------|------------|
| P1 Critical | 1 | Three divergent computation sources producing different totals |
| P2 High | 8 | Auto-save data loss risk, mod cache coupling, god component, prop drilling, missing tests |
| P3 Medium | 10 | Inverted state model, incomplete tech tracks, module singletons, sync I/O, reducer migration |
| P4 Low | 9 | Metadata bugs, duplicated uploads, deprecated types, IPC defense-in-depth, minor patterns |

### Strengths of the codebase

- Clean separation of game rules into dedicated services with comprehensive test coverage (84% of services tested)
- Well-designed undo/redo system with debouncing and snapshot management
- Proper Electron context isolation with preload bridge
- Modern stack with latest React 19, MUI v7, TypeScript strict mode
- Consistent formatting conventions centralized in `formatters.ts`
- Auto-save with crash recovery
- Save file versioning with migration support
- Dual-cache mod system with priority ordering
