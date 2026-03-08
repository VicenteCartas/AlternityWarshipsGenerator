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

### 2.1 Auto-save recovery can delete the only recovery artifact before recovery succeeds

**Files:** [src/components/WelcomePage.tsx](src/components/WelcomePage.tsx#L90-L99), [src/App.tsx](src/App.tsx#L380-L427)

The WelcomePage "Recover" button calls `onRecoverAutoSave?.(autoSaveContent)` and immediately calls `clearAutoSave()` in the same click handler. The recovery handler in `App.tsx` is async — if it fails because the file is corrupt, mod matching fails, or deserialization throws, the auto-save has already been deleted by the WelcomePage.

**Risk:** Turns a recoverable failure into permanent data loss on the most trust-sensitive path in the app.
**Recommendation:** Only clear the auto-save after the async recovery promise resolves successfully. While recovery is in-flight, disable both Recover and Dismiss.

### 2.2 Save serialization depends on global mod cache state, not the design being saved

**Files:** [src/services/saveService.ts](src/services/saveService.ts#L273), [src/services/dataLoader.ts](src/services/dataLoader.ts#L639-L667)

The app correctly tracks per-design mods in `designActiveMods` (App.tsx state), but `serializeWarship()` ignores that and reads `getActiveMods()` from the global data-loader singleton instead. This creates hidden coupling between runtime cache state and persistence.

If the global cache is changed by mod editing, data reloads, or any future multi-window support, a saved file can advertise the wrong active mods. Auto-save inherits the same flaw.

**Recommendation:** Make active mods an explicit input to serialization — either in `WarshipState` or a separate serialization context parameter.

### 2.3 App.tsx is a 1,409-line god component with zero test coverage

**File:** [src/App.tsx](src/App.tsx)

App.tsx orchestrates all 27+ design state variables, step completion logic, hull change confirmation, armor selection, stepper rendering, 3 ResourceBarChip configs (each ~40 lines of duplicate segment arrays), keyboard shortcuts, Electron menu sync, mod management, auto-save recovery, and the full builder/welcome/library/mod routing. Despite being the single highest-risk file, it has no unit or integration tests.

The root cause is that `useWarshipState` maintains 27+ separate `useState` calls, reassembles them in `buildCurrentState()`, and tears them apart in `applyState()`. Every new field must be declared, assembled, restored, and threaded through undo/save/load paths — making drift inevitable.

Key sub-issues:
- `stepCompletion` useMemo (lines 220-262) contains business logic that should live in a service
- `renderStepContent()` is a 130-line switch-case that could be a map
- ResourceBarChip segment arrays for HP/Power/Cost are duplicated between `segments` and `breakdownRows` props (3 chips x 2 copies = ~120 lines of pure duplication)
- `handleArmorSelect`, `clearAllComponents`, `hasAnyInstalledComponents` are inline non-memoized functions

**Recommendation:** At minimum, move step completion logic into a service (testable), extract ResourceBarChip configs, and add integration tests. Longer term, migrate to a single reducer-backed object for design state.

### 2.4 SummarySelection receives 32 props — extreme prop drilling

**File:** [src/components/SummarySelection.tsx](src/components/SummarySelection.tsx)

SummarySelection requires every installed system array individually (32 props). DamageDiagramSelection has 20. Adding any new system type requires updating the prop interface, the call site in App.tsx, and every intermediate component.

**Recommendation:** Pass a single `WarshipState` or `DesignSnapshot` object where components need the full design. This interface already exists in saveService.ts.

### 2.5 `cockpitLifeSupportCoverageHp` calculation repeated 9 times across 7 files

**Files:** [src/App.tsx](src/App.tsx#L681), [src/hooks/useDesignCalculations.ts](src/hooks/useDesignCalculations.ts#L139), [src/components/SummarySelection.tsx](src/components/SummarySelection.tsx#L204), [src/components/CraftPickerDialog.tsx](src/components/CraftPickerDialog.tsx#L107), [src/services/pdfExportService.ts](src/services/pdfExportService.ts#L247)

The expression `installedCommandControl.reduce((sum, cc) => sum + (cc.type.lifeSupportCoverageHp || 0), 0)` is copy-pasted 9 times. A single field name change requires finding and updating all 9 sites.

**Recommendation:** Create `calculateCockpitLifeSupportCoverage(installedCommandControl)` in commandControlService.ts.

### 2.6 No test coverage for pdfExportService.ts (1,665 lines)

**File:** [src/services/pdfExportService.ts](src/services/pdfExportService.ts)

The largest service file in the codebase has zero test coverage. It contains `computeShipStats` (duplicated and divergent business logic per 1.3), complex damage track rendering, page layout calculations, and format-sensitive string generation.

### 2.7 Direct `console.error` calls in production code (DamageDiagramSelection)

**File:** [src/components/DamageDiagramSelection.tsx](src/components/DamageDiagramSelection.tsx#L768-L857)

Three `console.error` calls in drag-and-drop handlers bypass the `logger` utility (which gates on `import.meta.env.DEV`). These will emit in production builds. All other modules correctly use `logger.error`.

---

## P3 — Medium

### 3.1 The state model (`WarshipState`) lives in the persistence layer

**Files:** [src/services/saveService.ts](src/services/saveService.ts#L37-L68), [src/hooks/useWarshipState.ts](src/hooks/useWarshipState.ts#L18), [src/App.tsx](src/App.tsx#L72)

`WarshipState` is the core runtime model for the builder, but it is declared inside `saveService.ts`. Hooks and App.tsx import the model from the serializer, which inverts the dependency direction: application state depends on persistence instead of persistence depending on application state.

**Recommendation:** Move `WarshipState` into `src/types/` or a dedicated domain-state module. Treat `saveService` as a serializer over that type.

### 3.2 Installed tech tracks summary is incomplete

**File:** [src/hooks/useDesignCalculations.ts](src/hooks/useDesignCalculations.ts#L291-L301)

`uniqueTechTracks` (displayed in the app bar) aggregates tech tracks from armor, power plants, engines, FTL, life support, accommodations, stores, defenses, command/control, sensors, and hangar/misc — but **omits** `installedGravitySystems`, `installedWeapons`, and `installedLaunchSystems`. All three types have `techTracks` fields.

The UI presents the chip as if it reflects the whole design, but it is only a partial aggregate.

**Recommendation:** Compute installed tech tracks from the canonical design snapshot and include every subsystem category.

### 3.3 Module-level mutable singletons in dataLoader.ts

**File:** [src/services/dataLoader.ts](src/services/dataLoader.ts#L135-L165)

Three module-level mutable objects (`cache`, `pureBaseCache`, `rawBaseData`) plus three `let` variables (`dataLoaded`, `loadPromise`, `activeMods`) form a global singleton cache. This makes the module untestable in isolation, creates implicit coupling, and would break for multiple concurrent designs.

### 3.4 Module-level ID counters in services

**Files:** [src/services/embarkedCraftService.ts](src/services/embarkedCraftService.ts#L11), [src/services/damageDiagramService.ts](src/services/damageDiagramService.ts#L126)

Module-level `let nextId = 1` and `let zoneRefCounter = 0` counters generate non-deterministic IDs across test runs, as acknowledged in TEST_PLAN.md. They never reset.

### 3.5 Undo history stores full state snapshots without structural sharing

**File:** [src/hooks/useUndoHistory.ts](src/hooks/useUndoHistory.ts)

Each undo snapshot stores a complete `WarshipState` (all 27+ arrays). With max history of 50, most snapshots hold distinct array instances because references change on every modification. Acceptable for the current single-design desktop use case, but would become a concern for very large designs.

### 3.6 `any` type usage in DamageDiagramSelection's SystemCollectorConfig

**File:** [src/components/DamageDiagramSelection.tsx](src/components/DamageDiagramSelection.tsx#L136-L145)

The `SystemCollectorConfig` interface uses `any` for all 5 function parameters with an eslint-disable pragma. A union type or generic constraint would preserve type safety.

### 3.7 Non-memoized inline handlers in App.tsx

**File:** [src/App.tsx](src/App.tsx#L523-L585)

`handleArmorSelect`, `handleArmorClear`, `handleArmorRemoveLayer`, `handleStepClick`, `handleNext`, `handleBack`, `renderStepContent`, `clearAllComponents` are plain arrows without `useCallback`. They are recreated on every render, triggering unnecessary child re-renders.

### 3.8 `scanWarshipFilesSync` uses synchronous fs operations on the main process

**File:** [electron/main.ts](electron/main.ts#L500-L560)

The library scanner reads directories and files synchronously on the Electron main process. For a large library, this blocks the event loop and freezes the UI during scan.

### 3.9 `react-hooks/set-state-in-effect` suppressions across multiple components

**Files:** [src/components/DesignTypeDialog.tsx](src/components/DesignTypeDialog.tsx#L58), [src/components/ModManager.tsx](src/components/ModManager.tsx#L84), [src/components/OrdnanceDesignDialog.tsx](src/components/OrdnanceDesignDialog.tsx#L93), [src/components/shared/EditableDataGrid.tsx](src/components/shared/EditableDataGrid.tsx#L139)

Four components suppress this lint rule for data loading patterns. Could be standardized with a shared `useAsyncLoad` hook.

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
| P2 High | 7 | Auto-save data loss risk, mod cache coupling, god component, prop drilling, missing tests |
| P3 Medium | 9 | Inverted state model, incomplete tech tracks, module singletons, sync I/O |
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
